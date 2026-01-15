#!/usr/bin/env node

/**
 * PayBySquare MCP Server
 *
 * Exposes PayBySquare generation, decoding, and compliance checking
 * functionality through the Model Context Protocol.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import {
  generatePayBySquare,
  decodePayBySquare,
  checkCompliance,
  isCompliant,
  verifyRoundTrip,
} from '../src/index.js';

// Zod schemas for input validation
const PayBySquareInputSchema = z.object({
  iban: z.string().min(15).max(34),
  beneficiaryName: z.string().max(70),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  variableSymbol: z.string().regex(/^\d{1,10}$/).optional(),
  constantSymbol: z.string().regex(/^\d{1,4}$/).optional(),
  specificSymbol: z.string().regex(/^\d{1,10}$/).optional(),
  paymentNote: z.string().max(140).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  swift: z.string().optional(),
  originatorReference: z.string().optional(),
  beneficiaryAddress: z.object({
    street: z.string().max(70).optional(),
    city: z.string().max(70).optional(),
  }).optional(),
});

const GenerationOptionsSchema = z.object({
  width: z.number().min(100).max(2000).optional(),
  margin: z.number().min(0).max(10).optional(),
  errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H']).optional(),
  color: z.object({
    dark: z.string().optional(),
    light: z.string().optional(),
  }).optional(),
  removeAccents: z.boolean().optional(),
});

// Define MCP tools
const TOOLS: Tool[] = [
  {
    name: 'generate_paybysquare',
    description: 'Generate a PayBySquare QR code PNG image from payment data. Returns base64-encoded PNG.',
    inputSchema: {
      type: 'object',
      properties: {
        payment: {
          type: 'object',
          description: 'Payment data',
          properties: {
            iban: { type: 'string', description: 'Beneficiary IBAN (e.g., "SK9611000000002918599669")' },
            beneficiaryName: { type: 'string', description: 'Recipient name (max 70 chars)' },
            amount: { type: 'number', description: 'Payment amount (positive number)' },
            currency: { type: 'string', description: 'ISO 4217 currency code (default: EUR)' },
            variableSymbol: { type: 'string', description: 'Variable symbol (1-10 digits)' },
            constantSymbol: { type: 'string', description: 'Constant symbol (1-4 digits)' },
            specificSymbol: { type: 'string', description: 'Specific symbol (1-10 digits)' },
            paymentNote: { type: 'string', description: 'Payment note (max 140 chars)' },
            dueDate: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
            swift: { type: 'string', description: 'SWIFT/BIC code' },
            originatorReference: { type: 'string', description: 'Originator reference' },
            beneficiaryAddress: {
              type: 'object',
              properties: {
                street: { type: 'string', description: 'Street address (max 70 chars)' },
                city: { type: 'string', description: 'City (max 70 chars)' },
              },
            },
          },
          required: ['iban', 'beneficiaryName'],
        },
        options: {
          type: 'object',
          description: 'QR code generation options',
          properties: {
            width: { type: 'number', description: 'QR code width in pixels (default: 300)' },
            margin: { type: 'number', description: 'Margin around QR code (default: 4)' },
            errorCorrectionLevel: { type: 'string', enum: ['L', 'M', 'Q', 'H'], description: 'Error correction level (default: M)' },
            color: {
              type: 'object',
              properties: {
                dark: { type: 'string', description: 'Dark color (default: #000000)' },
                light: { type: 'string', description: 'Light color (default: #ffffff)' },
              },
            },
            removeAccents: { type: 'boolean', description: 'Remove diacritics (default: true)' },
          },
        },
      },
      required: ['payment'],
    },
  },
  {
    name: 'decode_paybysquare',
    description: 'Decode a PayBySquare QR code from base64-encoded PNG image. Returns payment data.',
    inputSchema: {
      type: 'object',
      properties: {
        imageBase64: {
          type: 'string',
          description: 'Base64-encoded PNG image containing PayBySquare QR code',
        },
      },
      required: ['imageBase64'],
    },
  },
  {
    name: 'check_compliance',
    description: 'Check payment data compliance with PayBySquare and banking standards. Returns detailed compliance report.',
    inputSchema: {
      type: 'object',
      properties: {
        payment: {
          type: 'object',
          description: 'Payment data to validate',
          properties: {
            iban: { type: 'string' },
            beneficiaryName: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string' },
            variableSymbol: { type: 'string' },
            constantSymbol: { type: 'string' },
            specificSymbol: { type: 'string' },
            paymentNote: { type: 'string' },
            dueDate: { type: 'string' },
            swift: { type: 'string' },
            originatorReference: { type: 'string' },
            beneficiaryAddress: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
              },
            },
          },
          required: ['iban', 'beneficiaryName'],
        },
        detailed: {
          type: 'boolean',
          description: 'Return detailed report (default: true)',
        },
      },
      required: ['payment'],
    },
  },
  {
    name: 'verify_roundtrip',
    description: 'Verify that payment data survives encoding/decoding without loss. Useful for testing data integrity.',
    inputSchema: {
      type: 'object',
      properties: {
        payment: {
          type: 'object',
          description: 'Payment data to verify',
          properties: {
            iban: { type: 'string' },
            beneficiaryName: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string' },
            variableSymbol: { type: 'string' },
            constantSymbol: { type: 'string' },
            specificSymbol: { type: 'string' },
            paymentNote: { type: 'string' },
            dueDate: { type: 'string' },
            swift: { type: 'string' },
            originatorReference: { type: 'string' },
            beneficiaryAddress: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
              },
            },
          },
          required: ['iban', 'beneficiaryName'],
        },
      },
      required: ['payment'],
    },
  },
];

// Create server instance
const server = new Server(
  {
    name: 'paybysquare-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'generate_paybysquare': {
        const { payment, options } = args as {
          payment: z.infer<typeof PayBySquareInputSchema>;
          options?: z.infer<typeof GenerationOptionsSchema>;
        };

        // Validate input
        const validatedPayment = PayBySquareInputSchema.parse(payment);
        const validatedOptions = options ? GenerationOptionsSchema.parse(options) : undefined;

        // Generate QR code
        const buffer = await generatePayBySquare(validatedPayment, validatedOptions);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                imageBase64: buffer.toString('base64'),
                size: buffer.length,
                message: 'QR code generated successfully',
              }, null, 2),
            },
          ],
        };
      }

      case 'decode_paybysquare': {
        const { imageBase64 } = args as { imageBase64: string };

        // Decode base64 to buffer
        const buffer = Buffer.from(imageBase64, 'base64');

        // Decode QR code
        const paymentData = await decodePayBySquare(buffer);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                payment: paymentData,
                message: 'QR code decoded successfully',
              }, null, 2),
            },
          ],
        };
      }

      case 'check_compliance': {
        const { payment, detailed = true } = args as {
          payment: z.infer<typeof PayBySquareInputSchema>;
          detailed?: boolean;
        };

        const validatedPayment = PayBySquareInputSchema.parse(payment);

        if (detailed) {
          const report = await checkCompliance(validatedPayment);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  compliance: report,
                  message: report.isCompliant
                    ? 'Payment data is fully compliant'
                    : `Found ${report.errors.length} error(s) and ${report.warnings.length} warning(s)`,
                }, null, 2),
              },
            ],
          };
        } else {
          const isValid = isCompliant(validatedPayment);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  isCompliant: isValid,
                  message: isValid ? 'Payment data is compliant' : 'Payment data has compliance issues',
                }, null, 2),
              },
            ],
          };
        }
      }

      case 'verify_roundtrip': {
        const { payment } = args as {
          payment: z.infer<typeof PayBySquareInputSchema>;
        };

        const validatedPayment = PayBySquareInputSchema.parse(payment);

        const result = await verifyRoundTrip(validatedPayment);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                roundtrip: result,
                message: result.isLossless
                  ? 'Data perfectly preserved through encode/decode cycle'
                  : `Found ${result.differences.length} difference(s)`,
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: errorMessage,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('PayBySquare MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
