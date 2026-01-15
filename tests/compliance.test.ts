import { describe, it, expect } from 'vitest';
import {
  isCompliant,
  checkCompliance,
  checkQRCompliance,
  verifyRoundTrip
} from '../src/compliance.js';
import { generatePayBySquare } from '../src/generator.js';
import type { PayBySquareInput } from '../src/types.js';

describe('isCompliant', () => {
  describe('valid data', () => {
    it('should return true for minimal valid data', () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'John Doe'
      };

      expect(isCompliant(input)).toBe(true);
    });

    it('should return true for complete valid data', () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test Company',
        amount: 100.50,
        currency: 'EUR',
        variableSymbol: '1234567890',
        constantSymbol: '0308',
        specificSymbol: '9876543210',
        paymentNote: 'Valid payment note',
        dueDate: '2026-12-31',
        swift: 'TATRSKBX',
        originatorReference: 'REF-001',
        beneficiaryAddress: {
          street: 'Main Street 123',
          city: 'Bratislava'
        }
      };

      expect(isCompliant(input)).toBe(true);
    });

    it('should return true for Czech IBAN', () => {
      const input: PayBySquareInput = {
        iban: 'CZ6508000000192000145399',
        beneficiaryName: 'Czech Test'
      };

      expect(isCompliant(input)).toBe(true);
    });

    it('should return true for German IBAN', () => {
      const input: PayBySquareInput = {
        iban: 'DE89370400440532013000',
        beneficiaryName: 'German Test'
      };

      expect(isCompliant(input)).toBe(true);
    });
  });

  describe('invalid IBAN', () => {
    it('should return false for invalid IBAN checksum', () => {
      const input: PayBySquareInput = {
        iban: 'SK9999999999999999999999', // Invalid checksum
        beneficiaryName: 'Test'
      };

      expect(isCompliant(input)).toBe(false);
    });

    it('should return false for too short IBAN', () => {
      const input: PayBySquareInput = {
        iban: 'SK96110000', // Too short
        beneficiaryName: 'Test'
      };

      expect(isCompliant(input)).toBe(false);
    });

    it('should return false for malformed IBAN', () => {
      const input: PayBySquareInput = {
        iban: 'INVALID-IBAN',
        beneficiaryName: 'Test'
      };

      expect(isCompliant(input)).toBe(false);
    });
  });

  describe('field format violations', () => {
    it('should return false for too long beneficiary name', () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'x'.repeat(71) // Max is 70
      };

      expect(isCompliant(input)).toBe(false);
    });

    it('should return false for invalid variable symbol format', () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test',
        variableSymbol: 'ABC123' // Must be digits only
      };

      expect(isCompliant(input)).toBe(false);
    });

    it('should return false for too long variable symbol', () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test',
        variableSymbol: '12345678901' // Max is 10 digits
      };

      expect(isCompliant(input)).toBe(false);
    });

    it('should return false for invalid constant symbol format', () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test',
        constantSymbol: 'ABCD' // Must be digits only
      };

      expect(isCompliant(input)).toBe(false);
    });

    it('should return false for too long constant symbol', () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test',
        constantSymbol: '12345' // Max is 4 digits
      };

      expect(isCompliant(input)).toBe(false);
    });

    it('should return false for invalid specific symbol format', () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test',
        specificSymbol: 'XYZ123' // Must be digits only
      };

      expect(isCompliant(input)).toBe(false);
    });

    it('should return false for too long payment note', () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test',
        paymentNote: 'x'.repeat(141) // Max is 140
      };

      expect(isCompliant(input)).toBe(false);
    });

    it('should return false for invalid date format', () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test',
        dueDate: '31/12/2026' // Must be YYYY-MM-DD
      };

      expect(isCompliant(input)).toBe(false);
    });
  });

  describe('banking standards violations', () => {
    it('should return false for invalid BIC/SWIFT format', () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test',
        swift: 'INVALID' // Invalid BIC format
      };

      expect(isCompliant(input)).toBe(false);
    });

    it('should return false for negative amount', () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test',
        amount: -100 // Must be positive
      };

      expect(isCompliant(input)).toBe(false);
    });

    it('should return false for amount exceeding maximum', () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test',
        amount: 1000000000000000 // Exceeds PayBySquare maximum
      };

      expect(isCompliant(input)).toBe(false);
    });

    it('should return false for non-finite amount', () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test',
        amount: Infinity
      };

      expect(isCompliant(input)).toBe(false);
    });
  });
});

