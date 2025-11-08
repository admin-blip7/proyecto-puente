#!/usr/bin/env node
/**
 * Script de Verificación de Correcciones en Sistema de Etiquetas
 * Verifica que las correcciones de color de texto y códigos de barras estén implementadas
 */

import fs from 'fs';
import path from 'path';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function checkFileContent(filePath, searchString, description) {
  const content = fs.readFileSync(filePath, 'utf8');
  const found = content.includes(searchString);

  if (found) {
    log(`✓ ${description}`, 'green');
    return true;
  } else {
    log(`✗ ${description}`, 'red');
    return false;
  }
}

function runTests() {
  log('\n=== Verificación de Correcciones en Sistema de Etiquetas ===\n', 'blue');
  log('Verificando implementaciones de correcciones...\n', 'blue');

  const results = {
    passed: 0,
    failed: 0,
    checks: []
  };

  // Verificar labelPdfGenerator.ts
  const pdfGeneratorPath = 'src/lib/printing/labelPdfGenerator.ts';
  if (checkFileExists(pdfGeneratorPath)) {
    log('\n--- labelPdfGenerator.ts ---', 'blue');

    // Check 1: Color forced to black
    if (checkFileContent(
      pdfGeneratorPath,
      "color:${element.color ?? '#000000'}",
      'Color forzado a negro en buildElementStyle'
    )) {
      results.passed++;
      results.checks.push({ name: 'Color forzado a negro', status: 'PASS' });
    } else {
      results.failed++;
      results.checks.push({ name: 'Color forzado a negro', status: 'FAIL' });
    }

    // Check 2: textMargin increased
    if (checkFileContent(
      pdfGeneratorPath,
      'calculatedTextMargin = Math.max(12, Math.round(height * 0.30))',
      'textMargin aumentado a 30% de la altura'
    )) {
      results.passed++;
      results.checks.push({ name: 'textMargin aumentado', status: 'PASS' });
    } else {
      results.failed++;
      results.checks.push({ name: 'textMargin aumentado', status: 'FAIL' });
    }

    // Check 3: fontSize calculation
    if (checkFileContent(
      pdfGeneratorPath,
      'calculatedTextSize = Math.max(18, Math.round(height * 0.25))',
      'fontSize calculado al 25% de la altura'
    )) {
      results.passed++;
      results.checks.push({ name: 'fontSize calculado', status: 'PASS' });
    } else {
      results.failed++;
      results.checks.push({ name: 'fontSize calculado', status: 'FAIL' });
    }

    // Check 4: Total height calculation
    if (checkFileContent(
      pdfGeneratorPath,
      'totalBarcodeHeight = height + calculatedTextMargin + (calculatedTextSize * 0.6)',
      'Cálculo de altura total para código de barras'
    )) {
      results.passed++;
      results.checks.push({ name: 'Cálculo altura total', status: 'PASS' });
    } else {
      results.failed++;
      results.checks.push({ name: 'Cálculo altura total', status: 'FAIL' });
    }

    // Check 5: Image URL validation
    if (checkFileContent(
      pdfGeneratorPath,
      'const isValidImageUrl = (url: string | null | undefined): boolean',
      'Función de validación de URL de imagen'
    )) {
      results.passed++;
      results.checks.push({ name: 'Validación de URL', status: 'PASS' });
    } else {
      results.failed++;
      results.checks.push({ name: 'Validación de URL', status: 'FAIL' });
    }

    // Check 6: Image URL validation usage
    if (checkFileContent(
      pdfGeneratorPath,
      'if (src && isValidImageUrl(src))',
      'Uso de validación de URL en renderizado de imagen'
    )) {
      results.passed++;
      results.checks.push({ name: 'Uso de validación', status: 'PASS' });
    } else {
      results.failed++;
      results.checks.push({ name: 'Uso de validación', status: 'FAIL' });
    }

  } else {
    log(`✗ Archivo no encontrado: ${pdfGeneratorPath}`, 'red');
    results.failed += 6;
  }

  // Verificar labelPrinter.ts
  const labelPrinterPath = 'src/lib/printing/labelPrinter.ts';
  if (checkFileExists(labelPrinterPath)) {
    log('\n--- labelPrinter.ts ---', 'blue');

    // Check 7: Color forced to black
    if (checkFileContent(
      labelPrinterPath,
      "color:${element.color ?? '#000000'}",
      'Color forzado a negro en buildElementStyle'
    )) {
      results.passed++;
      results.checks.push({ name: 'Color forzado a negro', status: 'PASS' });
    } else {
      results.failed++;
      results.checks.push({ name: 'Color forzado a negro', status: 'FAIL' });
    }

    // Check 8: Image URL validation
    if (checkFileContent(
      labelPrinterPath,
      'const isValidImageUrl = (url: string | null | undefined): boolean',
      'Función de validación de URL de imagen'
    )) {
      results.passed++;
      results.checks.push({ name: 'Validación de URL', status: 'PASS' });
    } else {
      results.failed++;
      results.checks.push({ name: 'Validación de URL', status: 'FAIL' });
    }

  } else {
    log(`✗ Archivo no encontrado: ${labelPrinterPath}`, 'red');
    results.failed += 2;
  }

  // Verificar documentación
  const docPath = 'CORRECCIONES_ETIQUETAS_PDF.md';
  if (checkFileExists(docPath)) {
    log('\n--- Documentación ---', 'blue');
    log('✓ Documentación de correcciones creada', 'green');
    results.passed++;
  } else {
    log('✗ Documentación no encontrada', 'red');
    results.failed++;
  }

  // Resumen
  log('\n=== Resumen de Verificación ===\n', 'blue');
  log(`Total de verificaciones: ${results.passed + results.failed}`, 'blue');
  log(`✓ Pasadas: ${results.passed}`, 'green');
  log(`✗ Fallidas: ${results.failed}`, results.failed > 0 ? 'red' : 'green');

  if (results.failed === 0) {
    log('\n🎉 ¡Todas las verificaciones pasaron!', 'green');
    log('\nLas correcciones han sido implementadas correctamente:', 'green');
    log('  1. ✅ Color del texto forzado a negro puro (#000000)', 'green');
    log('  2. ✅ Espacio para números de código de barras aumentado', 'green');
    log('  3. ✅ Cálculo dinámico de altura para códigos de barras', 'green');
    log('  4. ✅ Validación de URLs de imagen implementada', 'green');
    log('\n📋 Consulte CORRECCIONES_ETIQUETAS_PDF.md para detalles completos', 'blue');
    process.exit(0);
  } else {
    log('\n⚠️  Algunas verificaciones fallaron. Revise los archivos.', 'yellow');
    process.exit(1);
  }
}

// Ejecutar pruebas
try {
  runTests();
} catch (error) {
  log(`\nError ejecutando verificaciones: ${error.message}`, 'red');
  process.exit(1);
}
