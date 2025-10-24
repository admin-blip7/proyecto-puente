const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please check your environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeConsignmentIssues() {
  console.log('=== Análisis de Problemas de Mercancía en Consigna ===\n');
  
  try {
    // 1. Verificar consignadores
    console.log('1. Analizando consignadores...');
    const { data: consignors, error: consignorError } = await supabase
      .from('consignors')
      .select('*')
      .order('name', { ascending: true });
    
    if (consignorError) {
      console.error('   ✗ Error al obtener consignadores:', consignorError);
      return;
    }
    
    console.log(`   ✓ Se encontraron ${consignors.length} consignadores`);
    
    // 2. Verificar productos en consigna
    console.log('\n2. Analizando productos en consigna...');
    const { data: consignmentProducts, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('ownership_type', 'Consigna');
    
    if (productError) {
      console.error('   ✗ Error al obtener productos en consigna:', productError);
      return;
    }
    
    console.log(`   ✓ Se encontraron ${consignmentProducts.length} productos en consigna`);
    
    // 3. Verificar productos con consignorId nulo o vacío
    console.log('\n3. Verificando productos con consignorId inválido...');
    const productsWithInvalidConsignor = consignmentProducts.filter(p => 
      !p.consignor_id || p.consignor_id.trim() === ''
    );
    
    if (productsWithInvalidConsignor.length > 0) {
      console.log(`   ⚠ Se encontraron ${productsWithInvalidConsignor.length} productos en consigna sin consignorId válido:`);
      productsWithInvalidConsignor.forEach(p => {
        console.log(`      - ${p.name} (SKU: ${p.sku}, ID: ${p.id})`);
      });
    } else {
      console.log('   ✓ Todos los productos en consigna tienen consignorId válido');
    }
    
    // 4. Verificar productos con consignorId que no existe
    console.log('\n4. Verificando productos con consignorId que no existe...');
    const consignorIds = consignors.map(c => c.id);
    const productsWithNonExistentConsignor = [];
    
    for (const product of consignmentProducts) {
      if (product.consignor_id && !consignorIds.includes(product.consignor_id)) {
        productsWithNonExistentConsignor.push(product);
      }
    }
    
    if (productsWithNonExistentConsignor.length > 0) {
      console.log(`   ⚠ Se encontraron ${productsWithNonExistentConsignor.length} productos con consignorId que no existe:`);
      productsWithNonExistentConsignor.forEach(p => {
        console.log(`      - ${p.name} (SKU: ${p.sku}, ID: ${p.id}, consignorId: ${p.consignor_id})`);
      });
    } else {
      console.log('   ✓ Todos los productos en consigna tienen consignadores válidos');
    }
    
    // 5. Verificar ventas de productos en consigna
    console.log('\n5. Analizando ventas de productos en consigna...');
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(100); // Limitar a las 100 ventas más recientes
    
    if (salesError) {
      console.error('   ✗ Error al obtener ventas:', salesError);
      return;
    }
    
    console.log(`   ✓ Se analizaron ${sales.length} ventas recientes`);
    
    // 6. Verificar ventas con items en consigna que tienen problemas
    console.log('\n6. Verificando ventas con items en consigna problemáticos...');
    let problematicSales = 0;
    
    for (const sale of sales) {
      if (!sale.items || !Array.isArray(sale.items)) continue;
      
      const consignmentItems = sale.items.filter(item => 
        item.consignorId || 
        (item.ownershipType === 'Consigna')
      );
      
      if (consignmentItems.length === 0) continue;
      
      let hasIssues = false;
      const issues = [];
      
      for (const item of consignmentItems) {
        // Verificar si el item tiene consignorId
        if (!item.consignorId || item.consignorId.trim() === '') {
          issues.push(`Item "${item.name}" sin consignorId`);
          hasIssues = true;
        }
        
        // Verificar si el consignorId existe
        if (item.consignorId && !consignorIds.includes(item.consignorId)) {
          issues.push(`Item "${item.name}" con consignorId inexistente: ${item.consignorId}`);
          hasIssues = true;
        }
        
        // Verificar si el item tiene nombre válido
        if (!item.name || item.name.trim() === '' || item.name === 'Producto desconocido') {
          issues.push(`Item sin nombre válido o con "Producto desconocido"`);
          hasIssues = true;
        }
      }
      
      if (hasIssues) {
        problematicSales++;
        console.log(`   ⚠ Venta ${sale.saleId} (${sale.createdAt}):`);
        issues.forEach(issue => console.log(`      - ${issue}`));
      }
    }
    
    if (problematicSales === 0) {
      console.log('   ✓ No se encontraron ventas con items en consigna problemáticos');
    } else {
      console.log(`   ⚠ Se encontraron ${problematicSales} ventas con items en consigna problemáticos`);
    }
    
    // 7. Verificar balances de consignadores
    console.log('\n7. Verificando balances de consignadores...');
    let balanceIssues = 0;
    
    for (const consignor of consignors) {
      // Calcular balance esperado basado en ventas
      let expectedBalance = 0;
      
      for (const sale of sales) {
        if (!sale.items || !Array.isArray(sale.items)) continue;
        
        const consignmentItems = sale.items.filter(item => 
          item.consignorId === consignor.id
        );
        
        for (const item of consignmentItems) {
          const quantity = parseInt(item.quantity) || 1;
          const cost = parseFloat(item.cost) || 0;
          expectedBalance += cost * quantity;
        }
      }
      
      const currentBalance = parseFloat(consignor.balanceDue) || 0;
      const difference = Math.abs(currentBalance - expectedBalance);
      
      if (difference > 0.01) { // Permitir pequeñas diferencias por redondeo
        balanceIssues++;
        console.log(`   ⚠ Consignador ${consignor.name}:`);
        console.log(`      - Balance actual: ${currentBalance}`);
        console.log(`      - Balance esperado: ${expectedBalance}`);
        console.log(`      - Diferencia: ${difference}`);
      }
    }
    
    if (balanceIssues === 0) {
      console.log('   ✓ Todos los balances de consignadores son correctos');
    } else {
      console.log(`   ⚠ Se encontraron ${balanceIssues} consignadores con balance incorrecto`);
    }
    
    console.log('\n=== Análisis Completado ===');
    
    // Resumen
    const totalIssues = productsWithInvalidConsignor.length + 
                       productsWithNonExistentConsignor.length + 
                       problematicSales + 
                       balanceIssues;
    
    if (totalIssues > 0) {
      console.log(`\n⚠ Se encontraron ${totalIssues} problemas en total que requieren atención.`);
    } else {
      console.log('\n✓ No se encontraron problemas significativos en el sistema de consignación.');
    }
    
  } catch (error) {
    console.error('Error durante el análisis:', error);
  }
}

// Ejecutar el análisis
analyzeConsignmentIssues();