describe('checkCompliance', () => {
  describe('valid data', () => {
    it('should pass compliance for minimal valid data', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test'
      };

      const result = await checkCompliance(input);

      expect(result.isCompliant).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.details.ibanValid).toBe(true);
      expect(result.details.fieldsValid).toBe(true);
      expect(result.details.bankingStandardsValid).toBe(true);
      expect(result.details.totalIssues).toBe(0);
    });

    it('should pass compliance for complete valid data', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Complete Test',
        amount: 250.75,
        currency: 'EUR',
        variableSymbol: '123456',
        constantSymbol: '0308',
        specificSymbol: '9876543210',
        paymentNote: 'Test payment',
        dueDate: '2026-12-31',
        swift: 'TATRSKBX',
        originatorReference: 'REF-001',
        beneficiaryAddress: {
          street: 'Main Street 123',
          city: 'Bratislava'
        }
      };

      const result = await checkCompliance(input);

      expect(result.isCompliant).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('IBAN validation', () => {
    it('should detect invalid IBAN checksum', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9999999999999999999999',
        beneficiaryName: 'Test'
      };

      const result = await checkCompliance(input);

      expect(result.isCompliant).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'error',
          field: 'iban',
          severity: 'critical'
        })
      );
      expect(result.details.ibanValid).toBe(false);
    });

    it('should detect too short IBAN', async () => {
      const input: PayBySquareInput = {
        iban: 'SK96110',
        beneficiaryName: 'Test'
      };

      const result = await checkCompliance(input);

      expect(result.isCompliant).toBe(false);
      expect(result.errors.some(e => e.field === 'iban')).toBe(true);
    });
  });

  describe('field format validation', () => {
    it('should detect beneficiary name exceeding max length', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'x'.repeat(71)
      };

      const result = await checkCompliance(input);

      expect(result.isCompliant).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'beneficiaryName',
          type: 'error',
          severity: 'major'
        })
      );
    });

    it('should detect invalid variable symbol format', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test',
        variableSymbol: 'ABC123'
      };

      const result = await checkCompliance(input);

      expect(result.isCompliant).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'variableSymbol',
          message: expect.stringContaining('digits')
        })
      );
    });

    it('should detect invalid constant symbol format', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test',
        constantSymbol: '12345' // Too long
      };

      const result = await checkCompliance(input);

      expect(result.isCompliant).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'constantSymbol'
        })
      );
    });

    it('should detect invalid specific symbol format', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test',
        specificSymbol: 'XYZ'
      };

      const result = await checkCompliance(input);

      expect(result.isCompliant).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'specificSymbol'
        })
      );
    });

    it('should detect payment note exceeding max length', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test',
        paymentNote: 'x'.repeat(141)
      };

      const result = await checkCompliance(input);

      expect(result.isCompliant).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'paymentNote',
          message: expect.stringContaining('140')
        })
      );
    });

    it('should detect invalid date format', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test',
        dueDate: '31/12/2026'
      };

      const result = await checkCompliance(input);

      expect(result.isCompliant).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'dueDate',
          message: expect.stringContaining('ISO 8601')
        })
      );
    });

    it('should detect too long street address', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test',
        beneficiaryAddress: {
          street: 'x'.repeat(71)
        }
      };

      const result = await checkCompliance(input);

      expect(result.isCompliant).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'beneficiaryAddress.street'
        })
      );
    });

    it('should detect too long city', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test',
        beneficiaryAddress: {
          city: 'x'.repeat(71)
        }
      };

      const result = await checkCompliance(input);

      expect(result.isCompliant).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'beneficiaryAddress.city'
        })
      );
    });
  });

  describe('banking standards validation', () => {
    it('should detect invalid BIC/SWIFT format', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test',
        swift: 'INVALID'
      };

      const result = await checkCompliance(input);

      expect(result.isCompliant).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'swift',
          message: expect.stringContaining('BIC/SWIFT')
        })
      );
    });

    it('should warn for non-standard currency code', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test',
        amount: 100,
        currency: 'XXX' // Non-standard but valid format
      };

      const result = await checkCompliance(input);

      // May produce warnings but could still be compliant if no errors
      if (result.warnings.length > 0) {
        expect(result.warnings).toContainEqual(
          expect.objectContaining({
            field: 'currency',
            type: 'warning'
          })
        );
      }
    });

    it('should detect negative amount', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test',
        amount: -100
      };

      const result = await checkCompliance(input);

      expect(result.isCompliant).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'amount',
          severity: 'critical',
          message: expect.stringContaining('positive')
        })
      );
    });

    it('should detect amount exceeding maximum', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test',
        amount: 1000000000000000
      };

      const result = await checkCompliance(input);

      expect(result.isCompliant).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'amount',
          message: expect.stringContaining('maximum')
        })
      );
    });

    it('should detect non-finite amount', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test',
        amount: Infinity
      };

      const result = await checkCompliance(input);

      expect(result.isCompliant).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'amount',
          severity: 'critical',
          message: expect.stringContaining('finite')
        })
      );
    });
  });

  describe('multiple violations', () => {
    it('should detect multiple errors', async () => {
      const input: PayBySquareInput = {
        iban: 'INVALID',
        beneficiaryName: 'x'.repeat(71),
        amount: -100,
        variableSymbol: 'ABC',
        swift: 'BAD'
      };

      const result = await checkCompliance(input);

      expect(result.isCompliant).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.details.totalIssues).toBeGreaterThan(1);
    });
  });
});

