/**
 * PayBySquare Generator - Usage Examples
 *
 * This file demonstrates various ways to use the paybysquare-generator library.
 * Run with: npm run example
 */

import {
  generatePayBySquare,
  generatePayBySquareToFile,
  decodePayBySquare,
  checkCompliance,
  isCompliant,
  verifyRoundTrip
} from '../src/index.js';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

async function example1_minimal() {
  console.log('Example 1: Minimal payment (IBAN + beneficiary name)');
  console.log('='.repeat(60));

  const buffer = await generatePayBySquare({
    iban: 'SK9611000000002918599669',
    beneficiaryName: 'John Doe'
  });

  await writeFile(join(process.cwd(), 'example1-minimal.png'), buffer);
  console.log('✓ Generated: example1-minimal.png');
  console.log(`  Size: ${buffer.length} bytes\n`);
}

async function example2_complete() {
  console.log('Example 2: Complete payment with all fields');
  console.log('='.repeat(60));

  const buffer = await generatePayBySquare({
    iban: 'SK9611000000002918599669',
    beneficiaryName: 'Acme Corporation',
    amount: 150.50,
    currency: 'EUR',
    variableSymbol: '2026001',
    constantSymbol: '0308',
    paymentNote: 'Invoice #2026001 - Web Development Services',
    dueDate: '2026-02-15',
    swift: 'TATRSKBX',
    originatorReference: 'REF-2026-001',
    beneficiaryAddress: {
      street: 'Business Street 123',
      city: 'Bratislava 81108'
    }
  });

  await writeFile(join(process.cwd(), 'example2-complete.png'), buffer);
  console.log('✓ Generated: example2-complete.png');
  console.log(`  Size: ${buffer.length} bytes\n`);
}

async function example3_donation() {
  console.log('Example 3: Donation (no fixed amount)');
  console.log('='.repeat(60));

  const buffer = await generatePayBySquare({
    iban: 'SK9611000000002918599669',
    beneficiaryName: 'Charity Organization',
    paymentNote: 'Voluntary donation - Thank you for your support!'
    // No amount specified - user can enter any amount
  });

  await writeFile(join(process.cwd(), 'example3-donation.png'), buffer);
  console.log('✓ Generated: example3-donation.png');
  console.log(`  Size: ${buffer.length} bytes\n`);
}

async function example4_customOptions() {
  console.log('Example 4: Custom QR code styling');
  console.log('='.repeat(60));

  const buffer = await generatePayBySquare(
    {
      iban: 'SK9611000000002918599669',
      beneficiaryName: 'Custom Style Shop',
      amount: 99.99,
      paymentNote: 'Order #12345'
    },
    {
      width: 500,              // Larger QR code
      margin: 2,               // Smaller margin
      errorCorrectionLevel: 'H',  // High error correction
      color: {
        dark: '#1E40AF',       // Blue QR code
        light: '#FFFFFF'       // White background
      }
    }
  );

  await writeFile(join(process.cwd(), 'example4-custom.png'), buffer);
  console.log('✓ Generated: example4-custom.png (blue colored, 500x500px)');
  console.log(`  Size: ${buffer.length} bytes\n`);
}

async function example5_fileHelper() {
  console.log('Example 5: Using file helper function');
  console.log('='.repeat(60));

  await generatePayBySquareToFile(
    {
      iban: 'SK9611000000002918599669',
      beneficiaryName: 'Quick Payment',
      amount: 25.00,
      variableSymbol: '777',
      paymentNote: 'Monthly subscription'
    },
    join(process.cwd(), 'example5-file.png')
  );

  console.log('✓ Generated: example5-file.png (using file helper)\n');
}

