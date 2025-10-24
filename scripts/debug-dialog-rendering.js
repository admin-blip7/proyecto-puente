// Script avanzado para depurar problemas de renderizado del diálogo
console.log('🔍 DIAGNÓSTICO AVANZADO: Problemas de Renderizado del Diálogo');
console.log('==========================================================\n');

const fs = require('fs');
const path = require('path');

console.log('📋 ANÁLISIS COMPLETO DEL FLUJO DE RENDERIZADO:');
console.log('');

// Analizar el componente RegisterPaymentDialog
const dialogPath = path.join(__dirname, '../src/components/admin/consignors/RegisterPaymentDialog.tsx');
const dialogContent = fs.readFileSync(dialogPath, 'utf8');

console.log('1. 🔍 VERIFICANDO CONFIGURACIÓN DEL DIÁLOGO:');
console.log('');

// Verificar la configuración del Dialog
if (dialogContent.includes('open={isOpen && !!consignor}')) {
  console.log('   ✅ El diálogo tiene la condición correcta: open={isOpen && !!consignor}');
} else {
  console.log('   ❌ La condición open del diálogo es incorrecta');
}

if (dialogContent.includes('onOpenChange={onOpenChange}')) {
  console.log('   ✅ El diálogo usa onOpenChange directamente');
} else {
  console.log('   ❌ El diálogo no usa onOpenChange correctamente');
}

console.log('');
console.log('2. 🔍 VERIFICANDO MANEJO DE ESTADOS:');
console.log('');

// Verificar el manejo de estados
if (dialogContent.includes('const [loading, setLoading] = useState(false)')) {
  console.log('   ✅ Estado de loading correctamente definido');
} else {
  console.log('   ❌ Problema con el estado loading');
}

if (dialogContent.includes('useEffect(() => {')) {
  console.log('   ✅ Hay efectos secundarios definidos');
  const useEffectMatch = dialogContent.match(/useEffect\(\(\) => \{[\s\S]*?\}, \[.*?\]\)/g);
  if (useEffectMatch) {
    console.log(`   📊 Número de useEffect: ${useEffectMatch.length}`);
    useEffectMatch.forEach((effect, index) => {
      console.log(`      - useEffect ${index + 1}: ${effect.substring(0, 50)}...`);
    });
  }
} else {
  console.log('   ❌ No hay efectos secundarios definidos');
}

console.log('');
console.log('3. 🔍 VERIFICANDO MANEJO DEL CIERRE:');
console.log('');

// Verificar el manejo del cierre
if (dialogContent.includes('handleDialogClose')) {
  console.log('   ✅ Función handleDialogClose definida');
  if (dialogContent.includes('setTimeout(() => {')) {
    console.log('   ✅ Usa setTimeout para el reseteo del formulario');
  } else {
    console.log('   ⚠️  No usa setTimeout para el reseteo');
  }
} else {
  console.log('   ❌ No hay función handleDialogClose');
}

// Verificar el onSubmit
if (dialogContent.includes('const onSubmit = async')) {
  console.log('   ✅ Función onSubmit definida');
  if (dialogContent.includes('onOpenChange(false)')) {
    console.log('   ✅ Usa onOpenChange(false) para cerrar');
  } else {
    console.log('   ❌ No usa onOpenChange(false) correctamente');
  }
} else {
  console.log('   ❌ No hay función onSubmit');
}

console.log('');
console.log('4. 🔍 VERIFICANDO CONDICIONES DE RENDERIZADO:');
console.log('');

// Verificar condiciones complejas
const conditionalCount = (dialogContent.match(/\{.*&&.*\}/g) || []).length;
const ternaryCount = (dialogContent.match(/\?.*:/g) || []).length;
console.log(`   📊 Condicionales &&: ${conditionalCount}`);
console.log(`   📊 Operadores ternarios: ${ternaryCount}`);

if (conditionalCount > 5) {
  console.log('   ⚠️  Demasiadas condicionales && podrían causar re-renders');
}

if (ternaryCount > 3) {
  console.log('   ⚠️  Demasiados operadores ternarios podrían causar inestabilidad');
}

console.log('');
console.log('5. 🔍 ANALIZANDO COMPONENTE PADRE (ConsignorClient):');
console.log('');

