/**
 * PayBySquare Generator
 *
 * A comprehensive Node.js library for PayBySquare QR codes:
 * - Generate PayBySquare QR codes from JSON
 * - Decode PayBySquare QR codes from PNG buffers
 * - Validate compliance with PayBySquare and banking standards
 *
 * PayBySquare is a Slovak national standard for payment QR codes adopted by the
 * Slovak Banking Association (SBA).
 *
 * @packageDocumentation
 */

// Generation functions
export { generatePayBySquare, generatePayBySquareToFile } from './generator.js';

// Decoding functions
export { decodePayBySquare } from './decoder.js';

// Compliance checking functions
export {
  isCompliant,
  checkCompliance,
  checkQRCompliance,
  verifyRoundTrip
} from './compliance.js';

// Types
export type {
  PayBySquareInput,
  GenerationOptions,
  BeneficiaryAddress,
  ComplianceResult,
  ComplianceIssue,
  ComplianceDetails,
  RoundTripResult,
  FieldDifference
} from './types.js';

// Errors (for error handling)
export {
  PayBySquareError,
  ValidationError,
  EncodingError,
  GenerationError,
  DecodingError
} from './errors.js';
