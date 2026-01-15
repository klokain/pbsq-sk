# PayBySquare Generator

A comprehensive Node.js/TypeScript library for **PayBySquare** QR codes: Generate, decode, and validate payment QR codes. PayBySquare is a Slovak national standard for payment QR codes adopted by the Slovak Banking Association (SBA).

[![npm version](https://img.shields.io/npm/v/paybysquare-generator.svg)](https://www.npmjs.com/package/paybysquare-generator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

### Generation
- ✅ Simple JSON-based API
- ✅ Generates QR codes as PNG buffers or files
- ✅ Supports all PayBySquare payment fields
- ✅ Customizable QR code styling (size, colors, error correction)

### Decoding
- ✅ Decode PayBySquare QR codes from PNG buffers
- ✅ Extract payment data back to JSON format
- ✅ Round-trip verification (lossless encoding/decoding)

### Compliance & Validation
- ✅ IBAN checksum validation (mod-97 algorithm)
- ✅ Field format compliance checking
- ✅ Banking standards validation (BIC/SWIFT, currency codes)
- ✅ Detailed compliance reports with error severity levels

### Development
- ✅ Full TypeScript support with type definitions
- ✅ Zero UI dependencies - pure function-based API
- ✅ ESM module format (Node.js >= 18)
- ✅ Thoroughly tested (96 unit tests with 90%+ coverage)
- ✅ **MCP Server** - Use with Claude Desktop and other MCP clients

## Breaking Changes

### MCP Server v1.1.0 (January 2026)

**⚠️ Breaking Change: `generate_paybysquare` tool now returns file paths instead of base64-encoded images**

The MCP server's `generate_paybysquare` tool has been updated to save QR codes as files and return file paths instead of returning binary data as base64. This change provides better LLM context efficiency and makes generated QR codes persistent for later use.

**Before (v1.0.0):**
```json
{
  "success": true,
  "imageBase64": "iVBORw0KGgoAAAANSUhEUg...",
  "size": 12345,
  "message": "QR code generated successfully"
}
```

**After (v1.1.0):**
```json
{
  "success": true,
  "filePath": "/Users/username/paybysquare-qr-codes/paybysquare-1705331234567-a3f2.png",
  "fileName": "paybysquare-1705331234567-a3f2.png",
  "message": "QR code generated and saved successfully"
}
```

**Migration:**
- QR codes are now saved to `~/paybysquare-qr-codes/` by default
- Use the `outputDirectory` option to specify a custom save location
- Access the generated file using the returned `filePath`
- Note: The core library functions (`generatePayBySquare`, `generatePayBySquareToFile`) remain unchanged

**Enhanced Documentation:**
- Tool descriptions now emphasize that `beneficiaryName` is **REQUIRED**
- `swift` (BIC code) is now marked as **RECOMMENDED** for international payments

**Benefits:**
- Reduced token usage (file paths vs. base64 data)
- Better LLM context efficiency
- Persistent QR codes for later reference
- Easier integration with file-based workflows

**Note:** This change only affects the MCP server. The core Node.js/TypeScript library API remains fully backward compatible.

## Installation

```bash
npm install paybysquare-generator
```

## Requirements

- Node.js >= 18.0.0
- ESM module support

## Quick Start

```typescript
import { generatePayBySquare } from 'paybysquare-generator';

// Generate a payment QR code
const buffer = await generatePayBySquare({
  iban: 'SK9611000000002918599669',
  beneficiaryName: 'John Doe',
  amount: 100.50,
  currency: 'EUR',
  variableSymbol: '123456',
  paymentNote: 'Invoice payment'
});

// buffer is a PNG image as Buffer - save it, send it, etc.
```

## API Reference

### `generatePayBySquare(input, options?)`

Generates a PayBySquare QR code PNG from payment data.

**Parameters:**
- `input: PayBySquareInput` - Payment data (see below)
- `options?: GenerationOptions` - Optional QR code generation options

**Returns:** `Promise<Buffer>` - PNG image as a Node.js Buffer

**Throws:**
- `ValidationError` - If input data is invalid
- `EncodingError` - If payment data encoding fails
- `GenerationError` - If QR code PNG generation fails

### `generatePayBySquareToFile(input, filePath, options?)`

Generates a PayBySquare QR code and saves it to a file.

**Parameters:**
- `input: PayBySquareInput` - Payment data
- `filePath: string` - Path where to save the PNG file
- `options?: GenerationOptions` - Optional QR code generation options

**Returns:** `Promise<void>`

### `decodePayBySquare(buffer)`

Decodes a PayBySquare QR code from a PNG buffer back to payment data.

**Parameters:**
- `buffer: Buffer` - PNG image buffer containing PayBySquare QR code

**Returns:** `Promise<PayBySquareInput>` - Decoded payment data

**Throws:**
- `DecodingError` - If QR code cannot be read or decoded

**Example:**
```typescript
import { readFile } from 'fs/promises';
import { decodePayBySquare } from 'paybysquare-generator';

const qrBuffer = await readFile('./payment-qr.png');
const paymentData = await decodePayBySquare(qrBuffer);

console.log(paymentData.iban, paymentData.amount);
```

### `isCompliant(input)`

Simple pass/fail compliance check for payment data.

**Parameters:**
- `input: PayBySquareInput` - Payment data to validate

**Returns:** `boolean` - `true` if fully compliant, `false` otherwise

**Example:**
```typescript
import { isCompliant } from 'paybysquare-generator';

const isValid = isCompliant({
  iban: 'SK9611000000002918599669',
  beneficiaryName: 'Test'
});

console.log(isValid); // true or false
```

### `checkCompliance(input)`

Detailed compliance report with errors, warnings, and severity levels.

**Parameters:**
- `input: PayBySquareInput` - Payment data to validate

**Returns:** `Promise<ComplianceResult>` - Structured compliance report

**Example:**
```typescript
import { checkCompliance } from 'paybysquare-generator';

const report = await checkCompliance(paymentData);

if (!report.isCompliant) {
  console.log('Errors:', report.errors);
  console.log('Warnings:', report.warnings);
  console.log('Details:', report.details);
}
```

**ComplianceResult:**
```typescript
interface ComplianceResult {
  isCompliant: boolean;
  errors: ComplianceIssue[];     // Critical issues preventing payment
  warnings: ComplianceIssue[];   // Non-critical issues
  details: {
    ibanValid: boolean;
    fieldsValid: boolean;
    bankingStandardsValid: boolean;
    totalIssues: number;
  };
}

interface ComplianceIssue {
  type: 'error' | 'warning';
  field: string;
  message: string;
  severity: 'critical' | 'major' | 'minor';
}
```

### `checkQRCompliance(buffer)`

Check compliance of a QR code directly from PNG buffer.

**Parameters:**
- `buffer: Buffer` - PNG image buffer containing QR code

**Returns:** `Promise<ComplianceResult>` - Compliance report for decoded data

### `verifyRoundTrip(input)`

Verify that payment data survives encoding and decoding without loss.

**Parameters:**
- `input: PayBySquareInput` - Original payment data

**Returns:** `Promise<RoundTripResult>` - Round-trip verification result

**Example:**
```typescript
import { verifyRoundTrip } from 'paybysquare-generator';

const result = await verifyRoundTrip(originalData);

if (!result.isLossless) {
  console.log('Data loss detected:', result.differences);
}
```

**RoundTripResult:**
```typescript
interface RoundTripResult {
  isLossless: boolean;
  differences: FieldDifference[];
  input: PayBySquareInput;    // Original data
  decoded: PayBySquareInput;  // Data after encode/decode cycle
}

interface FieldDifference {
  field: string;
  original: any;
  decoded: any;
}
```

## Input Data Format

### PayBySquareInput

```typescript
interface PayBySquareInput {
  // Required fields
  iban: string;                    // e.g., "SK9611000000002918599669"
  beneficiaryName: string;         // Recipient name (max 70 chars)

  // Optional payment details
  amount?: number;                 // Payment amount (positive number)
  currency?: string;               // ISO 4217 code (default: "EUR")
  variableSymbol?: string;         // 1-10 digits
  constantSymbol?: string;         // 1-4 digits
  specificSymbol?: string;         // 1-10 digits
  paymentNote?: string;            // Max 140 characters
  dueDate?: string;                // ISO format: "YYYY-MM-DD"
  swift?: string;                  // SWIFT/BIC code
  originatorReference?: string;    // Reference info

  // Optional beneficiary address
  beneficiaryAddress?: {
    street?: string;               // Max 70 characters
    city?: string;                 // Max 70 characters
  };
}
```

### GenerationOptions

```typescript
interface GenerationOptions {
  width?: number;                  // QR code width in pixels (default: 300)
  margin?: number;                 // Margin around QR code (default: 4)
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';  // Default: 'M'
  color?: {
    dark?: string;                 // Dark color (default: '#000000')
    light?: string;                // Light color (default: '#ffffff')
  };
  removeAccents?: boolean;         // Remove diacritics (default: true)
}
```

## Usage Examples

### Minimal Payment

```typescript
import { generatePayBySquare } from 'paybysquare-generator';
import { writeFile } from 'fs/promises';

const buffer = await generatePayBySquare({
  iban: 'SK9611000000002918599669',
  beneficiaryName: 'John Doe'
});

await writeFile('payment.png', buffer);
```

### Complete Payment with All Fields

```typescript
const buffer = await generatePayBySquare({
  iban: 'SK9611000000002918599669',
  beneficiaryName: 'Acme Corporation',
  amount: 150.50,
  currency: 'EUR',
  variableSymbol: '2026001',
  constantSymbol: '0308',
  paymentNote: 'Invoice #2026001',
  dueDate: '2026-02-15',
  swift: 'TATRSKBX',
  originatorReference: 'REF-2026-001',
  beneficiaryAddress: {
    street: 'Business Street 123',
    city: 'Bratislava 81108'
  }
});
```

### Donation (No Fixed Amount)

```typescript
// Amount can be omitted for voluntary donations
const buffer = await generatePayBySquare({
  iban: 'SK9611000000002918599669',
  beneficiaryName: 'Charity Organization',
  paymentNote: 'Voluntary donation'
});
```

### Custom QR Code Styling

```typescript
const buffer = await generatePayBySquare(
  {
    iban: 'SK9611000000002918599669',
    beneficiaryName: 'Shop Name',
    amount: 99.99
  },
  {
    width: 500,                    // Larger QR code
    margin: 2,                     // Smaller margin
    errorCorrectionLevel: 'H',     // High error correction
    color: {
      dark: '#1E40AF',             // Blue QR code
      light: '#FFFFFF'             // White background
    }
  }
);
```

### Save Directly to File

```typescript
import { generatePayBySquareToFile } from 'paybysquare-generator';

await generatePayBySquareToFile(
  {
    iban: 'SK9611000000002918599669',
    beneficiaryName: 'Recipient',
    amount: 25.00
  },
  './payment.png'
);
```

### Error Handling

```typescript
import {
  generatePayBySquare,
  ValidationError,
  EncodingError,
  GenerationError
} from 'paybysquare-generator';

try {
  const buffer = await generatePayBySquare({
    iban: 'INVALID',
    beneficiaryName: 'Test'
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid input:', error.message);
  } else if (error instanceof EncodingError) {
    console.error('Encoding failed:', error.message);
  } else if (error instanceof GenerationError) {
    console.error('QR generation failed:', error.message);
  }
}
```

### Decoding QR Codes

```typescript
import { decodePayBySquare } from 'paybysquare-generator';
import { readFile } from 'fs/promises';

// Read QR code from file
const qrBuffer = await readFile('./payment-qr.png');

// Decode payment data
const paymentData = await decodePayBySquare(qrBuffer);

console.log('IBAN:', paymentData.iban);
console.log('Beneficiary:', paymentData.beneficiaryName);
console.log('Amount:', paymentData.amount, paymentData.currency);
console.log('Variable Symbol:', paymentData.variableSymbol);
```

### Simple Compliance Check

```typescript
import { isCompliant } from 'paybysquare-generator';

const paymentData = {
  iban: 'SK9611000000002918599669',
  beneficiaryName: 'Test Merchant',
  amount: 100,
  currency: 'EUR'
};

if (isCompliant(paymentData)) {
  console.log('✓ Payment data is valid');
} else {
  console.log('✗ Payment data has issues');
}
```

### Detailed Compliance Report

```typescript
import { checkCompliance } from 'paybysquare-generator';

const paymentData = {
  iban: 'SK9999999999999999999999',  // Invalid checksum
  beneficiaryName: 'Test',
  amount: -50,  // Negative amount
  variableSymbol: 'ABC123',  // Should be digits only
  swift: 'INVALID'  // Invalid BIC format
};

const report = await checkCompliance(paymentData);

console.log('Compliant:', report.isCompliant);
console.log('\nErrors:');
report.errors.forEach(err => {
  console.log(`  [${err.severity}] ${err.field}: ${err.message}`);
});

console.log('\nValidation Details:');
console.log('  IBAN valid:', report.details.ibanValid);
console.log('  Fields valid:', report.details.fieldsValid);
console.log('  Banking standards valid:', report.details.bankingStandardsValid);
console.log('  Total issues:', report.details.totalIssues);
```

### Round-Trip Verification

```typescript
import { verifyRoundTrip } from 'paybysquare-generator';

const originalData = {
  iban: 'SK9611000000002918599669',
  beneficiaryName: 'Test Company',
  amount: 250.75,
  currency: 'EUR',
  variableSymbol: '123456',
  paymentNote: 'Testing round-trip'
};

const result = await verifyRoundTrip(originalData);

if (result.isLossless) {
  console.log('✓ Data perfectly preserved through encode/decode cycle!');
} else {
  console.log('✗ Data loss detected:');
  result.differences.forEach(diff => {
    console.log(`  ${diff.field}:`);
    console.log(`    Original: ${diff.original}`);
    console.log(`    Decoded:  ${diff.decoded}`);
  });
}
```

## Validation Rules

The library performs comprehensive validation on all inputs:

- **IBAN**: Required, must be valid format (2-letter country code + 2 digits + 11-30 alphanumeric)
- **Beneficiary Name**: Required, max 70 characters
- **Amount**: Optional, must be positive and finite when provided
- **Currency**: Optional, must be 3-letter ISO 4217 code (default: EUR)
- **Variable Symbol**: Optional, 1-10 digits only
- **Constant Symbol**: Optional, 1-4 digits only
- **Specific Symbol**: Optional, 1-10 digits only
- **Payment Note**: Optional, max 140 characters
- **Due Date**: Optional, must be ISO 8601 format (YYYY-MM-DD)
- **Address Fields**: Optional, max 70 characters each

## Running Examples

The repository includes comprehensive examples:

```bash
git clone https://github.com/yourusername/paybysquare-generator
cd paybysquare-generator
npm install
npm run example
```

This will generate several example QR codes demonstrating different use cases.

## Running Tests

```bash
npm test              # Run tests once
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

## Building from Source

```bash
npm run build         # Compile TypeScript to dist/
```

## PayBySquare Standard

This library implements the PayBySquare standard version 1.1.0 as defined by the Slovak Banking Association (SBA). For more information:

- [PayBySquare Official Site](https://bysquare.com/en/pay-by-square/)
- [PayBySquare Specification (PDF)](https://www.sbaonline.sk/wp-content/uploads/2020/03/pay-by-square-specifications-1_1_0.pdf)

## Dependencies

### Production
- [bysquare](https://www.npmjs.com/package/bysquare) - Official PayBySquare encoder/decoder
- [qrcode](https://www.npmjs.com/package/qrcode) - QR code PNG generator
- [jsqr](https://www.npmjs.com/package/jsqr) - QR code scanner (pure JavaScript)
- [jimp](https://www.npmjs.com/package/jimp) - Image processing for QR code decoding
- [ibantools](https://www.npmjs.com/package/ibantools) - IBAN validation with mod-97 checksum

## TypeScript Support

This library is written in TypeScript and includes complete type definitions. All types are exported for your convenience:

```typescript
import type {
  // Input/Output types
  PayBySquareInput,
  BeneficiaryAddress,
  GenerationOptions,

  // Compliance types
  ComplianceResult,
  ComplianceIssue,
  ComplianceDetails,
  RoundTripResult,
  FieldDifference
} from 'paybysquare-generator';

// Error classes are also exported
import {
  PayBySquareError,
  ValidationError,
  EncodingError,
  GenerationError,
  DecodingError
} from 'paybysquare-generator';
```

## MCP Server

This library includes a **Model Context Protocol (MCP) server** that exposes all functionality to Claude and other MCP clients.

### Available Tools

- `generate_paybysquare` - Generate QR codes from payment data (saves to file, returns file path)
  - **Required:** `beneficiaryName` (recipient's full name)
  - **Recommended:** `swift` (BIC code for international transfers)
  - **Optional:** `outputDirectory` (custom save location, default: `~/paybysquare-qr-codes/`)
- `decode_paybysquare` - Decode QR codes to payment data (from base64-encoded PNG)
- `check_compliance` - Validate payment data compliance with detailed error reports
- `verify_roundtrip` - Verify lossless encoding/decoding (data integrity check)

### Quick Setup

1. **Build the server:**
   ```bash
   npm run build:mcp
   ```

2. **Configure Claude Desktop:**

   Add to your `claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "paybysquare": {
         "command": "node",
         "args": ["/absolute/path/to/paybysquare/dist/mcp-server/index.js"]
       }
     }
   }
   ```

3. **Restart Claude Desktop**

### Example Usage in Claude

Once configured, you can use natural language:

```
Generate a PayBySquare QR code for:
- IBAN: SK9611000000002918599669
- Beneficiary: John Doe
- Amount: 100.50 EUR
- SWIFT: TATRSKBX
- Payment note: Invoice #12345
```

Claude will generate the QR code and save it to a file, returning:
```
✓ QR code generated successfully!
File saved to: /Users/username/paybysquare-qr-codes/paybysquare-1705331234567-a3f2.png
```

```
Decode this PayBySquare QR code and tell me the payment details
[Attach image]
```

```
Check if this payment data is compliant with banking standards:
- IBAN: SK9611000000002918599669
- Beneficiary: Test Company
- Amount: 250 EUR
- SWIFT: TATRSKBX
```

**Note:** QR codes are automatically saved to `~/paybysquare-qr-codes/` by default. You can specify a custom directory using the `outputDirectory` option.

For detailed MCP server documentation, see [mcp-server/README.md](./mcp-server/README.md).

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Related Projects

- [bysquare](https://github.com/xseman/bysquare) - Official PayBySquare encoder library
- [node-qrcode](https://github.com/soldair/node-qrcode) - QR code generator for Node.js

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/yourusername/paybysquare-generator/issues) on GitHub.

---

**Made with ❤️ for the Slovak developer community**
