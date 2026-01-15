import { Jimp } from 'jimp';
import jsQR from 'jsqr';
import { decode as bysquareDecode, type DataModel } from 'bysquare';
import type { PayBySquareInput } from './types.js';
import { DecodingError } from './errors.js';

/**
 * Decodes a PayBySquare QR code from PNG buffer
 *
 * @param buffer - PNG image buffer containing QR code
 * @returns Decoded payment data in PayBySquareInput format
 * @throws {DecodingError} If QR code cannot be read or decoded
 *
 * @example
 * ```typescript
 * const qrBuffer = await readFile('./payment-qr.png');
 * const paymentData = await decodePayBySquare(qrBuffer);
 * console.log(paymentData.iban, paymentData.amount);
 * ```
 */
export async function decodePayBySquare(buffer: Buffer): Promise<PayBySquareInput> {
  // Step 1: Extract QR string from PNG buffer
  const qrString = await extractQRString(buffer);

  // Step 2: Decode QR string with bysquare
  let dataModel: DataModel;
  try {
    dataModel = bysquareDecode(qrString);
  } catch (error) {
    throw new DecodingError(
      'Failed to decode PayBySquare QR string',
      { cause: error }
    );
  }

  // Step 3: Transform DataModel to PayBySquareInput
  const result = transformFromDataModel(dataModel);

  return result;
}

/**
 * Extracts QR code string from PNG buffer
 *
 * @param buffer - PNG image buffer
 * @returns QR code data as string
 * @throws {DecodingError} If no QR code found or image cannot be read
 */
async function extractQRString(buffer: Buffer): Promise<string> {
  try {
    // Load image with Jimp
    const image = await Jimp.read(buffer);

    // Get image dimensions
    const width = image.bitmap.width;
    const height = image.bitmap.height;

    // Convert to Uint8ClampedArray format expected by jsQR
    // jsQR expects RGBA format: [r0, g0, b0, a0, r1, g1, b1, a1, ...]
    const imageData = new Uint8ClampedArray(width * height * 4);

    let idx = 0;
    image.scan(0, 0, width, height, (_x: number, _y: number, offset: number) => {
      const red = image.bitmap.data[offset + 0];
      const green = image.bitmap.data[offset + 1];
      const blue = image.bitmap.data[offset + 2];
      const alpha = image.bitmap.data[offset + 3];

      imageData[idx++] = red;
      imageData[idx++] = green;
      imageData[idx++] = blue;
      imageData[idx++] = alpha;
    });

    // Decode QR code with jsQR
    const code = jsQR(imageData, width, height);

    if (!code) {
      throw new DecodingError('No QR code found in image');
    }

    return code.data;
  } catch (error) {
    if (error instanceof DecodingError) {
      throw error;
    }
    throw new DecodingError(
      'Failed to read image or extract QR code',
      { cause: error }
    );
  }
}

/**
 * Transforms bysquare DataModel to simplified PayBySquareInput format
 *
 * @param data - DataModel from bysquare.decode()
 * @returns Simplified PayBySquareInput format
 */
function transformFromDataModel(data: DataModel): PayBySquareInput {
  // Get first payment (PayBySquare typically has one payment)
  const payment = data.payments[0];

  if (!payment) {
    throw new DecodingError('No payment data found in QR code');
  }

  // Extract bank account (first one)
  const bankAccount = payment.bankAccounts?.[0];
  if (!bankAccount?.iban) {
    throw new DecodingError('No IBAN found in payment data');
  }

  // Build result object
  const result: PayBySquareInput = {
    // Required fields
    iban: bankAccount.iban,
    beneficiaryName: payment.beneficiary?.name || '',

    // Optional fields
    // Only include amount if currencyCode is present (indicates amount was explicitly set)
    // The bysquare library returns amount=0 and currencyCode='' when amount is not provided
    ...(payment.currencyCode && { amount: payment.amount }),
    ...(payment.currencyCode && { currency: payment.currencyCode as string }),
    ...(payment.variableSymbol && { variableSymbol: payment.variableSymbol }),
    ...(payment.constantSymbol && { constantSymbol: payment.constantSymbol }),
    ...(payment.specificSymbol && { specificSymbol: payment.specificSymbol }),
    ...(payment.paymentNote && { paymentNote: payment.paymentNote }),
    ...(payment.paymentDueDate && { dueDate: payment.paymentDueDate }),
    ...(bankAccount.bic && { swift: bankAccount.bic }),
    ...(payment.originatorsReferenceInformation && {
      originatorReference: payment.originatorsReferenceInformation
    })
  };

  // Add beneficiary address if available
  if (payment.beneficiary && (payment.beneficiary.street || payment.beneficiary.city)) {
    result.beneficiaryAddress = {
      ...(payment.beneficiary.street && { street: payment.beneficiary.street }),
      ...(payment.beneficiary.city && { city: payment.beneficiary.city })
    };
  }

  return result;
}