async function example6_invoice() {
  console.log('Example 6: Invoice payment');
  console.log('='.repeat(60));

  const buffer = await generatePayBySquare({
    iban: 'SK9611000000002918599669',
    beneficiaryName: 'Tech Solutions s.r.o.',
    amount: 1200.00,
    currency: 'EUR',
    variableSymbol: '20260115',  // Invoice number as VS
    constantSymbol: '0308',       // Code for goods and services
    dueDate: '2026-02-01',
    paymentNote: 'Invoice 20260115 - Software License',
    swift: 'TATRSKBX',
    beneficiaryAddress: {
      street: 'Hlavná 45',
      city: 'Bratislava'
    }
  });

  await writeFile(join(process.cwd(), 'example6-invoice.png'), buffer);
  console.log('✓ Generated: example6-invoice.png');
  console.log(`  Size: ${buffer.length} bytes\n`);
}

async function example7_errorHandling() {
  console.log('Example 7: Error handling');
  console.log('='.repeat(60));

  try {
    await generatePayBySquare({
      iban: 'INVALID_IBAN',
      beneficiaryName: 'Test'
    });
  } catch (error) {
    if (error instanceof Error) {
      console.log(`✓ Caught expected error: ${error.name}`);
      console.log(`  Message: ${error.message}\n`);
    }
  }

  try {
    await generatePayBySquare({
      iban: 'SK9611000000002918599669',
      beneficiaryName: 'Test',
      amount: -100  // Negative amount should fail
    });
  } catch (error) {
    if (error instanceof Error) {
      console.log(`✓ Caught expected error: ${error.name}`);
      console.log(`  Message: ${error.message}\n`);
    }
  }

  try {
    await generatePayBySquare({
      iban: 'SK9611000000002918599669',
      beneficiaryName: 'Test',
      variableSymbol: '12345678901'  // Too long (max 10 digits)
    });
  } catch (error) {
    if (error instanceof Error) {
      console.log(`✓ Caught expected error: ${error.name}`);
      console.log(`  Message: ${error.message}\n`);
    }
  }
}

async function example8_multiCurrency() {
  console.log('Example 8: Different currencies');
  console.log('='.repeat(60));

  const currencies = ['EUR', 'USD', 'CZK'];

  for (const currency of currencies) {
    const buffer = await generatePayBySquare({
      iban: 'SK9611000000002918599669',
      beneficiaryName: 'Multi-Currency Merchant',
      amount: 100,
      currency,
      paymentNote: `Payment in ${currency}`
    });

    const filename = `example8-${currency.toLowerCase()}.png`;
    await writeFile(join(process.cwd(), filename), buffer);
    console.log(`✓ Generated: ${filename} (${currency})`);
  }
  console.log();
}

async function example9_decoding() {
  console.log('Example 9: Decoding QR codes');
  console.log('='.repeat(60));

  // Generate a QR code first
  const originalData = {
    iban: 'SK9611000000002918599669',
    beneficiaryName: 'Decode Test',
    amount: 150.50,
    currency: 'EUR',
    variableSymbol: '123456',
    paymentNote: 'Testing decode functionality'
  };

  const qrBuffer = await generatePayBySquare(originalData);

  // Decode it back
  const decoded = await decodePayBySquare(qrBuffer);

  console.log('✓ Original data:');
  console.log(`  IBAN: ${originalData.iban}`);
  console.log(`  Beneficiary: ${originalData.beneficiaryName}`);
  console.log(`  Amount: ${originalData.amount} ${originalData.currency}`);

  console.log('\n✓ Decoded data:');
  console.log(`  IBAN: ${decoded.iban}`);
  console.log(`  Beneficiary: ${decoded.beneficiaryName}`);
  console.log(`  Amount: ${decoded.amount} ${decoded.currency}`);
  console.log(`  Variable Symbol: ${decoded.variableSymbol}`);
  console.log();
}

