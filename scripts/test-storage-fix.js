#!/usr/bin/env node

/**
 * Script para probar la solución del StorageApiError con sanitización de objectPath
 */

// Función de sanitización que se usa en documentService.ts
const sanitizeObjectPath = (objectPath) => {
  return objectPath
    .normalize('NFD') // Normalize to decompose accents
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-zA-Z0-9._/-]/g, '_') // Replace special characters with underscores (keeping forward slash for directory structure)
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .replace(/\/+/g, '/'); // Replace multiple slashes with single
};

console.log('🧪 Testing StorageApiError Fix with ObjectPath Sanitization');
console.log('=============================================================\n');

// Test cases with problematic object paths
const testCases = [
  '6400f9c4-e8ef-4f1a-8fa4-ad93c63161cb/PAY-D4A11561-Captura de pantalla 2025-10-23 a la(s) 4.36.44 p.m..png',
  'payment_proofs/6400f9c4-e8ef-4f1a-8fa4-ad93c63161cb/PAY-ABC123-Comprobante con acentos y espacios.pdf',
  'debt_proofs/12345/DEBT-XYZ-archivo@especial#caracteres$.png',
  'receipts/expense_123-receipt with spaces.pdf',
  'normal/path/file.pdf',
  'path/with//double//slashes.pdf',
  '   path/with/leading/underscores.pdf',
  'path/with/trailing/underscores.pdf   '
];

console.log('📋 Test Cases:');
testCases.forEach((objectPath, index) => {
  const sanitized = sanitizeObjectPath(objectPath);
  const isProblematic = objectPath !== sanitized;
  
  console.log(`${index + 1}. Original: "${objectPath}"`);
  console.log(`   Sanitized: "${sanitized}"`);
  console.log(`   Status: ${isProblematic ? '🔧 Fixed' : '✅ No change'}\n`);
});

console.log('🔍 Problematic Characters Analysis:');
console.log('==================================\n');

// Analyze specific problematic characters from the original error
const problematicPath = '6400f9c4-e8ef-4f1a-8fa4-ad93c63161cb/PAY-D4A11561-Captura de pantalla 2025-10-23 a la(s) 4.36.44 p.m..png';
const sanitizedPath = sanitizeObjectPath(problematicPath);

console.log(`Original problematic path: ${problematicPath}`);
console.log(`Sanitized path: ${sanitizedPath}`);
console.log(`\n✅ Characters fixed:`);
console.log('   - Espacios → Guiones bajos');
console.log('   - Acentos → Caracteres ASCII');
console.log('   - Caracteres especiales → Guiones bajos');
console.log('   - Espacios en medio → Guiones bajos');

console.log('\n✅ StorageApiError Fix Summary:');
console.log('===============================');
console.log('• documentService.ts updated with sanitizeObjectPath() function');
console.log('• Object paths are sanitized before storage operations');
console.log('• Special characters replaced with underscores');
console.log('• Accents removed using Unicode normalization');
console.log('• Directory structure preserved with forward slashes');
console.log('• Multiple underscores collapsed to single');

console.log('\n🚀 Next Steps:');
console.log('==============');
console.log('1. Test file upload with the original problematic filename');
console.log('2. Verify no more StorageApiError messages in console');
console.log('3. Confirm files are stored with clean object paths');
console.log('4. Check that public URLs work correctly');

console.log('\n🎯 Expected Result:');
console.log('=================');
console.log('✅ StorageApiError: RESUELTO');
console.log('✅ Archivos subidos exitosamente');
console.log('✅ Nombres de archivo compatibles con Supabase Storage');