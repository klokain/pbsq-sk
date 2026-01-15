/**
 * Beneficiary address information
 */
export interface BeneficiaryAddress {
  /** Street address (max 70 characters) */
  street?: string;
  /** City or address line 2 (max 70 characters) */
  city?: string;
}

/**
 * PayBySquare payment input data
 */
export interface PayBySquareInput {
  // Required fields
  /** Beneficiary's IBAN (e.g., "SK9611000000002918599669") */
  iban: string;
  /** Name of payment recipient (max 70 characters) */
  beneficiaryName: string;

  // Optional payment details
  /** Payment amount (decimal number) */
  amount?: number;
  /** Currency code (ISO 4217, default: "EUR") */
  currency?: string;
  /** Variable symbol (1-10 digits) */
  variableSymbol?: string;
  /** Constant symbol (1-4 digits) */
  constantSymbol?: string;
  /** Specific symbol (1-10 digits) */
  specificSymbol?: string;
  /** Payment description (max 140 characters) */
  paymentNote?: string;
  /** Due date in ISO 8601 format (YYYY-MM-DD) */
  dueDate?: string;
  /** SWIFT/BIC code */
  swift?: string;
  /** Originator's reference information */
  originatorReference?: string;

  // Optional beneficiary address
  /** Beneficiary address details */
  beneficiaryAddress?: BeneficiaryAddress;
}

/**
 * QR code generation options
 */
export interface GenerationOptions {
  /** QR code width in pixels (default: 300) */
  width?: number;
  /** Margin around QR code in modules (default: 4) */
  margin?: number;
  /** Error correction level (default: 'M') */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  /** QR code colors */
  color?: {
    /** Dark module color (default: '#000000') */
    dark?: string;
    /** Light module color (default: '#ffffff') */
    light?: string;
  };
  /** Remove diacritics from text (default: true) */
  removeAccents?: boolean;
}

/**
 * Compliance validation result
 */
export interface ComplianceResult {
  /** Whether the input is fully compliant */
  isCompliant: boolean;
  /** List of compliance errors */
  errors: ComplianceIssue[];
  /** List of compliance warnings */
  warnings: ComplianceIssue[];
  /** Detailed compliance information */
  details: ComplianceDetails;
}

/**
 * Individual compliance issue (error or warning)
 */
export interface ComplianceIssue {
  /** Type of issue */
  type: 'error' | 'warning';
  /** Field that has the issue */
  field: string;
  /** Human-readable error message */
  message: string;
  /** Severity level */
  severity: 'critical' | 'major' | 'minor';
}

/**
 * Detailed compliance check results
 */
export interface ComplianceDetails {
  /** Whether IBAN is valid (checksum) */
  ibanValid: boolean;
  /** Whether all field formats are valid */
  fieldsValid: boolean;
  /** Whether banking standards are met */
  bankingStandardsValid: boolean;
  /** Total number of issues found */
  totalIssues: number;
}

/**
 * Round-trip verification result
 */
export interface RoundTripResult {
  /** Whether encoding/decoding is lossless */
  isLossless: boolean;
  /** List of field differences found */
  differences: FieldDifference[];
  /** Original input data */
  input: PayBySquareInput;
  /** Decoded data */
  decoded: PayBySquareInput;
}

/**
 * Difference between original and decoded field value
 */
export interface FieldDifference {
  /** Field name */
  field: string;
  /** Original value */
  original: any;
  /** Decoded value */
  decoded: any;
}
