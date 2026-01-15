import { isValidIBAN, isValidBIC } from 'ibantools';
import { CurrencyCode } from 'bysquare';
import type {
  PayBySquareInput,
  ComplianceResult,
  ComplianceIssue,
  ComplianceDetails,
  RoundTripResult,
  FieldDifference
} from './types.js';
import { generatePayBySquare } from './generator.js';
import { decodePayBySquare } from './decoder.js';

/**
 * Simple pass/fail compliance check
 *
 * @param input - Payment data to check
 * @returns true if fully compliant, false otherwise
 *
 * @example
 * ```typescript
 * const isValid = isCompliant({
 *   iban: 'SK9611000000002918599669',
 *   beneficiaryName: 'Test'
 * });
 * console.log(isValid); // true or false
 * ```
 */
export function isCompliant(input: PayBySquareInput): boolean {
  const issues: ComplianceIssue[] = [];

  // IBAN checksum
  if (!isValidIBAN(input.iban)) {
    return false;
  }

  // Field formats
  issues.push(...validateFieldFormats(input));

  // Banking standards
  issues.push(...validateBankingStandards(input));

  // Only count errors (not warnings)
  const errors = issues.filter(i => i.type === 'error');
  return errors.length === 0;
}

/**
 * Detailed compliance report
 *
 * @param input - Payment data to validate
 * @returns Structured compliance report with errors, warnings, and details
 *
 * @example
 * ```typescript
 * const report = await checkCompliance(paymentData);
 * if (!report.isCompliant) {
 *   console.log('Errors:', report.errors);
 * }
 * ```
 */
export async function checkCompliance(input: PayBySquareInput): Promise<ComplianceResult> {
  const errors: ComplianceIssue[] = [];
  const warnings: ComplianceIssue[] = [];

  // 1. IBAN checksum validation
  const ibanIssue = validateIBANChecksum(input.iban);
  if (ibanIssue) {
    errors.push(ibanIssue);
  }

  // 2. Field format validation
  const fieldIssues = validateFieldFormats(input);
  fieldIssues.forEach(issue => {
    if (issue.type === 'error') {
      errors.push(issue);
    } else {
      warnings.push(issue);
    }
  });

  // 3. Banking standards validation
  const bankingIssues = validateBankingStandards(input);
  bankingIssues.forEach(issue => {
    if (issue.type === 'error') {
      errors.push(issue);
    } else {
      warnings.push(issue);
    }
  });

  // Build details
  const details: ComplianceDetails = {
    ibanValid: !ibanIssue,
    fieldsValid: fieldIssues.filter(i => i.type === 'error').length === 0,
    bankingStandardsValid: bankingIssues.filter(i => i.type === 'error').length === 0,
    totalIssues: errors.length + warnings.length
  };

  return {
    isCompliant: errors.length === 0,
    errors,
    warnings,
    details
  };
}

/**
 * Check compliance of QR code directly from PNG buffer
 *
 * @param buffer - PNG image buffer containing QR code
 * @returns Compliance report for the decoded payment data
 *
 * @example
 * ```typescript
 * const qrBuffer = await readFile('./payment.png');
 * const report = await checkQRCompliance(qrBuffer);
 * ```
 */
export async function checkQRCompliance(buffer: Buffer): Promise<ComplianceResult> {
  const decoded = await decodePayBySquare(buffer);
  return checkCompliance(decoded);
}

/**
 * Round-trip verification test
 *
 * Encodes input data to QR code, then decodes it back and compares
 * to check for any data loss or transformation issues.
 *
 * @param input - Original payment data
 * @returns Round-trip verification result with differences
 *
 * @example
 * ```typescript
 * const result = await verifyRoundTrip(originalData);
 * if (!result.isLossless) {
 *   console.log('Data loss detected:', result.differences);
 * }
 * ```
 */
export async function verifyRoundTrip(input: PayBySquareInput): Promise<RoundTripResult> {
  // Generate QR code from input
  const qrBuffer = await generatePayBySquare(input);

  // Decode it back
  const decoded = await decodePayBySquare(qrBuffer);

  // Compare field by field
  const differences: FieldDifference[] = [];

  // Helper to compare values (handles undefined)
  const compareField = (field: keyof PayBySquareInput) => {
    const original = input[field];
    const decodedValue = decoded[field];

    // Both undefined/null - OK
    if (original == null && decodedValue == null) {
      return;
    }

    // One is undefined - difference
    if (original !== decodedValue) {
      differences.push({
        field: field as string,
        original,
        decoded: decodedValue
      });
    }
  };

  // Compare all fields
  compareField('iban');
  compareField('beneficiaryName');
  compareField('amount');
  compareField('currency');
  compareField('variableSymbol');
  compareField('constantSymbol');
  compareField('specificSymbol');
  compareField('paymentNote');
  compareField('dueDate');
  compareField('swift');
  compareField('originatorReference');

  // Compare address fields
  if (input.beneficiaryAddress || decoded.beneficiaryAddress) {
    if (input.beneficiaryAddress?.street !== decoded.beneficiaryAddress?.street) {
      differences.push({
        field: 'beneficiaryAddress.street',
        original: input.beneficiaryAddress?.street,
        decoded: decoded.beneficiaryAddress?.street
      });
    }
    if (input.beneficiaryAddress?.city !== decoded.beneficiaryAddress?.city) {
      differences.push({
        field: 'beneficiaryAddress.city',
        original: input.beneficiaryAddress?.city,
        decoded: decoded.beneficiaryAddress?.city
      });
    }
  }

  return {
    isLossless: differences.length === 0,
    differences,
    input,
    decoded
  };
}

