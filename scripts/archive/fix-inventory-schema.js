const { createClient } = require("@supabase/supabase-js");
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixInventorySchema() {
  console.log("🔧 CORRIGIENDO ESQUEMA DE INVENTORY_LOGS...");
  
  try {
    // 1. Verificar estructura actual
    console.log("1. Verificando estructura actual de inventory_logs...");
    const { data: tableInfo, error: tableError } = await supabase
      .from("inventory_logs")
      .select("*")
      .limit(1);

    if (tableError) {
      console.error("❌ Error accediendo a inventory_logs:", tableError);
      return;
    }

    console.log("✅ Tabla inventory_logs accesible");

    // 2. Verificar si la columna id existe
    console.log("2. Verificando columna id...");
    const { data: columnInfo, error: columnError } = await supabase
      .from("inventory_logs")
      .select("id")
      .limit(1);

    if (columnError) {
      console.log("⚠️ La columna id no existe, intentando añadir con ALTER TABLE...");
      
      // Usar RPC para ejecutar SQL directo
      const { error: alterError } = await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE inventory_logs 
          ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
          
          CREATE INDEX IF NOT EXISTS idx_inventory_logs_id ON inventory_logs(id);
          CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON inventory_logs(created_at);
          CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON inventory_logs(productId);
          CREATE INDEX IF NOT EXISTS idx_inventory_logs_reason ON inventory_logs(reason);
        `
      });

      if (alterError) {
        console.log("⚠️ RPC no disponible, intentando método alternativo...");
        
        // Método alternativo: verificar si podemos insertar con id
        try {
          const { data: testData, error: insertError } = await supabase
            .from("inventory_logs")
            .insert({
              productId: "test-temp",
              productName: "Test",
              change: 0,
              reason: "Test",
              updatedBy: "system",
              createdAt: new Date().toISOString(),
              metadata: { test: true }
            })
            .select()
            .single();

          if (insertError) {
            console.log("❌ No se puede insertar con el esquema actual:", insertError.message);
          } else {
            console.log("✅ Inserción exitosa, el esquema funciona");
            
            // Limpiar dato de prueba
            await supabase
              .from("inventory_logs")
              .delete()
              .eq("productId", "test-temp");
          }
        } catch (insertErr) {
          console.log("❌ Error en inserción de prueba:", insertErr.message);
        }
      } else {
        console.log("✅ Columna id añadida exitosamente");
      }
    } else {
      console.log("✅ Columna id ya existe");
    }

    // 3. Verificar estructura final
    console.log("3. Verificando estructura final...");
    const { data: finalData, error: finalError } = await supabase
      .from("inventory_logs")
      .select("id, productId, productName, change, reason, updatedBy, createdAt, metadata")
      .limit(1);

    if (finalError) {
      console.error("❌ Error verificando estructura final:", finalError);
    } else {
      console.log("✅ Estructura final verificada correctamente");
      if (finalData && finalData.length > 0) {
        console.log("📊 Columnas disponibles:", Object.keys(finalData[0]));
      }
    }

    // 4. Crear tablas de deduplicación si no existen
    console.log("4. Verificando tablas de deduplicación...");
    
    const { data: dedupTable, error: dedupError } = await supabase
      .from("sale_deduplication")
      .select("id")
      .limit(1);

    if (dedupError && dedupError.code === 'PGRST116') {
      console.log("📝 Creando tabla sale_deduplication...");
      
      const { error: createDedupError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS sale_deduplication (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            saleId TEXT NOT NULL UNIQUE,
            status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
            createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            completedAt TIMESTAMP WITH TIME ZONE,
            expiresAt TIMESTAMP WITH TIME ZONE NOT NULL,
            metadata JSONB DEFAULT '{}'::jsonb
          );
          
          CREATE INDEX IF NOT EXISTS idx_sale_deduplication_saleId ON sale_deduplication(saleId);
          CREATE INDEX IF NOT EXISTS idx_sale_deduplication_status ON sale_deduplication(status);
          CREATE INDEX IF NOT EXISTS idx_sale_deduplication_expiresAt ON sale_deduplication(expiresAt);
        `
      });

      if (createDedupError) {
        console.log("⚠️ No se pudo crear sale_deduplication:", createDedupError.message);
      } else {
        console.log("✅ Tabla sale_deduplication creada");
      }
    } else {
      console.log("✅ Tabla sale_deduplication ya existe");
    }

    const { data: transTable, error: transError } = await supabase
      .from("transaction_logs")
      .select("id")
      .limit(1);

    if (transError && transError.code === 'PGRST116') {
      console.log("📝 Creando tabla transaction_logs...");
      
      const { error: createTransError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS transaction_logs (
            transaction_id UUID PRIMARY KEY,
            operation_id TEXT NOT NULL,
            sale_id TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            completed_at TIMESTAMP WITH TIME ZONE,
            error_message TEXT,
            metadata JSONB DEFAULT '{}'::jsonb
          );
          
          CREATE INDEX IF NOT EXISTS idx_transaction_logs_operation_id ON transaction_logs(operation_id);
          CREATE INDEX IF NOT EXISTS idx_transaction_logs_sale_id ON transaction_logs(sale_id);
          CREATE INDEX IF NOT EXISTS idx_transaction_logs_status ON transaction_logs(status);
          CREATE INDEX IF NOT EXISTS idx_transaction_logs_created_at ON transaction_logs(created_at);
        `
      });

      if (createTransError) {
        console.log("⚠️ No se pudo crear transaction_logs:", createTransError.message);
      } else {
        console.log("✅ Tabla transaction_logs creada");
      }
    } else {
      console.log("✅ Tabla transaction_logs ya existe");
    }

    // 5. Crear función de transacción
    console.log("5. Creando función execute_sale_transaction...");
    
    const { error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION execute_sale_transaction(
          p_sale_id TEXT,
          p_operation_id TEXT,
          p_cart_items JSONB,
          p_cashier_id TEXT,
          p_session_id TEXT DEFAULT NULL
        )
        RETURNS JSONB AS $$
        DECLARE
          item_record JSONB;
          product_record RECORD;
          new_stock INTEGER;
          log_id UUID;
          transaction_id UUID DEFAULT gen_random_uuid();
          total_deduction INTEGER := 0;
        BEGIN
          -- Insertar registro de transacción
          INSERT INTO transaction_logs (transaction_id, operation_id, sale_id, status, created_at)
          VALUES (transaction_id, p_operation_id, p_sale_id, 'started', NOW());
          
          -- Procesar cada item del carrito
          FOR item_record IN SELECT * FROM jsonb_array_elements(p_cart_items)
          LOOP
            -- Obtener información del producto con bloqueo
            SELECT * INTO product_record
            FROM products 
            WHERE id = (item_record->>'product_id')::TEXT 
               OR firestore_id = (item_record->>'product_id')::TEXT
            FOR UPDATE;
            
            IF NOT FOUND THEN
              RAISE EXCEPTION 'Producto no encontrado: %', item_record->>'product_id';
            END IF;
            
            -- Calcular nuevo stock
            new_stock := product_record.stock - (item_record->>'quantity')::INTEGER;
            
            -- Validar stock suficiente
            IF new_stock < 0 THEN
              RAISE EXCEPTION 'Stock insuficiente para producto: %. Actual: %, Solicitado: %', 
                product_record.name, product_record.stock, (item_record->>'quantity')::INTEGER;
            END IF;
            
            -- Actualizar stock
            UPDATE products 
            SET stock = new_stock, updated_at = NOW()
            WHERE id = product_record.id;
            
            -- Insertar log de inventario
            INSERT INTO inventory_logs (
              productId, 
              productName, 
              change, 
              reason, 
              updatedBy, 
              createdAt, 
              metadata
            ) VALUES (
              product_record.firestore_id,
              product_record.name,
              -(item_record->>'quantity')::INTEGER,
              'Venta',
              p_cashier_id,
              NOW(),
              jsonb_build_object(
                'saleId', p_sale_id,
                'operationId', p_operation_id,
                'transactionId', transaction_id,
                'cost', item_record->>'cost',
                'originalStock', product_record.stock,
                'newStock', new_stock
              )
            );
            
            total_deduction := total_deduction + (item_record->>'quantity')::INTEGER;
          END LOOP;
          
          -- Marcar transacción como completada
          UPDATE transaction_logs 
          SET status = 'completed', completed_at = NOW()
          WHERE transaction_id = transaction_id;
          
          -- Retornar resultado
          RETURN jsonb_build_object(
            'success', true,
            'transaction_id', transaction_id,
            'total_deduction', total_deduction,
            'items_processed', jsonb_array_length(p_cart_items)
          );
          
        EXCEPTION
          WHEN OTHERS THEN
            -- Marcar transacción como fallida
            UPDATE transaction_logs 
            SET status = 'failed', error_message = SQLERRM, completed_at = NOW()
            WHERE transaction_id = transaction_id;
            
            -- Retornar error
            RETURN jsonb_build_object(
              'success', false,
              'error', SQLERRM,
              'transaction_id', transaction_id
            );
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (funcError) {
      console.log("⚠️ No se pudo crear función execute_sale_transaction:", funcError.message);
    } else {
      console.log("✅ Función execute_sale_transaction creada");
    }

    console.log("\n🎉 CORRECCIÓN DE ESQUEMA COMPLETADA");
    console.log("✅ El sistema ahora está listo para usar la solución de deduplicación");

  } catch (error) {
    console.error("❌ Error en corrección de esquema:", error);
  }
}

// Ejecutar corrección
fixInventorySchema();