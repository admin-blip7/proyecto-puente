import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🧪 Testing CRM Client Service\n');
console.log('========================================\n');

// Create a test TypeScript file that imports and tests the service
const testCode = `
import { getCRMClients } from '@/lib/services/crmClientService';

async function test() {
    console.log('Calling getCRMClients()...');
    try {
        const clients = await getCRMClients({ limit: 100 });
        console.log('✓ Success! Got clients:', clients.length);
        if (clients.length > 0) {
            console.log('First client:', JSON.stringify(clients[0], null, 2));
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

test();
`;

console.log('Note: Direct TypeScript execution requires additional setup.');
console.log('Instead, check browser console (F12) in the CRM page for actual errors.\n');
console.log('Manual test steps:');
console.log('1. Open browser → F12 (Developer Tools)');
console.log('2. Go to CRM → Gestión de Clientes');
console.log('3. Check Console tab for errors');
console.log('4. Look for "Error loading clients" or network errors\n');

console.log('Alternative: Check server-side logs');
console.log('In Next.js server output, look for:');
console.log('- "[crmClientService]" log messages');
console.log('- Database connection errors');
console.log('- RLS policy errors\n');

console.log('✅ To debug further:');
console.log('- Run: npm run dev');
console.log('- Open browser DevTools Network tab');
console.log('- Filter by "crm_clients" to see REST API calls');
console.log('- Check request/response details');
