// Script para reparar ventas sin sessionId
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Faltan variables de entorno');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSales() {
    console.log('🔧 Reparando ventas sin sessionId...\n');

    // 1. Encontrar sesión activa
    const { data: sessions, error: sessErr } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('status', 'Abierto')
        .order('openedAt', { ascending: false })
        .limit(1);

    if (sessErr || !sessions || sessions.length === 0) {
        console.error('❌ No se encontró sesión activa');
        return;
    }

    const session = sessions[0];
    console.log(`✅ Sesión activa encontrada:`);
    console.log(`   Firestore ID: ${session.firestore_id}`);
    console.log(`   Session ID: ${session.sessionId || 'NO TIENE sessionId'}\n`);

    if (!session.sessionId) {
        console.error('❌ La sesión NO tiene sessionId asignado');
        console.log('   Necesitas cerrar y abrir una nueva sesión');
        return;
    }

    // 2. Contar ventas sin sessionId
    const { count, error: countErr } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .is('sessionId', null);

    if (countErr) {
        console.error('❌ Error contando ventas:', countErr);
        return;
    }

    console.log(`📊 Ventas sin sessionId: ${count}\n`);

    if (count === 0) {
        console.log('✅ No hay ventas por reparar');
    } else {
        // 3. Asignar sessionId a todas las ventas huérfanas
        console.log(`🔧 Asignando sessionId "${session.sessionId}" a ${count} ventas...\n`);

        const { error: updateErr } = await supabase
            .from('sales')
            .update({ sessionId: session.sessionId })
            .is('sessionId', null);

        if (updateErr) {
            console.error('❌ Error asignando sessionId:', updateErr);
            return;
        }

        console.log(`✅ ${count} ventas actualizadas con sessionId\n`);
    }

    // 4. Recalcular totales
    console.log('🔢 Recalculando totales de la sesión...\n');

    const { data: result, error: rpcErr } = await supabase.rpc('update_cash_session_totals_by_session', {
        session_id_param: session.firestore_id
    });

    if (rpcErr) {
        console.error('❌ Error recalculando totales:', rpcErr);
        return;
    }

    // 5. Mostrar totales actualizados
    const { data: updated, error: fetchErr } = await supabase
        .from('cash_sessions')
        .select('totalCashSales, totalCardSales, expectedCashInDrawer')
        .eq('firestore_id', session.firestore_id)
        .single();

    if (!fetchErr && updated) {
        console.log('✅ TOTALES ACTUALIZADOS:');
        console.log(`   Ventas en Efectivo: $${updated.totalCashSales || 0}`);
        console.log(`   Ventas con Tarjeta: $${updated.totalCardSales || 0}`);
        console.log(`   Esperado en Caja: $${updated.expectedCashInDrawer || 0}\n`);

        if ((updated.totalCashSales || 0) > 0 || (updated.totalCardSales || 0) > 0) {
            console.log('🎉 ¡Problema resuelto! Ahora puedes hacer el corte de caja.');
        } else {
            console.log('⚠️  Los totales siguen en 0. Verifica que las ventas tengan el sessionId correcto.');
        }
    }

    console.log('\n✅ Proceso completado');
}

fixSales().catch(console.error);
