import { getSupabaseServerClient } from '../src/lib/supabaseServerClient.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
    console.log('Applying migration to add paidFromAccountId column...');

    const supabase = getSupabaseServerClient();

    const migrationSQL = fs.readFileSync(
        path.join(__dirname, '../supabase/migrations/20251129_add_paid_from_account_id_to_expenses.sql'),
        'utf-8'
    );

    try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

        if (error) {
            console.error('Migration failed:', error);
            process.exit(1);
        }

        console.log('✅ Migration applied successfully!');
        console.log('The paidFromAccountId column has been added to the expenses table.');
    } catch (error) {
        console.error('Error applying migration:', error);
        process.exit(1);
    }
}

applyMigration();
