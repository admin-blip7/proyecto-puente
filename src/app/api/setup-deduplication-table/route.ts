import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";

export async function POST(request: Request) {
  try {
    console.log("🚀 Setting up deduplication tables...");
    
    const supabase = getSupabaseServerClient();

    // 1. Crear tabla de deduplicación
    console.log("📝 Creating sale_deduplication table...");
    const { error: deduplicationError } = await supabase.rpc('exec_sql', {
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

    if (deduplicationError) {
      console.error("❌ Error creating deduplication table:", deduplicationError);
      // Try alternative approach
      const { error: altError } = await supabase
        .from('sale_deduplication')
        .select('id')
        .limit(1);
      
      if (altError && altError.code === 'PGRST116') {
        console.log("📝 Table doesn't exist, creating via JavaScript...");
        // Create table via JavaScript if RPC fails
        return NextResponse.json({
          success: false,
          error: "Table creation failed - needs manual setup",
          details: "Please run the SQL script manually in Supabase dashboard",
          sqlScript: "scripts/create-deduplication-table.sql"
        }, { status: 500 });
      }
    }

    // 2. Crear tabla de logs de transacciones
    console.log("📝 Creating transaction_logs table...");
    const { error: logsError } = await supabase.rpc('exec_sql', {
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

    if (logsError) {
      console.error("❌ Error creating transaction logs table:", logsError);
    }

    // 3. Verificar tablas creadas
    console.log("🔍 Verifying tables...");
    const { data: deduplicationCheck, error: checkError1 } = await supabase
      .from('sale_deduplication')
      .select('id')
      .limit(1);

    const { data: logsCheck, error: checkError2 } = await supabase
      .from('transaction_logs')
      .select('id')
      .limit(1);

    const tablesCreated = {
      sale_deduplication: !checkError1,
      transaction_logs: !checkError2
    };

    console.log("📊 Tables status:", tablesCreated);

    if (tablesCreated.sale_deduplication && tablesCreated.transaction_logs) {
      console.log("✅ All tables created successfully");
      return NextResponse.json({
        success: true,
        message: "Deduplication tables created successfully",
        tables: tablesCreated,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log("⚠️ Some tables may not have been created properly");
      return NextResponse.json({
        success: false,
        error: "Some tables failed to create",
        tables: tablesCreated,
        details: "Please check Supabase dashboard and run SQL script manually if needed",
        sqlScript: "scripts/create-deduplication-table.sql",
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error) {
    console.error("❌ Error setting up deduplication tables:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to setup deduplication tables",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    console.log("🔍 Checking deduplication table status...");
    
    const supabase = getSupabaseServerClient();

    // Verificar si las tablas existen
    const tables = ['sale_deduplication', 'transaction_logs'];
    const status: Record<string, boolean> = {};

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .limit(1);
        
        status[table] = !error;
        
        if (error) {
          console.log(`❌ Table ${table} not accessible:`, error.message);
        } else {
          console.log(`✅ Table ${table} accessible`);
        }
      } catch (err) {
        status[table] = false;
        console.log(`❌ Table ${table} check failed:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      tables: status,
      allReady: Object.values(status).every(Boolean),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error checking table status:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to check table status",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}