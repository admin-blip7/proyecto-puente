// Script SIMPLE para calcular y actualizar totales de sesión manualmente
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateTotals() {
    console.log('🔢 Calculando totales manualmente...\n');

    // 1. Obtener sesión activa
    const { data: sessions } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('status', 'Abierto')
        .limit(1);

    if (!sessions || sessions.length === 0) {
        console.error('❌ No hay sesión activa');
        return;
    }

    const session = sessions[0];
    console.log(`✅ Sesión: ${session.sessionId}\n`);

    // 2. Obtener todas las ventas de la sesión
    const { data: sales } = await supabase
        .from('sales')
        .select('totalAmount, paymentMethod, status')
        .eq('sessionId', session.sessionId);

    if (!sales) {
        console.error('❌ No se pudieron obtener ventas');
        return;
    }

    console.log(`📊 Encontradas ${sales.length} ventas\n`);

    // 3. Calcular totales
    let totalCash = 0;
    let totalCard = 0;

    sales.forEach(sale => {
        const amount = sale.totalAmount || 0;
        const method = sale.paymentMethod || '';
        const status = sale.status;

        // Solo contar ventas completadas o sin status
        if (status === 'completed' || status === null || status === undefined) {
            if (method === 'Efectivo') {
                totalCash += amount;
            } else if (method === 'Tarjeta de Crédito' || method === 'Tarjeta') {
                totalCard += amount;
            }
        }
    });

    const expectedInDrawer = (session.startingFloat || 0) + totalCash - (session.totalCashPayouts || 0);

    console.log('💰 TOTALES CALCULADOS:');
    console.log(`   Ventas en Efectivo: $${totalCash.toFixed(2)}`);
    console.log(`   Ventas con Tarjeta: $${totalCard.toFixed(2)}`);
    console.log(`   Esperado en Caja: $${expectedInDrawer.toFixed(2)}\n`);

    // 4. Actualizar la sesión
    console.log('💾 Actualizando sesión en la BD...\n');

    const { error } = await supabase
        .from('cash_sessions')
        .update({
            totalCashSales: totalCash,
            totalCardSales: totalCard,
            expectedCashInDrawer: expectedInDrawer
        })
        .eq('firestore_id', session.firestore_id);

    if (error) {
        console.error('❌ Error actualizando:', error);
        return;
    }

    console.log('✅ ¡TOTALES ACTUALIZADOS EXITOSAMENTE!\n');
    console.log('🎉 Ahora puedes cerrar el turno y deberías ver:');
    console.log(`   - Ventas en Efectivo: $${totalCash.toFixed(2)}`);
    console.log(`   - Ventas con Tarjeta: $${totalCard.toFixed(2)}`);
    console.log(`   - Efectivo Esperado en Caja: $${expectedInDrawer.toFixed(2)}\n`);
}

updateTotals().catch(console.error);
