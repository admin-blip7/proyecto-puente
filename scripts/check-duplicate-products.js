#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
  console.log('🔍 Buscando productos duplicados en la base de datos...');

  try {
    // Obtener todos los productos
    const { data: products, error } = await supabase
      .from('products')
      .select('id, firestore_id, name, sku');

    if (error) {
      console.error('❌ Error al obtener productos:', error);
      return;
    }

    console.log(`📊 Total de productos: ${products.length}`);

    // Buscar IDs duplicados
    const idMap = new Map();
    const duplicates = [];

    products.forEach((product, index) => {
      const id = product.id || product.firestore_id;
      if (!id) {
        duplicates.push({
          type: 'missing_id',
          product,
          index
        });
        return;
      }

      if (idMap.has(id)) {
        duplicates.push({
          type: 'duplicate_id',
          id,
          products: [idMap.get(id), product],
          indices: [idMap.get(id).index, index]
        });
      } else {
        idMap.set(id, { ...product, index });
      }
    });

    // Mostrar resultados
    console.log('\n📋 Resultados:');

    if (duplicates.length === 0) {
      console.log('✅ No se encontraron IDs duplicados');
    } else {
      console.log(`⚠️  Se encontraron ${duplicates.length} problemas:`);

      duplicates.forEach((dup, index) => {
        console.log(`\n${index + 1}. ${dup.type === 'duplicate_id' ? 'ID Duplicado' : 'ID Faltante'}: ${dup.id || 'N/A'}`);

        if (dup.type === 'duplicate_id') {
          console.log(`   Producto 1: ${dup.products[0].name} (índice ${dup.indices[0]})`);
          console.log(`   Producto 2: ${dup.products[1].name} (índice ${dup.indices[1]})`);
        } else {
          console.log(`   Producto: ${dup.product.name} (índice ${dup.index})`);
        }
      });

      console.log('\n🔧 Solución recomendada:');
      console.log('1. Los IDs duplicados han sido manejados en el código con sufijos únicos');
      console.log('2. Considere limpiar la base de datos para eliminar duplicados');
      console.log('3. Verifique que todos los productos tengan un ID válido');
    }

    // Estadísticas adicionales
    const nullIds = products.filter(p => !p.id && !p.firestore_id).length;
    const onlyId = products.filter(p => p.id && !p.firestore_id).length;
    const onlyFirestoreId = products.filter(p => !p.id && p.firestore_id).length;
    const bothIds = products.filter(p => p.id && p.firestore_id).length;

    console.log('\n📈 Estadísticas de IDs:');
    console.log(`   Solo ID: ${onlyId}`);
    console.log(`   Solo Firestore ID: ${onlyFirestoreId}`);
    console.log(`   Ambos IDs: ${bothIds}`);
    console.log(`   Sin ID: ${nullIds}`);

  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

// Ejecutar el diagnóstico
checkDuplicates().then(() => {
  console.log('\n✅ Diagnóstico completado');
}).catch(error => {
  console.error('❌ Error en el diagnóstico:', error);
  process.exit(1);
});