// Script TODO-EN-UNO para diagnosticar y reparar el problema actual
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixEverything() {
    console.log('🔧 DIAGNÓSTICO Y REPARACIÓN AUTOMÁTICA\n');
    console.log('='.repeat(60) + '\n');

    // PASO 1: Buscar sesión ACTIVA
    console.log('📋 PASO 1: Buscando sesión activa...\n');
    const { data: activeSessions } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('status', 'Abierto')
        .order('openedAt', { ascending: false });

    if (!activeSessions || activeSessions.length === 0) {
        console.log('❌ NO HAY SESIÓN ACTIVA');
        console.log('   Debes abrir un turno desde el POS primero\n');
        return;
    }

    const session = activeSessions[0];
    console.log(`✅ Sesión activa encontrada:`);
    console.log(`   Session ID: ${session.sessionId || 'NO TIENE'}`);
    console.log(`   Firestore ID: ${session.firestore_id}`);
    console.log(`   Fondo inicial: $${session.startingFloat || 0}\n`);

    if (!session.sessionId) {
        console.log('❌ PROBLEMA: La sesión no tiene sessionId');
        console.log('   Esta sesión se creó incorrectamente. Ciérrala y abre una nueva.\n');
        return;
    }

    // PASO 2: Ver últimas 3 ventas
    console.log('📋 PASO 2: Verificando últimas ventas...\n');
    const { data: recentSales } = await supabase
        .from('sales')
        .select('saleId, totalAmount, paymentMethod, sessionId, items')
        .order('createdAt', { ascending: false })
        .limit(3);

    recentSales?.forEach((sale, idx) => {
        const items = Array.isArray(sale.items) ? sale.items : [];
        const itemName = items[0]?.name || 'Sin nombre';
        console.log(`   ${idx + 1}. ${sale.saleId}: $${sale.totalAmount} (${sale.paymentMethod})`);
        console.log(`      Producto: ${itemName}`);
        console.log(`      Session: ${sale.sessionId || '❌ SIN ASIGNAR'}\n`);
    });

    // PASO 3: Contar ventas de la sesión activa
    const { data: sessionSales } = await supabase
        .from('sales')
        .select('saleId, totalAmount, paymentMethod')
        .eq('sessionId', session.sessionId);

    console.log(`📊 Ventas en la sesión ${session.sessionId}: ${sessionSales?.length || 0}\n`);

    if (!sessionSales || sessionSales.length === 0) {
        // Verificar si hay ventas sin sessionId
        const { data: orphans } = await supabase
            .from('sales')
            .select('saleId, totalAmount')
            .is('sessionId', null)
            .limit(5);

        if (orphans && orphans.length > 0) {
            console.log('⚠️  HAY VENTAS SIN sessionId:');
            orphans.forEach(o => console.log(`   - ${o.saleId}: $${o.totalAmount}`));
            console.log('\n🔧 Asignando estas ventas a la sesión activa...\n');

            const { error } = await supabase
                .from('sales')
                .update({ sessionId: session.sessionId })
                .is('sessionId', null);

            if (error) {
                console.error('❌ Error asignando:', error);
                return;
            }

            console.log('✅ Ventas asignadas exitosamente\n');

            // Volver a obtener las ventas de la sesión
            const { data: updatedSales } = await supabase
                .from('sales')
                .select('totalAmount, paymentMethod')
                .eq('sessionId', session.sessionId);

            sessionSales.length = 0;
            sessionSales.push(...(updatedSales || []));
        } else {
            console.log('⚠️  La sesión activa NO tiene ventas asociadas');
            console.log('   Realiza una venta desde el POS\n');
            return;
        }
    }

    // PASO 4: Calcular totales manualmente
    console.log('📋 PASO 4: Calculando totales...\n');

    let totalCash = 0;
    let totalCard = 0;

    sessionSales.forEach(sale => {
        const amount = sale.totalAmount || 0;
        if (sale.paymentMethod === 'Efectivo') {
            totalCash += amount;
        } else if (sale.paymentMethod === 'Tarjeta de Crédito' || sale.paymentMethod === 'Tarjeta') {
            totalCard += amount;
        }
    });

    const expectedInDrawer = (session.startingFloat || 0) + totalCash - (session.totalCashPayouts || 0);

    console.log(`   💰 Total Efectivo: $${totalCash.toFixed(2)}`);
    console.log(`   💳 Total Tarjeta: $${totalCard.toFixed(2)}`);
    console.log(`   📦 Esperado en Caja: $${expectedInDrawer.toFixed(2)}\n`);

    // PASO 5: Actualizar la sesión
    console.log('📋 PASO 5: Actualizando sesión en BD...\n');

    const { error: updateError } = await supabase
        .from('cash_sessions')
        .update({
            totalCashSales: totalCash,
            totalCardSales: totalCard,
            expectedCashInDrawer: expectedInDrawer
        })
        .eq('firestore_id', session.firestore_id);

    if (updateError) {
        console.error('❌ Error:', updateError);
        return;
    }

    console.log('✅ ¡SESIÓN ACTUALIZADA!\n');
    console.log('='.repeat(60));
    console.log('\n🎉 TOTALES FINALES:\n');
    console.log(`   Ventas en Efectivo: $${totalCash.toFixed(2)}`);
    console.log(`   Ventas con Tarjeta: $${totalCard.toFixed(2)}`);
    console.log(`   Esperado en Caja: $${expectedInDrawer.toFixed(2)}\n`);
    console.log('✅ Ahora puedes cerrar el turno desde el POS y verás estos totales\n');
}

fixEverything().catch(console.error);
