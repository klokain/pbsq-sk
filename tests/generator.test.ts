import { describe, it, expect } from 'vitest';
import { generatePayBySquare, generatePayBySquareToFile } from '../src/generator.js';
import { ValidationError, EncodingError, GenerationError } from '../src/errors.js';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';

describe('generatePayBySquare', () => {
  describe('valid inputs', () => {
    it('should generate PNG buffer for minimal valid input', async () => {
      const input = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'John Doe'
      };

      const buffer = await generatePayBySquare(input);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      // Check PNG magic number (first 8 bytes)
      expect(buffer.toString('hex', 0, 8)).toBe('89504e470d0a1a0a');
    });

    it('should generate PNG with all optional fields', async () => {
      const input = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'John Doe',
        amount: 100.50,
        currency: 'EUR',
        variableSymbol: '123456',
        constantSymbol: '0308',
        specificSymbol: '9876543210',
        paymentNote: 'Test payment',
        dueDate: '2026-12-31',
        swift: 'TATRSKBX',
        beneficiaryAddress: {
          street: 'Main Street 1',
          city: 'Bratislava'
        }
      };

      const buffer = await generatePayBySquare(input);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should handle IBAN with spaces', async () => {
      const input = {
        iban: 'SK96 1100 0000 0029 1859 9669',
        beneficiaryName: 'John Doe'
      };

      const buffer = await generatePayBySquare(input);
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should apply custom generation options', async () => {
      const input = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'John Doe'
      };

      const buffer = await generatePayBySquare(input, {
        width: 500,
        errorCorrectionLevel: 'H',
        margin: 2
      });

      expect(buffer).toBeInstanceOf(Buffer);
      // Larger width should produce larger buffer
      expect(buffer.length).toBeGreaterThan(1000);
    });

    it('should support custom colors', async () => {
      const input = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'John Doe'
      };

      const buffer = await generatePayBySquare(input, {
        color: {
          dark: '#0000FF',
          light: '#FFFFFF'
        }
      });

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should handle zero amount', async () => {
      const input = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'John Doe',
        amount: 0
      };

      const buffer = await generatePayBySquare(input);
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should handle missing optional amount', async () => {
      const input = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Donation Recipient'
        // No amount - for voluntary donations
      };

      const buffer = await generatePayBySquare(input);
      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('validation errors', () => {
    it('should throw ValidationError for missing IBAN', async () => {
      const input = {
        beneficiaryName: 'John Doe'
      } as any;

      await expect(generatePayBySquare(input))
        .rejects.toThrow(ValidationError);
      await expect(generatePayBySquare(input))
        .rejects.toThrow('IBAN is required');
    });

    it('should throw ValidationError for missing beneficiary name', async () => {
      const input = {
        iban: 'SK9611000000002918599669'
      } as any;

      await expect(generatePayBySquare(input))
        .rejects.toThrow(ValidationError);
      await expect(generatePayBySquare(input))
        .rejects.toThrow('Beneficiary name is required');
    });

    it('should throw ValidationError for invalid IBAN format', async () => {
      const input = {
        iban: 'INVALID',
        beneficiaryName: 'John Doe'
      };

      await expect(generatePayBySquare(input))
        .rejects.toThrow('Invalid IBAN format');
    });

    it('should throw ValidationError for IBAN too short', async () => {
      const input = {
        iban: 'SK96110000',
        beneficiaryName: 'John Doe'
      };

      await expect(generatePayBySquare(input))
        .rejects.toThrow('Invalid IBAN format');
    });

    it('should throw ValidationError for negative amount', async () => {
      const input = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'John Doe',
        amount: -50
      };

      await expect(generatePayBySquare(input))
        .rejects.toThrow('Amount must be a positive number');
    });

    it('should throw ValidationError for non-finite amount', async () => {
      const input = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'John Doe',
        amount: Infinity
      };

      await expect(generatePayBySquare(input))
        .rejects.toThrow('Amount must be a finite number');
    });

    it('should throw ValidationError for invalid currency code', async () => {
      const input = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'John Doe',
        currency: 'EURO' // Should be EUR
      };

      await expect(generatePayBySquare(input))
        .rejects.toThrow('Invalid currency code');
    });

    it('should throw ValidationError for invalid variable symbol', async () => {
      const input = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'John Doe',
        variableSymbol: '12345678901' // Too long (max 10 digits)
      };

      await expect(generatePayBySquare(input))
        .rejects.toThrow('Variable symbol must be 1-10 digits');
    });

    it('should throw ValidationError for non-numeric variable symbol', async () => {
      const input = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'John Doe',
        variableSymbol: 'ABC123'
      };

      await expect(generatePayBySquare(input))
        .rejects.toThrow('Variable symbol must be 1-10 digits');
    });

    it('should throw ValidationError for invalid constant symbol', async () => {
      const input = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'John Doe',
        constantSymbol: '12345' // Too long (max 4 digits)
      };

      await expect(generatePayBySquare(input))
        .rejects.toThrow('Constant symbol must be 1-4 digits');
    });

    it('should throw ValidationError for invalid specific symbol', async () => {
      const input = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'John Doe',
        specificSymbol: '12345678901' // Too long (max 10 digits)
      };

      await expect(generatePayBySquare(input))
        .rejects.toThrow('Specific symbol must be 1-10 digits');
    });

    it('should throw ValidationError for payment note too long', async () => {
      const input = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'John Doe',
        paymentNote: 'x'.repeat(141) // Max 140 characters
      };

      await expect(generatePayBySquare(input))
        .rejects.toThrow('Payment note cannot exceed 140 characters');
    });

    it('should throw ValidationError for beneficiary name too long', async () => {
      const input = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'x'.repeat(71) // Max 70 characters
      };

      await expect(generatePayBySquare(input))
        .rejects.toThrow('Beneficiary name cannot exceed 70 characters');
    });

    it('should throw ValidationError for invalid date format', async () => {
      const input = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'John Doe',
        dueDate: '2026/12/31' // Should be YYYY-MM-DD
      };

      await expect(generatePayBySquare(input))
        .rejects.toThrow('Due date must be in ISO 8601 format');
    });

    it('should throw ValidationError for invalid date', async () => {
      const input = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'John Doe',
        dueDate: '2026-02-30' // Invalid date
      };

      await expect(generatePayBySquare(input))
        .rejects.toThrow('Due date must be in ISO 8601 format');
    });
  });

  describe('edge cases', () => {
    it('should handle decimal amounts with many decimal places', async () => {
      const input = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'John Doe',
        amount: 100.123456789
      };

      const buffer = await generatePayBySquare(input);
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should handle large amounts', async () => {
      const input = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'John Doe',
        amount: 999999999.99
      };

      const buffer = await generatePayBySquare(input);
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should handle payment note at max length', async () => {
      const input = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'John Doe',
        paymentNote: 'x'.repeat(140)
      };

      const buffer = await generatePayBySquare(input);
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should handle beneficiaryName at max length', async () => {
      const input = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'x'.repeat(70)
      };

      const buffer = await generatePayBySquare(input);
      expect(buffer).toBeInstanceOf(Buffer);
    });
  });
});

describe('generatePayBySquareToFile', () => {
  const testFilePath = './test-payment-qr.png';

  it('should create PNG file', async () => {
    const input = {
      iban: 'SK9611000000002918599669',
      beneficiaryName: 'John Doe',
      amount: 50.00
    };

    await generatePayBySquareToFile(input, testFilePath);

    expect(existsSync(testFilePath)).toBe(true);

    // Cleanup
    await unlink(testFilePath);
  });

  it('should create PNG file with custom options', async () => {
    const input = {
      iban: 'SK9611000000002918599669',
      beneficiaryName: 'John Doe'
    };

    await generatePayBySquareToFile(input, testFilePath, {
      width: 400,
      errorCorrectionLevel: 'H'
    });

    expect(existsSync(testFilePath)).toBe(true);

    // Cleanup
    await unlink(testFilePath);
  });
});
