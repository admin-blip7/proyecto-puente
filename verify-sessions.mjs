// Verificar y reasignar ventas a la sesión correcta
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndFix() {
    console.log('🔍 Verificando estado de ventas y sesiones...\n');

    // 1. Ver TODAS las sesiones (abiertas y cerradas)
    const { data: sessions } = await supabase
        .from('cash_sessions')
        .select('firestore_id, sessionId, status, openedAt')
        .order('openedAt', { ascending: false })
        .limit(5);

    console.log('📋 Últimas 5 sesiones:');
    sessions?.forEach(s => {
        console.log(`   ${s.status === 'Abierto' ? '🟢' : '🔴'} ${s.sessionId} (${s.status})`);
    });
    console.log('');

    // 2. Ver distribución de ventas
    const { data: salesBySession } = await supabase
        .from('sales')
        .select('sessionId')
        .not('sessionId', 'is', null);

    const counts = {};
    salesBySession?.forEach(s => {
        counts[s.sessionId] = (counts[s.sessionId] || 0) + 1;
    });

    console.log('📊 Ventas por sesión:');
    Object.entries(counts).forEach(([sessionId, count]) => {
        console.log(`   ${sessionId}: ${count} ventas`);
    });
    console.log('');

    // 3. Ver ventas sin sessionId
    const { count: orphanCount } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .is('sessionId', null);

    console.log(`⚠️  Ventas sin sessionId: ${orphanCount}\n`);

    // 4. Pregunta: ¿Qué hacer?
    console.log('🤔 SITUACIÓN:');
    console.log('   - Hay múltiples sesiones');
    console.log('   - Las ventas están asociadas a sesiones antiguas');
    console.log('   - La sesión activa NO tiene ventas\n');

    console.log('💡 SOLUCIONES POSIBLES:\n');
    console.log('A) Usar una sesión antigua que tenga ventas (CS-3CEAEAB6 con 192 ventas)');
    console.log('   - Puedes cerrar esa sesión para ver los totales');
    console.log('   - Comando: Cerrar sesión CS-3CEAEAB6 desde el POS\n');

    console.log('B) Mover las 192 ventas de CS-3CEAEAB6 a la sesión activa actual');
    console.log('   - SOLO si esas ventas son de hoy');
    console.log('   - Las ventas se moverán a la sesión: ' + (sessions?.[0]?.sessionId || 'N/A'));
    console.log('');

    // 5. Mostrar las 3 ventas más recientes para verificar fecha
    const { data: recentSales } = await supabase
        .from('sales')
        .select('saleId, totalAmount, createdAt, sessionId')
        .order('createdAt', { ascending: false })
        .limit(3);

    console.log('📅 Últimas 3 ventas:');
    recentSales?.forEach(s => {
        const date = new Date(s.createdAt);
        console.log(`   ${s.saleId}: $${s.totalAmount} (${date.toLocaleString('es-MX')}) → ${s.sessionId || 'SIN SESIÓN'}`);
    });
    console.log('\n');

    console.log('✅ Diagnóstico completo');
    console.log('\n⚠️  RECOMENDACIÓN:');
    console.log('   Si las ventas son de HOY, deberías cerrar la sesión CS-3CEAEAB6');
    console.log('   desde el POS para ver los totales correctos.\n');
}

checkAndFix().catch(console.error);
