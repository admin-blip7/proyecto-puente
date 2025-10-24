// Script para ejecutar todas las soluciones en orden secuencial
const { execSync, spawn } = require('child_process');
const path = require('path');

console.log('🚀 Ejecutando Solución Completa de Problemas de Consignadores');
console.log('==============================================================\n');

async function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n${description}`);
    console.log('='.repeat(description.length + 2));
    
    const child = spawn(command, { shell: true, stdio: 'inherit' });
    
    child.on('exit', (code) => {
      if (code === 0) {
        console.log(`✅ ${description} completado\n`);
        resolve();
      } else {
        console.log(`❌ ${description} falló con código ${code}\n`);
        reject(new Error(`Command failed with code ${code}`));
      }
    });
    
    child.on('error', (err) => {
      console.log(`💥 ${description} falló con error: ${err.message}\n`);
      reject(err);
    });
  });
}

async function runFixSequentially() {
  try {
    console.log('📋 Secuencia de ejecución:');
    console.log('1. Verificar configuración antes de aplicar la solución');
    console.log('2. Probar la solución con datos de ejemplo');
    console.log('3. Aplicar la solución completa');
    console.log('4. Verificar resultados finales\n');

    // Paso 1: Verificar configuración
    await runCommand('node scripts/verify-products-before-fix.js', '🔍 Verificando configuración de productos');
    
    // Pausa para revisar resultados
    console.log('⚠️  Revisa los resultados de verificación antes de continuar...');
    console.log('Press Enter para continuar o Ctrl+C para cancelar...');
    
    // Leer entrada del usuario
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    await new Promise(resolve => rl.question('', () => resolve()));
    rl.close();
    
    // Paso 2: Probar con datos de ejemplo
    await runCommand('node scripts/test-fix-with-samples.js', '🧪 Probando solución con datos de ejemplo');
    
    // Paso 3: Aplicar solución completa
    console.log('⚠️  ATENCIÓN: A continuación se aplicará la solución completa');
    console.log('⚠️  Esto modificará datos en tu base de datos');
    console.log('Press Enter para continuar o Ctrl+C para cancelar...');
    
    const rl2 = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    await new Promise(resolve => rl2.question('', () => resolve()));
    rl2.close();
    
    await runCommand('node scripts/fix-all-consignor-balances.js', '🔧 Aplicando solución completa');
    
    // Paso 4: Verificar resultados finales
    await runCommand('node scripts/verify-products-before-fix.js', '✅ Verificando resultados finales');
    
    console.log('🎉 Solución completa aplicada exitosamente!');
    console.log('\n📋 Resumen de lo que se ha solucionado:');
    console.log('   ✅ Productos de consignación sin consignor_id');
    console.log('   ✅ Productos con consignor_id inválido');
    console.log('   ✅ Balances de consignadores incorrectos');
    console.log('   ✅ Ventas sin consignorId en items');
    console.log('   ✅ Actualización de balances en tiempo real');
    
    console.log('\n💡 Próximos pasos recomendados:');
    console.log('   1. Verifica los balances de los consignadores en la interfaz');
    console.log('   2. Realiza una venta de prueba con productos de consignación');
    console.log('   3. Confirma que el balance del consignador se actualiza correctamente');
    console.log('   4. Monitorea el sistema durante las próximas 24-48 horas');
    
  } catch (error) {
    console.error('💥 Error durante la ejecución:', error.message);
    console.log('\n🔧 Para solucionar este error:');
    console.log('   1. Verifica la configuración de Supabase');
    console.log('   2. Revisa los logs de error');
    console.log('   3. Ejecuta los scripts individualmente para identificar el problema');
    process.exit(1);
  }
}

// Ejecutar la secuencia
runFixSequentially().then(() => {
  console.log('\n🏁 Proceso completado exitosamente');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});