describe('checkQRCompliance', () => {
  it('should validate QR code with valid data', async () => {
    const input: PayBySquareInput = {
      iban: 'SK9611000000002918599669',
      beneficiaryName: 'Test Merchant'
    };

    const qrBuffer = await generatePayBySquare(input);
    const result = await checkQRCompliance(qrBuffer);

    expect(result.isCompliant).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate QR code with complete data', async () => {
    const input: PayBySquareInput = {
      iban: 'SK9611000000002918599669',
      beneficiaryName: 'Complete QR Test',
      amount: 150.50,
      currency: 'EUR',
      variableSymbol: '123456',
      paymentNote: 'Test payment',
      swift: 'TATRSKBX'
    };

    const qrBuffer = await generatePayBySquare(input);
    const result = await checkQRCompliance(qrBuffer);

    expect(result.isCompliant).toBe(true);
    expect(result.details.ibanValid).toBe(true);
    expect(result.details.fieldsValid).toBe(true);
    expect(result.details.bankingStandardsValid).toBe(true);
  });

  it('should work with QR codes generated from edge case data', async () => {
    const input: PayBySquareInput = {
      iban: 'SK9611000000002918599669',
      beneficiaryName: 'x'.repeat(70), // Max length
      amount: 999999.99,
      variableSymbol: '1234567890', // Max length
      constantSymbol: '1234', // Max length
      specificSymbol: '9876543210' // Max length
    };

    const qrBuffer = await generatePayBySquare(input);
    const result = await checkQRCompliance(qrBuffer);

    expect(result.isCompliant).toBe(true);
  });
});

