// Script de diagnóstico para verificar sesión de caja y ventas
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Faltan variables de entorno');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log('🔍 Diagnóstico de Sesión de Caja y Ventas\n');
    console.log('='.repeat(60));

    // 1. Buscar sesión activa
    console.log('\n📋 1. SESIONES ACTIVAS:');
    const { data: sessions, error: sessionsError } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('status', 'Abierto')
        .order('openedAt', { ascending: false })
        .limit(3);

    if (sessionsError) {
        console.error('❌ Error:', sessionsError);
    } else if (!sessions || sessions.length === 0) {
        console.log('⚠️  No hay sesiones activas');
    } else {
        sessions.forEach(s => {
            console.log(`\n  Sesión: ${s.session_id}`);
            console.log(`  Firestore ID: ${s.firestore_id}`);
            console.log(`  Fondo Inicial: $${s.starting_float || 0}`);
            console.log(`  Ventas Efectivo: $${s.total_cash_sales || 0}`);
            console.log(`  Ventas Tarjeta: $${s.total_card_sales || 0}`);
            console.log(`  Gastos: $${s.total_cash_payouts || 0}`);
            console.log(`  Esperado en Caja: $${s.expected_cash_in_drawer || 0}`);
            console.log(`  Abierta: ${s.opened_at}`);
        });
    }

    // 2. Buscar ventas recientes
    console.log('\n\n📋 2. VENTAS RECIENTES (últimas 5):');
    const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(5);

    if (salesError) {
        console.error('❌ Error:', salesError);
    } else if (!sales || sales.length === 0) {
        console.log('⚠️  No hay ventas registradas');
    } else {
        sales.forEach(s => {
            console.log(`\n  Venta: ${s.sale_id || s.saleId}`);
            console.log(`  Total: $${s.total_amount || s.totalAmount}`);
            console.log(`  Método: ${s.payment_method || s.paymentMethod}`);
            console.log(`  SessionID: ${s.session_id || 'NO ASIGNADO'}`);
            console.log(`  Status: ${s.status || 'NULL'}`);
            console.log(`  Fecha: ${s.created_at || s.createdAt}`);
        });
    }

    // 3. Si hay sesión activa, buscar sus ventas
    if (sessions && sessions.length > 0) {
        const activeSession = sessions[0];
        console.log(`\n\n📋 3. VENTAS DE LA SESIÓN ACTIVA (${activeSession.session_id}):`);

        const { data: sessionSales, error: sessionSalesError } = await supabase
            .from('sales')
            .select('*')
            .eq('session_id', activeSession.session_id)
            .order('createdAt', { ascending: false });

        if (sessionSalesError) {
            console.error('❌ Error:', sessionSalesError);
        } else if (!sessionSales || sessionSales.length === 0) {
            console.log('⚠️  La sesión NO tiene ventas asociadas');
            console.log('\n🔧 POSIBLE PROBLEMA: Las ventas no tienen el session_id correcto');
        } else {
            console.log(`✅ Encontradas ${sessionSales.length} ventas:`);

            let totalEfectivo = 0;
            let totalTarjeta = 0;

            sessionSales.forEach(s => {
                const amount = s.total_amount || s.totalAmount || 0;
                const method = s.payment_method || s.paymentMethod || '';
                const status = s.status || 'NULL';

                console.log(`\n  - ${s.sale_id || s.saleId}: $${amount} (${method}) [${status}]`);

                if (method === 'Efectivo' && (status === 'completed' || status === null)) {
                    totalEfectivo += amount;
                }
                if ((method === 'Tarjeta' || method === 'Tarjeta de Crédito') && (status === 'completed' || status === null)) {
                    totalTarjeta += amount;
                }
            });

            console.log(`\n  💰 TOTALES CALCULADOS MANUALMENTE:`);
            console.log(`     Efectivo: $${totalEfectivo}`);
            console.log(`     Tarjeta: $${totalTarjeta}`);

            console.log(`\n  📊 TOTALES EN LA SESIÓN (desde DB):`);
            console.log(`     Efectivo: $${activeSession.total_cash_sales || 0}`);
            console.log(`     Tarjeta: $${activeSession.total_card_sales || 0}`);

            if (totalEfectivo !== (activeSession.total_cash_sales || 0) ||
                totalTarjeta !== (activeSession.total_card_sales || 0)) {
                console.log(`\n  ❌ DISCREPANCIA DETECTADA!`);
                console.log(`     La función update_cash_session_totals_by_session no se está ejecutando`);
            } else {
                console.log(`\n  ✅ Los totales coinciden`);
            }
        }

        // 4. Intentar ejecutar la función manualmente
        console.log(`\n\n📋 4. EJECUTANDO FUNCIÓN update_cash_session_totals_by_session:`);
        const { data: result, error: rpcError } = await supabase.rpc('update_cash_session_totals_by_session', {
            session_id_param: activeSession.firestore_id
        });

        if (rpcError) {
            console.error('❌ Error ejecutando la función:', rpcError);
            console.log('\n🔧 DIAGNÓSTICO: La función no existe o tiene errores');
        } else {
            console.log('✅ Función ejecutada exitosamente');

            // Verificar los totales actualizados
            const { data: updatedSession } = await supabase
                .from('cash_sessions')
                .select('total_cash_sales, total_card_sales, expected_cash_in_drawer')
                .eq('firestore_id', activeSession.firestore_id)
                .single();

            if (updatedSession) {
                console.log('\n📊 TOTALES DESPUÉS DE EJECUTAR LA FUNCIÓN:');
                console.log(`   Efectivo: $${updatedSession.total_cash_sales || 0}`);
                console.log(`   Tarjeta: $${updatedSession.total_card_sales || 0}`);
                console.log(`   Esperado en Caja: $${updatedSession.expected_cash_in_drawer || 0}`);
            }
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Diagnóstico completado\n');
}

diagnose().catch(console.error);
