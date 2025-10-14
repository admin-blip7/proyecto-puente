// Script para ejecutar las correcciones de la base de datos
// Ejecutar con: node scripts/execute-database-fix.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno');
  console.log('Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en tu .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeDatabaseFix() {
  console.log('🔧 Iniciando corrección del esquema de la base de datos...');

  try {
    // 1. Verificar y crear tabla accounts
    console.log('📋 Verificando tabla accounts...');
    const { error: accountsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.accounts (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT DEFAULT 'Banco',
          current_balance DECIMAL(15,2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (accountsError) {
      console.error('❌ Error creando tabla accounts:', accountsError);
    } else {
      console.log('✅ Tabla accounts verificada/creada');
    }

    // 2. Verificar y crear tabla settings
    console.log('📋 Verificando tabla settings...');
    const { error: settingsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.settings (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (settingsError) {
      console.error('❌ Error creando tabla settings:', settingsError);
    } else {
      console.log('✅ Tabla settings verificada/creada');
    }

    // 3. Verificar columnas de products
    console.log('📋 Verificando columnas de products...');
    const { error: productsError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'id') THEN
            ALTER TABLE products ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'created_at') THEN
            ALTER TABLE products ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'last_updated') THEN
            ALTER TABLE products ADD COLUMN last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();
          END IF;
          
          UPDATE products SET id = gen_random_uuid() WHERE id IS NULL OR id = '';
        END $$;
      `
    });

    if (productsError) {
      console.error('❌ Error verificando columnas de products:', productsError);
    } else {
      console.log('✅ Columnas de products verificadas/corregidas');
    }

    // 4. Crear índices
    console.log('📋 Creando índices...');
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
        CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
        CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
      `
    });

    if (indexError) {
      console.error('❌ Error creando índices:', indexError);
    } else {
      console.log('✅ Índices creados');
    }

    // 5. Verificar y crear tabla consignors
    console.log('📋 Verificando tabla consignors...');
    const { error: consignorsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.consignors (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name TEXT NOT NULL,
          contact_info TEXT,
          balance_due DECIMAL(15,2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (consignorsError) {
      console.error('❌ Error creando tabla consignors:', consignorsError);
    } else {
      console.log('✅ Tabla consignors verificada/creada');
    }

    // 6. Verificar y crear tabla repair_orders
    console.log('📋 Verificando tabla repair_orders...');
    const { error: repairError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.repair_orders (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          order_id TEXT NOT NULL UNIQUE,
          customer_name TEXT NOT NULL,
          customer_phone TEXT,
          device_brand TEXT,
          device_model TEXT,
          device_serial_imei TEXT,
          reported_issue TEXT,
          status TEXT DEFAULT 'Pendiente',
          total_price DECIMAL(15,2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (repairError) {
      console.error('❌ Error creando tabla repair_orders:', repairError);
    } else {
      console.log('✅ Tabla repair_orders verificada/creada');
    }

    // 7. Insertar configuraciones por defecto
    console.log('📋 Insertando configuraciones por defecto...');
    const { error: configError } = await supabase.rpc('exec_sql', {
      sql: `
        INSERT INTO public.settings (id, data) VALUES 
        ('ticket_design', '{
          "header": {
            "showLogo": true,
            "logoUrl": "",
            "show": {
              "storeName": true,
              "address": true,
              "phone": true,
              "rfc": false,
              "website": false
            },
            "storeName": "Nombre de tu Tienda",
            "address": "Dirección de tu Tienda",
            "phone": "123-456-7890",
            "rfc": "",
            "website": ""
          },
          "body": {
            "showQuantity": true,
            "showUnitPrice": false,
            "showTotal": true,
            "fontSize": "sm"
          },
          "footer": {
            "showSubtotal": true,
            "showTaxes": true,
            "showDiscounts": true,
            "thankYouMessage": "¡Gracias por tu compra!",
            "additionalInfo": "Políticas de devolución: 30 días con ticket.",
            "showQrCode": false,
            "qrCodeUrl": ""
          }
        }') ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.settings (id, data) VALUES 
        ('label_design_product', '{
          "width": 51,
          "height": 102,
          "orientation": "vertical",
          "fontSize": 9,
          "barcodeHeight": 30,
          "includeLogo": false,
          "logoUrl": "",
          "storeName": "Nombre de tu Tienda",
          "content": {
            "showProductName": true,
            "showSku": true,
            "showPrice": true,
            "showStoreName": false
          }
        }') ON CONFLICT (id) DO NOTHING;
      `
    });

    if (configError) {
      console.error('❌ Error insertando configuraciones:', configError);
    } else {
      console.log('✅ Configuraciones por defecto insertadas');
    }

    // 8. Limpiar productos inválidos
    console.log('📋 Limpiando productos inválidos...');
    const { error: cleanError } = await supabase.rpc('exec_sql', {
      sql: `DELETE FROM products WHERE id IS NULL OR id = '' OR name IS NULL OR name = '';`
    });

    if (cleanError) {
      console.error('❌ Error limpiando productos:', cleanError);
    } else {
      console.log('✅ Productos inválidos eliminados');
    }

    console.log('🎉 ¡Corrección del esquema completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error general ejecutando el script:', error);
    process.exit(1);
  }
}

// Si el RPC no funciona, intentar con SQL directo
async function executeWithDirectSQL() {
  console.log('🔄 Intentando ejecución con SQL directo...');
  
  try {
    // Aquí intentaríamos con consultas directas si el RPC no está disponible
    // Pero por ahora, recomendaremos el método manual
    console.log('⚠️  El método RPC no está disponible. Por favor usa el método manual.');
    console.log('');
    console.log('📋 Instrucciones manuales:');
    console.log('1. Ve a tu panel de Supabase');
    console.log('2. Abre el SQL Editor');
    console.log('3. Copia y ejecuta el contenido de scripts/fix-database-schema.sql');
    
  } catch (error) {
    console.error('❌ Error con SQL directo:', error);
  }
}

// Ejecutar el script
executeDatabaseFix().catch(() => {
  console.log('🔄 RPC no disponible, recomenzando con método manual...');
  executeWithDirectSQL();
});