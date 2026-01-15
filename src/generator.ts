import { encode, PaymentOptions, CurrencyCode, type DataModel } from 'bysquare';
import QRCode from 'qrcode';
import { writeFile } from 'fs/promises';
import type { PayBySquareInput, GenerationOptions } from './types.js';
import { validateInput } from './validator.js';
import { EncodingError, GenerationError } from './errors.js';

/**
 * Generates a PayBySquare QR code PNG from payment data
 *
 * @param input - Payment data conforming to PayBySquareInput interface
 * @param options - Optional generation options
 * @returns Promise<Buffer> - PNG image as a Buffer
 * @throws {ValidationError} - If input data is invalid
 * @throws {EncodingError} - If QR encoding fails
 * @throws {GenerationError} - If PNG generation fails
 *
 * @example
 * ```typescript
 * const buffer = await generatePayBySquare({
 *   iban: 'SK9611000000002918599669',
 *   beneficiaryName: 'John Doe',
 *   amount: 100.50,
 *   currency: 'EUR'
 * });
 * ```
 */
export async function generatePayBySquare(
  input: PayBySquareInput,
  options: GenerationOptions = {}
): Promise<Buffer> {
  // Step 1: Validate input
  validateInput(input);

  // Step 2: Transform to bysquare DataModel
  const dataModel = transformToDataModel(input);

  // Step 3: Encode to QR string using bysquare
  let qrString: string;
  try {
    qrString = encode(dataModel, {
      deburr: options.removeAccents ?? true
    });
  } catch (error) {
    throw new EncodingError(
      'Failed to encode payment data',
      { cause: error }
    );
  }

  // Step 4: Generate PNG buffer using qrcode
  try {
    const buffer = await QRCode.toBuffer(qrString, {
      width: options.width ?? 300,
      margin: options.margin ?? 4,
      errorCorrectionLevel: options.errorCorrectionLevel ?? 'M',
      color: options.color,
      type: 'png'
    });
    return buffer;
  } catch (error) {
    throw new GenerationError(
      'Failed to generate QR code PNG',
      { cause: error }
    );
  }
}

/**
 * Generates PayBySquare QR code and saves to file
 *
 * @param input - Payment data conforming to PayBySquareInput interface
 * @param filePath - Absolute or relative path to save PNG file
 * @param options - Optional generation options
 * @returns Promise<void>
 *
 * @example
 * ```typescript
 * await generatePayBySquareToFile(
 *   { iban: 'SK...', beneficiaryName: 'Test' },
 *   './payment.png'
 * );
 * ```
 */
export async function generatePayBySquareToFile(
  input: PayBySquareInput,
  filePath: string,
  options?: GenerationOptions
): Promise<void> {
  const buffer = await generatePayBySquare(input, options);
  await writeFile(filePath, buffer);
}

/**
 * Transforms simplified PayBySquareInput to bysquare DataModel
 * @param input - Simplified input format
 * @returns DataModel for bysquare library
 */
function transformToDataModel(input: PayBySquareInput): DataModel {
  // Build bank accounts array
  const bankAccounts = [{
    iban: input.iban.replace(/\s/g, ''), // Remove spaces from IBAN
    ...(input.swift && { bic: input.swift })
  }];

  // Build beneficiary object if name or address provided
  const beneficiary = (input.beneficiaryName || input.beneficiaryAddress) ? {
    ...(input.beneficiaryName && { name: input.beneficiaryName }),
    ...(input.beneficiaryAddress?.street && { street: input.beneficiaryAddress.street }),
    ...(input.beneficiaryAddress?.city && { city: input.beneficiaryAddress.city })
  } : undefined;

  // Construct payment object
  const payment = {
    type: PaymentOptions.PaymentOrder,
    // Only include currencyCode if amount is provided (default to EUR if amount is set but currency is not)
    ...(input.amount !== undefined && {
      currencyCode: parseCurrencyCode(input.currency ?? 'EUR')
    }),
    bankAccounts,
    ...(input.amount !== undefined && { amount: input.amount }),
    ...(input.variableSymbol && { variableSymbol: input.variableSymbol }),
    ...(input.constantSymbol && { constantSymbol: input.constantSymbol }),
    ...(input.specificSymbol && { specificSymbol: input.specificSymbol }),
    ...(input.paymentNote && { paymentNote: input.paymentNote }),
    ...(beneficiary && { beneficiary }),
    ...(input.dueDate && { paymentDueDate: input.dueDate }),
    ...(input.originatorReference && {
      originatorsReferenceInformation: input.originatorReference
    })
  };

  // Return DataModel
  return {
    payments: [payment as any] // Type assertion needed due to bysquare's union type complexity
  };
}

/**
 * Parses and validates currency code
 * @param currency - Currency code (3-letter ISO 4217)
 * @returns Validated currency code
 */
function parseCurrencyCode(currency: string): string {
  const normalized = currency.toUpperCase();

  // Check if it's a known currency code
  if (normalized in CurrencyCode) {
    return normalized;
  }

  // If not in the predefined list, return as-is (bysquare will validate)
  return normalized;
}
