import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env vars from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('Starting verification...');

    // 1. Get initial balance
    let initialBalance = 0;
    const { data: initialAccount } = await supabase
        .from('accounts')
        .select('*')
        .eq('name', 'Repairs')
        .single();

    if (initialAccount) {
        initialBalance = Number(initialAccount.current_balance);
        console.log(`Initial Repairs Account Balance: ${initialBalance}`);
    } else {
        console.log('Repairs account does not exist yet.');
    }

    // 2. Create a dummy repair order
    const repairId = `TEST-${Date.now()}`;
    const profit = 150;

    const { data: repair, error: createError } = await supabase
        .from('repair_orders')
        .insert({
            firestore_id: repairId,
            orderId: repairId,
            status: 'Recibido',
            customerName: 'Test User',
            customerPhone: '1234567890',
            deviceBrand: 'Test Brand',
            deviceModel: 'Test Model',
            reportedIssue: 'Test Issue',
            profit: profit,
            totalPrice: 200,
            laborCost: 50,
            partsUsed: [],
            createdAt: new Date().toISOString()
        })
        .select()
        .single();

    if (createError) {
        console.error('Error creating repair:', createError);
        return;
    }
    console.log(`Created repair order: ${repairId} with profit: ${profit}`);

    // 3. Call the API to complete it
    console.log('Calling API to complete repair...');
    try {
        const response = await fetch('http://localhost:3000/api/repairs/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId: repairId,
                status: 'Completado'
            })
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('API Error:', response.status, text);
            console.log('Make sure the SQL migration has been applied!');
        } else {
            const updatedRepair = await response.json();
            console.log('API response success. Status:', updatedRepair.status);
        }
    } catch (e) {
        console.error('Error calling API:', e);
    }

    // 4. Check Account Balance
    console.log('Checking Repairs account balance...');
    const { data: finalAccount, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .eq('name', 'Repairs')
        .single();

    if (accountError) {
        console.error('Error fetching account:', accountError);
    } else {
        const finalBalance = Number(finalAccount.current_balance);
        console.log(`Final Repairs Account Balance: ${finalBalance}`);

        if (finalBalance === initialBalance + profit) {
            console.log('SUCCESS: Profit was added correctly.');
        } else {
            console.log(`WARNING: Balance mismatch. Expected ${initialBalance + profit}, got ${finalBalance}.`);
        }
    }

    // Cleanup
    console.log('Cleaning up test repair order...');
    await supabase.from('repair_orders').delete().eq('firestore_id', repairId);
}

verify();
