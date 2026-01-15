import { describe, it, expect } from 'vitest';
import { generatePayBySquare } from '../src/generator.js';
import { decodePayBySquare } from '../src/decoder.js';
import { DecodingError } from '../src/errors.js';
import type { PayBySquareInput } from '../src/types.js';

describe('decodePayBySquare', () => {
  describe('basic decoding', () => {
    it('should decode minimal QR code', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'John Doe'
      };

      const qr = await generatePayBySquare(input);
      const decoded = await decodePayBySquare(qr);

      expect(decoded.iban).toBe(input.iban);
      expect(decoded.beneficiaryName).toBe(input.beneficiaryName);
    });

    it('should decode QR code with amount and currency', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Test Merchant',
        amount: 100.50,
        currency: 'EUR'
      };

      const qr = await generatePayBySquare(input);
      const decoded = await decodePayBySquare(qr);

      expect(decoded.iban).toBe(input.iban);
      expect(decoded.beneficiaryName).toBe(input.beneficiaryName);
      expect(decoded.amount).toBe(input.amount);
      expect(decoded.currency).toBe(input.currency);
    });

    it('should decode QR code with all optional fields', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Complete Test',
        amount: 250.75,
        currency: 'EUR',
        variableSymbol: '123456',
        constantSymbol: '0308',
        specificSymbol: '9876543210',
        paymentNote: 'Test payment note',
        dueDate: '2026-12-31',
        swift: 'TATRSKBX',
        originatorReference: 'REF-001'
      };

      const qr = await generatePayBySquare(input);
      const decoded = await decodePayBySquare(qr);

      expect(decoded).toMatchObject(input);
    });

    it('should decode QR code with beneficiary address', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Address Test',
        beneficiaryAddress: {
          street: 'Main Street 123',
          city: 'Bratislava'
        }
      };

      const qr = await generatePayBySquare(input);
      const decoded = await decodePayBySquare(qr);

      expect(decoded.iban).toBe(input.iban);
      expect(decoded.beneficiaryName).toBe(input.beneficiaryName);
      expect(decoded.beneficiaryAddress).toEqual(input.beneficiaryAddress);
    });
  });

  describe('round-trip compatibility', () => {
    it('should handle round-trip for minimal data', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Round Trip Test'
      };

      const qr = await generatePayBySquare(input);
      const decoded = await decodePayBySquare(qr);

      expect(decoded.iban).toBe(input.iban);
      expect(decoded.beneficiaryName).toBe(input.beneficiaryName);
    });

    it('should handle round-trip for complete data', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Full Round Trip',
        amount: 999.99,
        currency: 'EUR',
        variableSymbol: '1234567890',
        constantSymbol: '1234',
        specificSymbol: '9999999999',
        paymentNote: 'Complete payment note for testing',
        dueDate: '2027-01-15',
        swift: 'TATRSKBX',
        beneficiaryAddress: {
          street: 'Test Street 456',
          city: 'Test City'
        }
      };

      const qr = await generatePayBySquare(input);
      const decoded = await decodePayBySquare(qr);

      // Check all fields match
      expect(decoded.iban).toBe(input.iban);
      expect(decoded.beneficiaryName).toBe(input.beneficiaryName);
      expect(decoded.amount).toBe(input.amount);
      expect(decoded.currency).toBe(input.currency);
      expect(decoded.variableSymbol).toBe(input.variableSymbol);
      expect(decoded.constantSymbol).toBe(input.constantSymbol);
      expect(decoded.specificSymbol).toBe(input.specificSymbol);
      expect(decoded.paymentNote).toBe(input.paymentNote);
      expect(decoded.dueDate).toBe(input.dueDate);
      expect(decoded.swift).toBe(input.swift);
      expect(decoded.beneficiaryAddress).toEqual(input.beneficiaryAddress);
    });

    it('should handle donation (no amount)', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Charity Organization',
        paymentNote: 'Voluntary donation'
      };

      const qr = await generatePayBySquare(input);
      const decoded = await decodePayBySquare(qr);

      expect(decoded.iban).toBe(input.iban);
      expect(decoded.beneficiaryName).toBe(input.beneficiaryName);
      expect(decoded.paymentNote).toBe(input.paymentNote);
      expect(decoded.amount).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should throw DecodingError for invalid buffer', async () => {
      const invalidBuffer = Buffer.from('not a valid PNG');

      await expect(decodePayBySquare(invalidBuffer))
        .rejects.toThrow(DecodingError);
    });

    it('should throw DecodingError for PNG without QR code', async () => {
      // Create a small solid color PNG (no QR code)
      const { Jimp } = await import('jimp');
      const image = new Jimp({ width: 100, height: 100, color: 0xFFFFFFFF });
      const buffer = await image.getBuffer('image/png');

      await expect(decodePayBySquare(buffer))
        .rejects.toThrow(DecodingError);
      await expect(decodePayBySquare(buffer))
        .rejects.toThrow('No QR code found');
    });

    it('should throw DecodingError for empty buffer', async () => {
      const emptyBuffer = Buffer.from([]);

      await expect(decodePayBySquare(emptyBuffer))
        .rejects.toThrow(DecodingError);
    });
  });

  describe('edge cases', () => {
    it('should handle zero amount', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Zero Amount',
        amount: 0
      };

      const qr = await generatePayBySquare(input);
      const decoded = await decodePayBySquare(qr);

      expect(decoded.amount).toBe(0);
    });

    it('should handle large amounts', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'Large Amount',
        amount: 999999.99
      };

      const qr = await generatePayBySquare(input);
      const decoded = await decodePayBySquare(qr);

      expect(decoded.amount).toBe(input.amount);
    });

    it('should handle maximum length fields', async () => {
      const input: PayBySquareInput = {
        iban: 'SK9611000000002918599669',
        beneficiaryName: 'x'.repeat(70), // Max 70 chars
        paymentNote: 'y'.repeat(140), // Max 140 chars
        variableSymbol: '1234567890', // Max 10 digits
        constantSymbol: '1234', // Max 4 digits
        specificSymbol: '9876543210' // Max 10 digits
      };

      const qr = await generatePayBySquare(input);
      const decoded = await decodePayBySquare(qr);

      expect(decoded.beneficiaryName.length).toBe(70);
      expect(decoded.paymentNote?.length).toBe(140);
      expect(decoded.variableSymbol).toBe(input.variableSymbol);
      expect(decoded.constantSymbol).toBe(input.constantSymbol);
      expect(decoded.specificSymbol).toBe(input.specificSymbol);
    });

    it('should handle IBAN with spaces', async () => {
      const input: PayBySquareInput = {
        iban: 'SK96 1100 0000 0029 1859 9669',
        beneficiaryName: 'IBAN Spaces'
      };

      const qr = await generatePayBySquare(input);
      const decoded = await decodePayBySquare(qr);

      // IBAN should be stored without spaces
      expect(decoded.iban).toBe('SK9611000000002918599669');
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

        const qr = await generatePayBySquare(input);
        const decoded = await decodePayBySquare(qr);

        expect(decoded.currency).toBe(currency);
      }
    });
  });
});