/**
 * Validate IBAN checksum using mod-97 algorithm
 */
function validateIBANChecksum(iban: string): ComplianceIssue | null {
  if (!isValidIBAN(iban)) {
    return {
      type: 'error',
      field: 'iban',
      message: 'IBAN checksum validation failed (mod-97 algorithm)',
      severity: 'critical'
    };
  }
  return null;
}

/**
 * Validate field formats against PayBySquare specification
 */
function validateFieldFormats(input: PayBySquareInput): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];

  // IBAN format (basic - checksum validated separately)
  const ibanCleaned = input.iban.replace(/\s/g, '');
  if (ibanCleaned.length < 15 || ibanCleaned.length > 34) {
    issues.push({
      type: 'error',
      field: 'iban',
      message: 'IBAN length must be between 15 and 34 characters',
      severity: 'major'
    });
  }

  // Beneficiary name length
  if (input.beneficiaryName.length > 70) {
    issues.push({
      type: 'error',
      field: 'beneficiaryName',
      message: 'Exceeds maximum length of 70 characters',
      severity: 'major'
    });
  }

  // Variable symbol format
  if (input.variableSymbol && !/^\d{1,10}$/.test(input.variableSymbol)) {
    issues.push({
      type: 'error',
      field: 'variableSymbol',
      message: 'Must contain only digits (1-10)',
      severity: 'major'
    });
  }

  // Constant symbol format
  if (input.constantSymbol && !/^\d{1,4}$/.test(input.constantSymbol)) {
    issues.push({
      type: 'error',
      field: 'constantSymbol',
      message: 'Must contain only digits (1-4)',
      severity: 'major'
    });
  }

  // Specific symbol format
  if (input.specificSymbol && !/^\d{1,10}$/.test(input.specificSymbol)) {
    issues.push({
      type: 'error',
      field: 'specificSymbol',
      message: 'Must contain only digits (1-10)',
      severity: 'major'
    });
  }

  // Payment note length
  if (input.paymentNote && input.paymentNote.length > 140) {
    issues.push({
      type: 'error',
      field: 'paymentNote',
      message: 'Exceeds maximum length of 140 characters',
      severity: 'major'
    });
  }

  // Address field lengths
  if (input.beneficiaryAddress?.street && input.beneficiaryAddress.street.length > 70) {
    issues.push({
      type: 'error',
      field: 'beneficiaryAddress.street',
      message: 'Exceeds maximum length of 70 characters',
      severity: 'minor'
    });
  }

  if (input.beneficiaryAddress?.city && input.beneficiaryAddress.city.length > 70) {
    issues.push({
      type: 'error',
      field: 'beneficiaryAddress.city',
      message: 'Exceeds maximum length of 70 characters',
      severity: 'minor'
    });
  }

  // Date format
  if (input.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) {
    issues.push({
      type: 'error',
      field: 'dueDate',
      message: 'Must be in ISO 8601 format (YYYY-MM-DD)',
      severity: 'major'
    });
  }

  return issues;
}

/**
 * Validate banking standards (BIC/SWIFT, currency codes, amount limits)
 */
function validateBankingStandards(input: PayBySquareInput): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];

  // BIC/SWIFT validation
  if (input.swift && !isValidBIC(input.swift)) {
    issues.push({
      type: 'error',
      field: 'swift',
      message: 'Invalid BIC/SWIFT code format',
      severity: 'major'
    });
  }

  // Currency code validation (ISO 4217)
  if (input.currency) {
    const currencyUpper = input.currency.toUpperCase();
    const isValidCurrency = currencyUpper in CurrencyCode;

    if (!isValidCurrency) {
      issues.push({
        type: 'warning',
        field: 'currency',
        message: 'Currency code not in ISO 4217 standard',
        severity: 'minor'
      });
    }
  }

  // Amount validation
  if (input.amount !== undefined) {
    if (input.amount < 0) {
      issues.push({
        type: 'error',
        field: 'amount',
        message: 'Amount must be positive',
        severity: 'critical'
      });
    }

    if (input.amount > 999999999999999) {
      issues.push({
        type: 'error',
        field: 'amount',
        message: 'Amount exceeds PayBySquare maximum (999,999,999,999,999)',
        severity: 'major'
      });
    }

    if (!isFinite(input.amount)) {
      issues.push({
        type: 'error',
        field: 'amount',
        message: 'Amount must be a finite number',
        severity: 'critical'
      });
    }
  }

  return issues;
}
