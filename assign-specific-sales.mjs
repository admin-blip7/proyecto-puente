// Asignar las 2 ventas específicas a la sesión activa
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function assignSpecificSales() {
    console.log('🔧 ASIGNANDO VENTAS ESPECÍFICAS\n');

    const targetSaleIds = ['SALE-6B2446AF', 'SALE-7D7C47F7'];

    // 1. Obtener sesión activa
    const { data: sessions } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('status', 'Abierto')
        .limit(1);

    if (!sessions || sessions.length === 0) {
        console.log('❌ No hay sesión activa');
        return;
    }

    const session = sessions[0];
    console.log(`✅ Sesión activa: ${session.sessionId}\n`);

    // 2. Buscar las ventas específicas
    const { data: sales } = await supabase
        .from('sales')
        .select('*')
        .in('saleId', targetSaleIds);

    if (!sales || sales.length === 0) {
        console.log('❌ No se encontraron las ventas especificadas');
        return;
    }

    console.log(`✅ Encontradas ${sales.length} ventas:\n`);

    let total = 0;
    sales.forEach(sale => {
        const items = Array.isArray(sale.items) ? sale.items : [];
        const itemName = items[0]?.name || 'Sin nombre';
        console.log(`   ${sale.saleId}: $${sale.totalAmount}`);
        console.log(`   Producto: ${itemName}`);
        console.log(`   Session actual: ${sale.sessionId || 'SIN ASIGNAR'}\n`);
        total += sale.totalAmount || 0;
    });

    console.log(`💰 Total: $${total.toFixed(2)}\n`);

    // 3. LIMPIAR: Quitar TODAS las ventas de esta sesión primero
    console.log('🧹 Limpiando sesión (quitando ventas antiguas)...');
    const { error: clearError } = await supabase
        .from('sales')
        .update({ sessionId: null })
        .eq('sessionId', session.sessionId);

    if (clearError) {
        console.error('❌ Error limpiando:', clearError);
    } else {
        console.log('   ✅ Limpiado\n');
    }

    // 4. Asignar SOLO estas 2 ventas
    console.log('📌 Asignando las 2 ventas correctas...');
    const { error: assignError } = await supabase
        .from('sales')
        .update({ sessionId: session.sessionId })
        .in('saleId', targetSaleIds);

    if (assignError) {
        console.error('❌ Error asignando:', assignError);
        return;
    }
    console.log('   ✅ Ventas asignadas\n');

    // 5. Actualizar totales de la sesión
    console.log('💾 Actualizando totales...');
    const expectedInDrawer = (session.startingFloat || 0) + total;

    const { error: updateError } = await supabase
        .from('cash_sessions')
        .update({
            totalCashSales: total,
            totalCardSales: 0,
            expectedCashInDrawer: expectedInDrawer
        })
        .eq('firestore_id', session.firestore_id);

    if (updateError) {
        console.error('❌ Error:', updateError);
        return;
    }
    console.log('   ✅ Totales actualizados\n');

    console.log('='.repeat(60));
    console.log('✅ ¡COMPLETADO!\n');
    console.log('📊 TOTALES CORRECTOS:');
    console.log(`   Sesión: ${session.sessionId}`);
    console.log(`   Ventas: 2`);
    console.log(`   Total Efectivo: $${total.toFixed(2)}`);
    console.log(`   Fondo Inicial: $${session.startingFloat || 0}`);
    console.log(`   Esperado en Caja: $${expectedInDrawer.toFixed(2)}\n`);
    console.log('🎉 Ahora cierra el turno y verás estos totales correctos');
}

assignSpecificSales().catch(console.error);
