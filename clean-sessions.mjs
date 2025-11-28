// Limpiar TODAS las ventas incorrectas y dejar solo las 2 correctas
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanAllSessions() {
    console.log('🧹 LIMPIEZA COMPLETA - Dejando solo las 2 ventas correctas\n');

    const correctSales = ['SALE-6B2446AF', 'SALE-7D7C47F7'];

    // 1. Ver TODAS las sesiones abiertas
    const { data: openSessions } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('status', 'Abierto');

    console.log(`📋 Sesiones abiertas: ${openSessions?.length || 0}\n`);
    openSessions?.forEach(s => {
        console.log(`   - ${s.sessionId} (${s.firestore_id})`);
    });
    console.log('');

    // 2. LIMPIAR: Quitar sessionId de TODAS las ventas excepto las 2 correctas
    console.log('🗑️  Paso 1: Quitando sessionId de TODAS las ventas antiguas...');

    const { error: clearAllError } = await supabase
        .from('sales')
        .update({ sessionId: null })
        .not('saleId', 'in', `(${correctSales.map(s => `'${s}'`).join(',')})`);

    if (clearAllError) {
        console.error('❌ Error:', clearAllError);
        return;
    }
    console.log('   ✅ Ventas antiguas limpiadas\n');

    // 3. Asignar las 2 ventas correctas a la sesión activa
    if (openSessions && openSessions.length > 0) {
        const activeSession = openSessions[0];

        console.log(`📌 Paso 2: Asignando las 2 ventas correctas a ${activeSession.sessionId}...`);

        const { error: assignError } = await supabase
            .from('sales')
            .update({ sessionId: activeSession.sessionId })
            .in('saleId', correctSales);

        if (assignError) {
            console.error('❌ Error:', assignError);
            return;
        }
        console.log('   ✅ Ventas correctas asignadas\n');

        // 4. Actualizar totales de la sesión activa
        console.log('💾 Paso 3: Actualizando totales...');

        const { error: updateError } = await supabase
            .from('cash_sessions')
            .update({
                totalCashSales: 70.00,
                totalCardSales: 0,
                expectedCashInDrawer: (activeSession.startingFloat || 0) + 70.00
            })
            .eq('firestore_id', activeSession.firestore_id);

        if (updateError) {
            console.error('❌ Error:', updateError);
            return;
        }
        console.log('   ✅ Totales actualizados\n');

        // 5. LIMPIAR totales de otras sesiones abiertas
        for (const session of openSessions) {
            if (session.firestore_id !== activeSession.firestore_id) {
                console.log(`🧹 Limpiando totales de sesión ${session.sessionId}...`);
                await supabase
                    .from('cash_sessions')
                    .update({
                        totalCashSales: 0,
                        totalCardSales: 0,
                        expectedCashInDrawer: session.startingFloat || 0
                    })
                    .eq('firestore_id', session.firestore_id);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ LIMPIEZA COMPLETADA\n');
        console.log('📊 ESTADO FINAL:');
        console.log(`   Sesión activa: ${activeSession.sessionId}`);
        console.log(`   Ventas asignadas: 2 (SALE-6B2446AF, SALE-7D7C47F7)`);
        console.log(`   Total: $70.00`);
        console.log(`   Esperado en Caja: $${(activeSession.startingFloat || 0) + 70.00}\n`);
        console.log('🎉 Ahora cierra el turno y deberías ver solo $70.00');
    }
}

cleanAllSessions().catch(console.error);
