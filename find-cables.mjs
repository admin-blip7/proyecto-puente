// Buscar las ventas de cables auxiliares y asignarlas a la sesión correcta
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findAndAssignCables() {
    console.log('🔍 BUSCANDO VENTAS DE CABLES AUXILIARES\n');

    // 1. Buscar sesión activa
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
    console.log(`✅ Sesión activa: ${session.sessionId}`);
    console.log(`   Firestore ID: ${session.firestore_id}`);
    console.log(`   Fondo inicial: $${session.startingFloat || 0}\n`);

    // 2. Buscar ventas recientes que mencionen "cable" o "auxiliar"
    const { data: allRecentSales } = await supabase
        .from('sales')
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(20);

    console.log('📋 Últimas 20 ventas (buscando cables/auxiliares):\n');

    const cablesSales = [];

    allRecentSales?.forEach((sale, idx) => {
        const items = Array.isArray(sale.items) ? sale.items : [];
        const itemName = items[0]?.name?.toLowerCase() || '';
        const isCable = itemName.includes('cable') || itemName.includes('auxiliar') || itemName.includes('aux');

        if (idx < 10) {  // Mostrar las primeras 10
            console.log(`${idx + 1}. ${sale.saleId}: $${sale.totalAmount} ${isCable ? '🔌' : ''}`);
            console.log(`   ${items[0]?.name || 'Sin nombre'}`);
            console.log(`   Session: ${sale.sessionId || '❌ SIN ASIGNAR'}\n`);
        }

        if (isCable) {
            cablesSales.push(sale);
        }
    });

    console.log(`\n🔌 Encontradas ${cablesSales.length} ventas de cables/auxiliares\n`);

    if (cablesSales.length === 0) {
        console.log('⚠️  No se encontraron cables. Mostrando TODAS las ventas sin sessionId:\n');

        const { data: orphans } = await supabase
            .from('sales')
            .select('*')
            .is('sessionId', null)
            .order('createdAt', { ascending: false })
            .limit(5);

        orphans?.forEach((sale, idx) => {
            const items = Array.isArray(sale.items) ? sale.items : [];
            console.log(`${idx + 1}. ${sale.saleId}: $${sale.totalAmount}`);
            console.log(`   ${items[0]?.name || 'Sin nombre'}\n`);
        });

        return;
    }

    // Mostrar las ventas de cables encontradas
    console.log('Detalles de ventas de cables:');
    cablesSales.forEach((sale, idx) => {
        const items = Array.isArray(sale.items) ? sale.items : [];
        const date = new Date(sale.createdAt);
        console.log(`\n${idx + 1}. ${sale.saleId}`);
        console.log(`   Producto: ${items[0]?.name}`);
        console.log(`   Precio: $${sale.totalAmount}`);
        console.log(`   Fecha: ${date.toLocaleString('es-MX')}`);
        console.log(`   Session actual: ${sale.sessionId || 'SIN ASI GNAR'}`);
    });

    // Calcular total
    const total = cablesSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    console.log(`\n💰 Total de ${cablesSales.length} cables: $${total.toFixed(2)}\n`);

    console.log('🔧 ¿Asignar estas ventas a la sesión activa?\n');

    // Asignar SOLO si hay cables
    if (cablesSales.length > 0) {
        const cableIds = cablesSales.map(s => s.saleId);

        const { error } = await supabase
            .from('sales')
            .update({ sessionId: session.sessionId })
            .in('saleId', cableIds);

        if (error) {
            console.error('❌ Error asignando:', error);
            return;
        }

        console.log('✅ Ventas de cables asignadas a la sesión\n');

        // Actualizar totales
        const { error: updateError } = await supabase
            .from('cash_sessions')
            .update({
                totalCashSales: total,
                totalCardSales: 0,
                expectedCashInDrawer: (session.startingFloat || 0) + total
            })
            .eq('firestore_id', session.firestore_id);

        if (updateError) {
            console.error('❌ Error actualizando totales:', updateError);
            return;
        }

        console.log('✅ ¡TOTALES ACTUALIZADOS!\n');
        console.log('📊 RESUMEN FINAL:');
        console.log(`   Sesión: ${session.sessionId}`);
        console.log(`   Ventas: ${cablesSales.length}`);
        console.log(`   Total: $${total.toFixed(2)}`);
        console.log(`   Esperado en Caja: $${((session.startingFloat || 0) + total).toFixed(2)}\n`);
        console.log('🎉 Ahora puedes cerrar el turno y verás los totales correctos');
    }
}

findAndAssignCables().catch(console.error);
