
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { v4 as uuidv4 } from "uuid";

async function backfillSessionIncomes() {
    const supabase = getSupabaseServerClient();
    console.log("--- Backfilling Session Incomes ---");

    // 1. Find Caja Chica Account
    const { data: accounts, error: accountError } = await supabase
        .from("accounts")
        .select("id, firestore_id, name")
        .ilike("name", "%Caja Chica%")
        .limit(1);

    if (accountError || !accounts || accounts.length === 0) {
        console.error("Caja Chica account not found:", accountError);
        return;
    }

    const cajaChica = accounts[0];
    const accountId = cajaChica.firestore_id || cajaChica.id;
    console.log(`Target Account: ${cajaChica.name} (ID: ${accountId})`);

    // 2. Fetch Closed Sessions
    const { data: sessions, error: sessionError } = await supabase
        .from("cash_sessions")
        .select("*")
        .eq("status", "Cerrado")
        .gt("actualCashCount", 0);

    if (sessionError) {
        console.error("Error fetching sessions:", sessionError);
        return;
    }

    console.log(`Found ${sessions.length} closed sessions with cash.`);

    // 3. Check for existing incomes and create missing ones
    let createdCount = 0;

    for (const session of sessions) {
        // Check if income exists for this session
        const { data: existingIncome, error: incomeCheckError } = await supabase
            .from("incomes")
            .select("id")
            .eq("sessionId", session.sessionId)
            .maybeSingle();

        if (existingIncome) {
            console.log(`Session ${session.sessionId}: Income already exists.`);
            continue;
        }

        // Create Income
        const amount = Number(session.actualCashCount);
        const incomeId = `INC-AUTO-${session.sessionId}`;
        const firestoreId = uuidv4();

        // Helper to handle Firestore timestamps
        const toIso = (val: any): string => {
            if (!val) return new Date().toISOString();
            if (typeof val === 'string') return val;
            if (val._seconds) return new Date(val._seconds * 1000).toISOString();
            return new Date().toISOString();
        };

        // Use session closedAt date or openedAt if closedAt is missing
        const paymentDate = toIso(session.closedAt) || toIso(session.openedAt);

        const payload = {
            firestore_id: firestoreId,
            incomeId,
            description: `Depósito de Corte de Caja (Sesión: ${session.sessionId})`,
            category: "Corte de Caja",
            amount,
            destinationAccountId: accountId,
            source: "Caja",
            paymentDate,
            sessionId: session.sessionId,
            receiptUrl: null
        };

        const { error: insertError } = await supabase
            .from("incomes")
            .insert(payload);

        if (insertError) {
            console.error(`Failed to create income for session ${session.sessionId}:`, insertError);
        } else {
            console.log(`Created income for session ${session.sessionId}: $${amount}`);
            createdCount++;
        }
    }

    console.log(`\nBackfill complete. Created ${createdCount} income records.`);
}

backfillSessionIncomes().catch(console.error);
