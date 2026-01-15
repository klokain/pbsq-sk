# PayBySquare MCP Server

A Model Context Protocol (MCP) server that exposes PayBySquare QR code generation, decoding, and compliance checking functionality to Claude and other MCP clients.

## Features

The MCP server provides four tools:

### 1. `generate_paybysquare`
Generate a PayBySquare QR code PNG image from payment data.

**Input:**
- `payment` (required): Payment data object
  - `iban` (required): Beneficiary IBAN
  - `beneficiaryName` (required): Recipient name
  - `amount` (optional): Payment amount
  - `currency` (optional): ISO 4217 currency code
  - `variableSymbol` (optional): Variable symbol (1-10 digits)
  - `constantSymbol` (optional): Constant symbol (1-4 digits)
  - `specificSymbol` (optional): Specific symbol (1-10 digits)
  - `paymentNote` (optional): Payment note (max 140 chars)
  - `dueDate` (optional): Due date (YYYY-MM-DD format)
  - `swift` (optional): SWIFT/BIC code
  - `originatorReference` (optional): Originator reference
  - `beneficiaryAddress` (optional): Address object with `street` and `city`
- `options` (optional): QR code generation options
  - `width`: QR code width in pixels (default: 300)
  - `margin`: Margin around QR code (default: 4)
  - `errorCorrectionLevel`: Error correction level (L, M, Q, H)
  - `color`: Color object with `dark` and `light` properties
  - `removeAccents`: Remove diacritics (default: true)

**Output:**
```json
{
  "success": true,
  "imageBase64": "iVBORw0KGgoAAAANSUhEUg...",
  "size": 12345,
  "message": "QR code generated successfully"
}
```

### 2. `decode_paybysquare`
Decode a PayBySquare QR code from a base64-encoded PNG image.

**Input:**
- `imageBase64` (required): Base64-encoded PNG image containing PayBySquare QR code

**Output:**
```json
{
  "success": true,
  "payment": {
    "iban": "SK9611000000002918599669",
    "beneficiaryName": "John Doe",
    "amount": 100.50,
    "currency": "EUR",
    ...
  },
  "message": "QR code decoded successfully"
}
```

### 3. `check_compliance`
Check payment data compliance with PayBySquare and banking standards.

**Input:**
- `payment` (required): Payment data object to validate
- `detailed` (optional): Return detailed report (default: true)

**Output (detailed=true):**
```json
{
  "success": true,
  "compliance": {
    "isCompliant": false,
    "errors": [
      {
        "type": "error",
        "field": "iban",
        "message": "IBAN checksum validation failed (mod-97 algorithm)",
        "severity": "critical"
      }
    ],
    "warnings": [],
    "details": {
      "ibanValid": false,
      "fieldsValid": true,
      "bankingStandardsValid": true,
      "totalIssues": 1
    }
  },
  "message": "Found 1 error(s) and 0 warning(s)"
}
```

### 4. `verify_roundtrip`
Verify that payment data survives encoding/decoding without loss.

**Input:**
- `payment` (required): Payment data object to verify

**Output:**
```json
{
  "success": true,
  "roundtrip": {
    "isLossless": true,
    "differences": [],
    "input": { ... },
    "decoded": { ... }
  },
  "message": "Data perfectly preserved through encode/decode cycle"
}
```

## Installation

### 1. Build the server

```bash
cd /path/to/paybysquare
npm install
npm run build:mcp
```

This will:
- Compile TypeScript to JavaScript
- Generate the MCP server binary in `dist/mcp-server/index.js`
- Make the binary executable

### 2. Configure Claude Desktop

Add the server to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "paybysquare": {
      "command": "node",
      "args": [
        "/absolute/path/to/paybysquare/dist/mcp-server/index.js"
      ]
    }
  }
}
```

Replace `/absolute/path/to/paybysquare` with the actual absolute path to your paybysquare directory.

### 3. Restart Claude Desktop

After updating the configuration, restart Claude Desktop for the changes to take effect.

## Usage Examples

Once configured, you can use the server through Claude:

### Generate a QR Code

```
Use the generate_paybysquare tool to create a QR code for:
- IBAN: SK9611000000002918599669
- Beneficiary: John Doe
- Amount: 100.50 EUR
- Payment note: Invoice #12345
```

### Decode a QR Code

```
I have a PayBySquare QR code image. Can you decode it and tell me the payment details?
[Attach or provide base64 image]
```

### Check Compliance

```
Check if this payment data is compliant with PayBySquare standards:
- IBAN: SK9611000000002918599669
- Beneficiary: Test Company
- Amount: 250.75 EUR
```

### Verify Round-Trip

```
Verify that this payment data can be encoded and decoded without loss:
[Provide payment data]
```

## Development

### Running the server directly

For development and testing:

```bash
npm run mcp
```

This runs the server using `tsx` for TypeScript execution without compilation.

### Testing with MCP Inspector

You can test the server using the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/mcp-server/index.js
```

## Error Handling

All tools return a consistent error format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

Common errors:
- **Validation errors**: Invalid input data (IBAN format, field lengths, etc.)
- **Decoding errors**: QR code cannot be read or is not a valid PayBySquare QR code
- **Encoding errors**: Failed to generate QR code from payment data

## Technical Details

- **Protocol**: Model Context Protocol (MCP)
- **Transport**: stdio
- **Runtime**: Node.js >= 18.0.0
- **Dependencies**:
  - `@modelcontextprotocol/sdk` - MCP SDK
  - `zod` - Schema validation
  - PayBySquare library (bysquare, qrcode, jsqr, jimp, ibantools)

## Troubleshooting

### Server not appearing in Claude

1. Check that the path in `claude_desktop_config.json` is absolute and correct
2. Verify the server binary exists: `ls -l dist/mcp-server/index.js`
3. Check the server runs: `node dist/mcp-server/index.js` (should start without errors)
4. Check Claude Desktop logs for errors

### Server crashes on startup

1. Ensure Node.js >= 18.0.0 is installed: `node --version`
2. Rebuild the project: `npm run build:mcp`
3. Check for missing dependencies: `npm install`

### Invalid IBAN errors

The server validates IBANs using the mod-97 checksum algorithm. Make sure:
- IBAN is in the correct format (country code + 2 digits + account number)
- IBAN checksum is valid
- IBAN length is between 15-34 characters

## License

MIT
