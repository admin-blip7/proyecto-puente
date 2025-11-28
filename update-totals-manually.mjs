// Script para desplegar la función SQL usando el cliente de Supabase
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function deploySqlFunction() {
    console.log('📝 Leyendo función SQL corregida...\n');

    const sqlContent = readFileSync('./scripts/update-cash-session-totals-FIXED-V2.sql', 'utf-8');

    console.log('🚀 Desplegando función en Supabase...\n');

    // Ejecutar el SQL directamente
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sqlContent }).catch(() => {
        // Si exec_sql no existe, intentar con query directa
        return supabase.from('_').select('*').limit(0);
    });

    // Método alternativo: usar la API REST directamente
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            query: sqlContent
        })
    }).catch(e => ({ ok: false, error: e }));

    console.log('\n⚠️  No se puede ejecutar SQL directamente desde Node.js');
    console.log('Por favor ejecuta manualmente en Supabase SQL Editor:\n');
    console.log('1. Ve a: https://supabase.com/dashboard/project/gapocwtsbwtmpmffkmrk/sql');
    console.log('2. Copia el contenido de: scripts/update-cash-session-totals-FIXED-V2.sql');
    console.log('3. Pégalo en el editor y haz click en "Run"\n');

    // Mientras tanto, intentar recalcular con la función actual
    console.log('🔢 Intentando recalcular totales con función actual...\n');

    const { data: sessions } = await supabase
        .from('cash_sessions')
        .select('firestore_id, sessionId')
        .eq('status', 'Abierto')
        .limit(1);

    if (sessions && sessions.length > 0) {
        const session = sessions[0];
        console.log(`Sesión activa: ${session.sessionId}`);
        console.log(`Intentando actualizar totales...\n`);

        // Calcular manualmente
        const { data: sales } = await supabase
            .from('sales')
            .select('totalAmount, paymentMethod')
            .eq('sessionId', session.sessionId);

        if (sales) {
            const totalCash = sales
                .filter(s => s.paymentMethod === 'Efectivo')
                .reduce((sum, s) => sum + (s.totalAmount || 0), 0);

            const totalCard = sales
                .filter(s => s.paymentMethod === 'Tarjeta de Crédito' || s.paymentMethod === 'Tarjeta')
                .reduce((sum, s) => sum + (s.totalAmount || 0), 0);

            console.log('📊 Totales calculados manualmente:');
            console.log(`   Efectivo: $${totalCash}`);
            console.log(`   Tarjeta: $${totalCard}\n`);

            console.log('💾 Guardando totales en la sesión...\n');

            const { error: updateErr } = await supabase
                .from('cash_sessions')
                .update({
                    totalCashSales: totalCash,
                    totalCardSales: totalCard,
                    expectedCashInDrawer: (session.startingFloat || 0) + totalCash - (session.totalCashPayouts || 0)
                })
                .eq('firestore_id', session.firestore_id);

            if (updateErr) {
                console.error('❌ Error:', updateErr);
            } else {
                console.log('✅ ¡Totales actualizados exitosamente!');
                console.log('🎉 Ahora puedes hacer el corte de caja y deberías ver los totales correctos.\n');
            }
        }
    }
}

deploySqlFunction().catch(console.error);
