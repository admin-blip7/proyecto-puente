// Script para CORREGIR la asignación incorrecta de ventas
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixIncorrectAssignment() {
    console.log('🔧 CORRIGIENDO ASIGNACIÓN INCORRECTA DE VENTAS\n');

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
    console.log(`Sesión activa: ${session.sessionId}\n`);

    // 2. Ver TODAS las ventas de esta sesión con detalles
    const { data: allSales } = await supabase
        .from('sales')
        .select('saleId, totalAmount, paymentMethod, createdAt, items')
        .eq('sessionId', session.sessionId)
        .order('createdAt', { ascending: false });

    console.log(`Total de ventas en esta sesión: ${allSales?.length || 0}\n`);
    console.log('Últimas 10 ventas de esta sesión:\n');

    allSales?.slice(0, 10).forEach((sale, idx) => {
        const items = Array.isArray(sale.items) ? sale.items : [];
        const itemName = items[0]?.name || 'Sin nombre';
        const date = new Date(sale.createdAt);
        const timeStr = date.toLocaleString('es-MX');

        console.log(`${idx + 1}. ${sale.saleId} - $${sale.totalAmount}`);
        console.log(`   Producto: ${itemName}`);
        console.log(`   Fecha: ${timeStr}\n`);
    });

    console.log('\n🤔 ¿Cuántas de estas ventas son de ESTA sesión?');
    console.log('   El usuario dice que solo debe haber 2 ventas (cables auxiliares)\n');

    // 3. Buscar las ventas de cables auxiliares
    const cablesSales = allSales?.filter(sale => {
        const items = Array.isArray(sale.items) ? sale.items : [];
        const itemName = items[0]?.name?.toLowerCase() || '';
        return itemName.includes('cable') || itemName.includes('auxiliar') || itemName.includes('aux');
    });

    console.log(`📋 Ventas que parecen ser cables/auxiliares: ${cablesSales?.length || 0}\n`);
    cablesSales?.forEach(sale => {
        const items = Array.isArray(sale.items) ? sale.items : [];
        console.log(`   - ${sale.saleId}: $${sale.totalAmount} (${items[0]?.name})`);
    });

    // 4. Calcular totales SOLO de las ventas de cables
    if (cablesSales && cablesSales.length > 0) {
        const totalCables = cablesSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
        console.log(`\n💰 Total de cables: $${totalCables.toFixed(2)}\n`);

        console.log('🔧 LIMPIAR ventas incorrectas y dejar solo las correctas...\n');

        // Obtener IDs de las ventas de cables
        const cableIds = cablesSales.map(s => s.saleId);

        // Quitar sessionId de TODAS las ventas de esta sesión
        console.log('1. Quitando sessionId de todas las ventas...');
        const { error: clearError } = await supabase
            .from('sales')
            .update({ sessionId: null })
            .eq('sessionId', session.sessionId);

        if (clearError) {
            console.error('❌ Error:', clearError);
            return;
        }
        console.log('   ✅ Limpiado\n');

        // Asignar sessionId SOLO a las ventas de cables
        console.log('2. Asignando sessionId solo a las ventas de cables...');
        const { error: assignError } = await supabase
            .from('sales')
            .update({ sessionId: session.sessionId })
            .in('saleId', cableIds);

        if (assignError) {
            console.error('❌ Error:', assignError);
            return;
        }
        console.log('   ✅ Asignado\n');

        // Actualizar totales de la sesión
        console.log('3. Actualizando totales de la sesión...');
        const { error: updateError } = await supabase
            .from('cash_sessions')
            .update({
                totalCashSales: totalCables,
                totalCardSales: 0,
                expectedCashInDrawer: (session.startingFloat || 0) + totalCables
            })
            .eq('firestore_id', session.firestore_id);

        if (updateError) {
            console.error('❌ Error:', updateError);
            return;
        }
        console.log('   ✅ Actualizado\n');

        console.log('✅ ¡CORRECCIÓN COMPLETADA!\n');
        console.log('📊 TOTALES CORRECTOS:');
        console.log(`   Ventas: ${cablesSales.length}`);
        console.log(`   Total Efectivo: $${totalCables.toFixed(2)}`);
        console.log(`   Esperado en Caja: $${((session.startingFloat || 0) + totalCables).toFixed(2)}\n`);
    } else {
        console.log('⚠️  No se encontraron ventas de cables. Mostrando todas las ventas para revisión manual.\n');
    }
}

fixIncorrectAssignment().catch(console.error);
