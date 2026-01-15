/**
 * Base error class for PayBySquare generator errors
 */
export class PayBySquareError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Thrown when input validation fails
 */
export class ValidationError extends PayBySquareError {
  constructor(message: string, options?: ErrorOptions) {
    super(`Validation Error: ${message}`, options);
  }
}

/**
 * Thrown when payment data encoding fails
 */
export class EncodingError extends PayBySquareError {
  constructor(message: string, options?: ErrorOptions) {
    super(`Encoding Error: ${message}`, options);
  }
}

/**
 * Thrown when QR code PNG generation fails
 */
export class GenerationError extends PayBySquareError {
  constructor(message: string, options?: ErrorOptions) {
    super(`Generation Error: ${message}`, options);
  }
}

/**
 * Thrown when QR code decoding fails
 */
export class DecodingError extends PayBySquareError {
  constructor(message: string, options?: ErrorOptions) {
    super(`Decoding Error: ${message}`, options);
  }
}
