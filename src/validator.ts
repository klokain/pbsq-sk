import { ValidationError } from './errors.js';
import type { PayBySquareInput } from './types.js';

/**
 * Validates PayBySquare input data
 * @param input - Payment data to validate
 * @throws {ValidationError} If validation fails
 */
export function validateInput(input: PayBySquareInput): void {
  // Required fields
  if (!input.iban?.trim()) {
    throw new ValidationError('IBAN is required');
  }

  if (!input.beneficiaryName?.trim()) {
    throw new ValidationError('Beneficiary name is required');
  }

  // IBAN format validation
  if (!isValidIBAN(input.iban)) {
    throw new ValidationError('Invalid IBAN format');
  }

  // Amount validation
  if (input.amount !== undefined) {
    if (typeof input.amount !== 'number' || input.amount < 0) {
      throw new ValidationError('Amount must be a positive number');
    }
    if (!isFinite(input.amount)) {
      throw new ValidationError('Amount must be a finite number');
    }
  }

  // Currency validation
  if (input.currency && !isValidCurrencyCode(input.currency)) {
    throw new ValidationError(`Invalid currency code: ${input.currency}`);
  }

  // Symbol validations
  if (input.variableSymbol && !/^\d{1,10}$/.test(input.variableSymbol)) {
    throw new ValidationError('Variable symbol must be 1-10 digits');
  }

  if (input.constantSymbol && !/^\d{1,4}$/.test(input.constantSymbol)) {
    throw new ValidationError('Constant symbol must be 1-4 digits');
  }

  if (input.specificSymbol && !/^\d{1,10}$/.test(input.specificSymbol)) {
    throw new ValidationError('Specific symbol must be 1-10 digits');
  }

  // Length validations
  if (input.paymentNote && input.paymentNote.length > 140) {
    throw new ValidationError('Payment note cannot exceed 140 characters');
  }

  if (input.beneficiaryName.length > 70) {
    throw new ValidationError('Beneficiary name cannot exceed 70 characters');
  }

  if (input.beneficiaryAddress?.street && input.beneficiaryAddress.street.length > 70) {
    throw new ValidationError('Beneficiary street cannot exceed 70 characters');
  }

  if (input.beneficiaryAddress?.city && input.beneficiaryAddress.city.length > 70) {
    throw new ValidationError('Beneficiary city cannot exceed 70 characters');
  }

  // Date validation
  if (input.dueDate && !isValidISODate(input.dueDate)) {
    throw new ValidationError('Due date must be in ISO 8601 format (YYYY-MM-DD)');
  }
}

/**
 * Validates IBAN format (basic check)
 * @param iban - IBAN to validate
 * @returns true if IBAN format is valid
 */
function isValidIBAN(iban: string): boolean {
  // Basic IBAN format check (alphanumeric, 15-34 chars, starts with 2-letter country code)
  const cleaned = iban.replace(/\s/g, '');
  return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(cleaned);
}

/**
 * Validates ISO 4217 currency code
 * @param code - Currency code to validate
 * @returns true if currency code is valid
 */
function isValidCurrencyCode(code: string): boolean {
  // Check if valid ISO 4217 currency code (3 uppercase letters)
  return /^[A-Z]{3}$/.test(code.toUpperCase());
}

/**
 * Validates ISO 8601 date format (YYYY-MM-DD)
 * @param date - Date string to validate
 * @returns true if date format is valid
 */
function isValidISODate(date: string): boolean {
  // Validate ISO 8601 date format YYYY-MM-DD
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return false;

  const [, year, month, day] = match;
  const dateObj = new Date(date);

  return (
    dateObj.getFullYear() === parseInt(year) &&
    dateObj.getMonth() + 1 === parseInt(month) &&
    dateObj.getDate() === parseInt(day)
  );
}