// Analizar el ConsignorClient
const clientPath = path.join(__dirname, '../src/components/admin/consignors/ConsignorClient.tsx');
const clientContent = fs.readFileSync(clientPath, 'utf8');

if (clientContent.includes('const [isPaymentDialogOpen, setPaymentDialogOpen] = useState(false)')) {
  console.log('   ✅ Estado del diálogo correctamente definido en el padre');
} else {
  console.log('   ❌ Problema con el estado del diálogo en el padre');
}

if (clientContent.includes('handlePaymentRegistered')) {
  console.log('   ✅ Función handlePaymentRegistered definida');
  if (clientContent.includes('setTimeout(() => {')) {
    console.log('   ✅ Usa setTimeout para el refresh');
    if (clientContent.includes('if (!isPaymentDialogOpen)')) {
      console.log('   ✅ Verifica que el diálogo esté cerrado antes de refrescar');
    } else {
      console.log('   ⚠️  No verifica si el diálogo está cerrado antes de refrescar');
    }
  } else {
    console.log('   ❌ No usa setTimeout para el refresh');
  }
} else {
  console.log('   ❌ No hay función handlePaymentRegistered');
}

console.log('');
console.log('6. 🔍 VERIFICANDO CONFIGURACIÓN DEL DIÁLOGO UI:');
console.log('');

// Analizar el componente Dialog base
const dialogUIPath = path.join(__dirname, '../src/components/ui/dialog.tsx');
const dialogUIContent = fs.readFileSync(dialogUIPath, 'utf8');

if (dialogUIContent.includes('modal={false}')) {
  console.log('   ✅ Dialog configurado como modal={false}');
} else {
  console.log('   ❌ Dialog no está configurado como modal={false}');
}

if (dialogUIContent.includes('onPointerDownOutside={(e) => e.preventDefault()}')) {
  console.log('   ✅ Previene cierre al hacer clic fuera');
} else {
  console.log('   ❌ No previene cierre al hacer clic fuera');
}

if (dialogUIContent.includes('onOpenAutoFocus={(e) => e.preventDefault()}')) {
  console.log('   ✅ Previene autofocus automático');
} else {
  console.log('   ❌ No previene autofocus automático');
}

console.log('');
console.log('7. 🎯 ANÁLISIS DE PROBLEMAS POTENCIALES:');
console.log('');

const issues = [];

// Verificar problemas comunes
if (clientContent.includes('setTimeout(() => {') && 
    !clientContent.includes('if (!isPaymentDialogOpen)')) {
  issues.push('El refresh de datos podría interferir con el diálogo abierto');
}

if (dialogContent.includes('handleDialogClose(false)') && 
    dialogContent.indexOf('handleDialogClose(false)') < dialogContent.indexOf('onOpenChange(false)')) {
  issues.push('Todavía se usa handleDialogClose en algunos botones');
}

if (conditionalCount > 8) {
  issues.push('Demasiadas condicionales complejas podrían causar inestabilidad');
}

if (dialogContent.includes('form.reset()') && 
    !dialogContent.includes('setTimeout')) {
  issues.push('El reseteo del formulario es inmediato y podría causar problemas');
}

if (issues.length === 0) {
  console.log('🎉 ✅ NO SE ENCONTRARON PROBLEMAS CRÍTICOS');
  console.log('');
  console.log('🔧 Si el diálogo todavía se cierra instantáneamente, las causas podrían ser:');
  console.log('   1. Problemas de estado asíncrono entre padre e hijo');
  console.log('   2. Re-renders causados por cambios en props');
  console.log('   3. Conflictos con el ciclo de vida de React');
  console.log('   4. Problemas con el componente Dialog de Radix UI');
  
} else {
  console.log('❌ PROBLEMAS IDENTIFICADOS:');
  issues.forEach((issue, index) => {
    console.log(`   ${index + 1}. ${issue}`);
  });
}

console.log('');
console.log('📊 ESTADÍSTICAS FINALES:');
console.log(`   - Líneas en RegisterPaymentDialog: ${dialogContent.split('\n').length}`);
console.log(`   - Líneas en ConsignorClient: ${clientContent.split('\n').length}`);
console.log(`   - Condicionales complejas: ${conditionalCount}`);
console.log(`   - Operadores ternarios: ${ternaryCount}`);
console.log(`   - Problemas potenciales: ${issues.length}`);

console.log('');
console.log('🏁 Diagnóstico avanzado completado');