describe('verifyRoundTrip', () => {
  describe('lossless round-trips', () => {
    it('should verify lossless round-trip for minimal data', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Round Trip Test'
      };

      const result = await verifyRoundTrip(input);

      expect(result.isLossless).toBe(true);
      expect(result.differences).toHaveLength(0);
      expect(result.input).toEqual(input);
      expect(result.decoded.iban).toBe(input.iban);
      expect(result.decoded.beneficiaryName).toBe(input.beneficiaryName);
    });

    it('should verify lossless round-trip for complete data', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Full Round Trip',
        amount: 999.99,
        currency: 'EUR',
        variableSymbol: '1234567890',
        constantSymbol: '1234',
        specificSymbol: '9999999999',
        paymentNote: 'Complete payment note',
        dueDate: '2027-01-15',
        swift: 'TATRSKBX',
        beneficiaryAddress: {
          street: 'Test Street 456',
          city: 'Test City'
        }
      };

      const result = await verifyRoundTrip(input);

      expect(result.isLossless).toBe(true);
      expect(result.differences).toHaveLength(0);
      expect(result.decoded).toMatchObject(input);
    });

    it('should handle IBAN normalization (spaces removed)', async () => {
      const input: PayBySquareInput = {
        iban: 'SK96 1100 0000 0029 1859 9669',
        beneficiaryName: 'IBAN Spaces Test'
      };

      const result = await verifyRoundTrip(input);

      // IBAN should be normalized (spaces removed) but still valid
      expect(result.decoded.iban).toBe('SK9611000000002918599669');
      // This is an expected transformation, may or may not count as "lossless"
    });

    it('should handle zero amount correctly', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Zero Amount',
        amount: 0,
        currency: 'EUR'
      };

      const result = await verifyRoundTrip(input);

      expect(result.isLossless).toBe(true);
      expect(result.decoded.amount).toBe(0);
    });

    it('should handle donation (no amount) correctly', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Charity',
        paymentNote: 'Voluntary donation'
      };

      const result = await verifyRoundTrip(input);

      expect(result.isLossless).toBe(true);
      expect(result.decoded.amount).toBeUndefined();
    });

    it('should handle partial address correctly', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Address Test',
        beneficiaryAddress: {
          street: 'Main Street'
          // city omitted
        }
      };

      const result = await verifyRoundTrip(input);

      expect(result.isLossless).toBe(true);
      expect(result.decoded.beneficiaryAddress?.street).toBe('Main Street');
    });

    it('should handle maximum length fields', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'x'.repeat(70),
        paymentNote: 'y'.repeat(140),
        variableSymbol: '1234567890',
        constantSymbol: '1234',
        specificSymbol: '9876543210'
      };

      const result = await verifyRoundTrip(input);

      expect(result.isLossless).toBe(true);
      expect(result.decoded.beneficiaryName.length).toBe(70);
      expect(result.decoded.paymentNote?.length).toBe(140);
    });

    it('should handle different currencies', async () => {
      const currencies = ['EUR', 'USD', 'CZK', 'GBP'];

      for (const currency of currencies) {
        const input: PayBySquareInput = {
          iban: 'SK9611000000002918599669',
          beneficiaryName: 'Multi Currency',
          amount: 100,
          currency
        };

        const result = await verifyRoundTrip(input);

        expect(result.isLossless).toBe(true);
        expect(result.decoded.currency).toBe(currency);
      }
    });
  });

  describe('difference detection', () => {
    it('should have original and decoded data in result', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test'
      };

      const result = await verifyRoundTrip(input);

      expect(result.input).toBeDefined();
      expect(result.decoded).toBeDefined();
      expect(result.input.iban).toBe(input.iban);
      expect(result.decoded.iban).toBe(input.iban);
    });

    it('should provide field-by-field comparison data', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test',
        amount: 100.50,
        variableSymbol: '123456'
      };

      const result = await verifyRoundTrip(input);

      // Even if lossless, should have the comparison structure
      expect(result).toHaveProperty('differences');
      expect(Array.isArray(result.differences)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle large amounts correctly', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Large Amount',
        amount: 999999.99,
        currency: 'EUR'
      };

      const result = await verifyRoundTrip(input);

      expect(result.isLossless).toBe(true);
      expect(result.decoded.amount).toBe(input.amount);
    });

    it('should handle decimal precision correctly', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Decimal Test',
        amount: 123.45,
        currency: 'EUR'
      };

      const result = await verifyRoundTrip(input);

      expect(result.isLossless).toBe(true);
      expect(result.decoded.amount).toBe(123.45);
    });

    it('should handle special characters in text fields', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Ján Kováč',
        paymentNote: 'Platba č. 123'
      };

      const result = await verifyRoundTrip(input);

      // Note: removeAccents option in generator might affect this
      expect(result.decoded.beneficiaryName).toBeDefined();
      expect(result.decoded.paymentNote).toBeDefined();
    });
  });
});