async function example10_complianceSimple() {
  console.log('Example 10: Simple compliance check');
  console.log('='.repeat(60));

  const validData = {
    iban: 'SK9611000000002918599669',
    beneficiaryName: 'Valid Payment',
    amount: 100,
    currency: 'EUR'
  };

  const invalidData = {
    iban: 'INVALID_IBAN',
    beneficiaryName: 'x'.repeat(71),  // Too long
    amount: -100  // Negative
  };

  console.log('✓ Checking valid data:');
  console.log(`  isCompliant: ${isCompliant(validData)}`);

  console.log('\n✓ Checking invalid data:');
  console.log(`  isCompliant: ${isCompliant(invalidData)}`);
  console.log();
}

async function example11_complianceDetailed() {
  console.log('Example 11: Detailed compliance report');
  console.log('='.repeat(60));

  const testData = {
    iban: 'SK9999999999999999999999',  // Invalid checksum
    beneficiaryName: 'Test',
    amount: -50,  // Negative amount
    variableSymbol: 'ABC123',  // Should be digits only
    swift: 'INVALID'  // Invalid BIC format
  };

  const report = await checkCompliance(testData);

  console.log(`✓ Compliance: ${report.isCompliant}`);
  console.log(`\n✓ Errors (${report.errors.length}):`);
  report.errors.forEach(err => {
    console.log(`  - [${err.severity}] ${err.field}: ${err.message}`);
  });

  console.log(`\n✓ Details:`);
  console.log(`  IBAN valid: ${report.details.ibanValid}`);
  console.log(`  Fields valid: ${report.details.fieldsValid}`);
  console.log(`  Banking standards valid: ${report.details.bankingStandardsValid}`);
  console.log(`  Total issues: ${report.details.totalIssues}`);
  console.log();
}

async function example12_roundTrip() {
  console.log('Example 12: Round-trip verification');
  console.log('='.repeat(60));

  const testData = {
    iban: 'SK9611000000002918599669',
    beneficiaryName: 'Round Trip Test',
    amount: 250.75,
    currency: 'EUR',
    variableSymbol: '123456',
    paymentNote: 'Testing round-trip'
  };

  const result = await verifyRoundTrip(testData);

  console.log(`✓ Round-trip lossless: ${result.isLossless}`);
  console.log(`✓ Differences found: ${result.differences.length}`);

  if (result.differences.length > 0) {
    console.log('\n✓ Differences:');
    result.differences.forEach(diff => {
      console.log(`  - ${diff.field}:`);
      console.log(`    Original: ${diff.original}`);
      console.log(`    Decoded:  ${diff.decoded}`);
    });
  } else {
    console.log('✓ Data perfectly preserved through encode/decode cycle!');
  }
  console.log();
}

async function runAllExamples() {
  console.log('\n');
  console.log('█████████████████████████████████████████████████████████████');
  console.log('█  PayBySquare Generator - Usage Examples                  █');
  console.log('█████████████████████████████████████████████████████████████');
  console.log('\n');

  try {
    await example1_minimal();
    await example2_complete();
    await example3_donation();
    await example4_customOptions();
    await example5_fileHelper();
    await example6_invoice();
    await example7_errorHandling();
    await example8_multiCurrency();
    await example9_decoding();
    await example10_complianceSimple();
    await example11_complianceDetailed();
    await example12_roundTrip();

    console.log('='.repeat(60));
    console.log('✅ All examples completed successfully!');
    console.log('='.repeat(60));
    console.log('\nGenerated files:');
    console.log('  - example1-minimal.png');
    console.log('  - example2-complete.png');
    console.log('  - example3-donation.png');
    console.log('  - example4-custom.png');
    console.log('  - example5-file.png');
    console.log('  - example6-invoice.png');
    console.log('  - example8-eur.png');
    console.log('  - example8-usd.png');
    console.log('  - example8-czk.png');
    console.log('\nYou can scan these QR codes with any PayBySquare-compatible');
    console.log('banking app to test the generated payments.\n');
  } catch (error) {
    console.error('❌ Example failed:', error);
    process.exit(1);
  }
}

// Run all examples
runAllExamples();
