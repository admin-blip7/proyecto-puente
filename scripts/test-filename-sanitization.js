#!/usr/bin/env node

/**
 * Script para probar la sanitización de nombres de archivo y resolver StorageApiError
 */

// Función de sanitización que se usa en los servicios
const sanitizeFilename = (filename) => {
  return filename
    .normalize('NFD') // Normalize to decompose accents
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special characters with underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
};

console.log('🧪 Testing Filename Sanitization for StorageApiError Fix');
console.log('=============================================================\n');

// Test cases with problematic filenames
const testCases = [
  'Captura de pantalla 2025-10-23 a la(s) 4.36.44 p.m..png',
  'Comprobante de pago - Octubre 2025.pdf',
  'Recibo con acentos y espacios.pdf',
  'archivo-con-guiones-y_puntos.pdf',
  'archivo@especial#caracteres$.png',
  'archivo..multiples..puntos.pdf',
  '   archivo-con-espacios-al-inicio.pdf',
  'archivo-con-espacios-al-final.pdf   ',
  'archivo_123_456.pdf',
  'normal-file.pdf'
];

console.log('📋 Test Cases:');
testCases.forEach((filename, index) => {
  const sanitized = sanitizeFilename(filename);
  const isProblematic = filename !== sanitized;
  
  console.log(`${index + 1}. Original: "${filename}"`);
  console.log(`   Sanitized: "${sanitized}"`);
  console.log(`   Status: ${isProblematic ? '🔧 Fixed' : '✅ No change'}\n`);
});

console.log('🔍 Problematic Characters Analysis:');
console.log('==================================\n');

// Analyze common problematic characters
const problematicChars = [
  { char: ' ', name: 'Espacio', replacement: '_' },
  { char: 'á', name: 'Acento agudo', replacement: 'a' },
  { char: '@', name: 'Arroba', replacement: '_' },
  { char: '#', name: 'Numeral', replacement: '_' },
  { char: '$', name: 'Dólar', replacement: '_' },
  { char: ' ', name: 'Espacio en medio', replacement: '_' }
];

problematicChars.forEach(({ char, name, replacement }) => {
  const testFilename = `test${char}file.png`;
  const sanitized = sanitizeFilename(testFilename);
  console.log(`${name} (${char}): "${testFilename}" → "${sanitized}"`);
});

console.log('\n✅ StorageApiError Fix Summary:');
console.log('===============================');
console.log('• All service files updated with filename sanitization');
console.log('• PaymentService, DebtPaymentService, and FinanceService fixed');
console.log('• Special characters replaced with underscores');
console.log('• Accents removed using Unicode normalization');
console.log('• Multiple underscores collapsed to single');
console.log('• Leading/trailing underscores removed');

console.log('\n🚀 Next Steps:');
console.log('==============');
console.log('1. Test file uploads with the problematic filename');
console.log('2. Verify no more StorageApiError messages');
console.log('3. Confirm files are stored with clean names in Supabase Storage');