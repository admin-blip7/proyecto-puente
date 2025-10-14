import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function checkLabelSettings() {
  console.log('Checking label design entries...');
  
  // Check for label_design entries
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .like('id', 'label_design%');
    
  if (error) {
    console.error('Error fetching label settings:', error);
    return;
  }
  
  console.log('Found label design entries:', data?.length || 0);
  if (data && data.length > 0) {
    data.forEach(entry => {
      console.log(`- ${entry.id}:`, JSON.stringify(entry, null, 2));
    });
  } else {
    console.log('No label design entries found. This explains the error.');
    
    // Try to create a default label_design_product entry
    console.log('Creating default label_design_product entry...');
    const defaultSettings = {
      id: 'label_design_product',
      width: 51,
      height: 102,
      orientation: 'vertical',
      fontSize: 9,
      barcodeHeight: 30,
      includeLogo: false,
      logoUrl: "",
      storeName: "Nombre de tu Tienda",
      content: {
        showProductName: true,
        showSku: true,
        showPrice: true,
        showStoreName: false,
      },
      lastUpdated: new Date().toISOString(),
    };
    
    const { error: insertError } = await supabase
      .from('settings')
      .insert(defaultSettings);
      
    if (insertError) {
      console.error('Error creating default settings:', insertError);
    } else {
      console.log('✅ Default label settings created successfully');
    }
  }
}

checkLabelSettings().catch(console.error);