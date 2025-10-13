#!/usr/bin/env node

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env.local
config({ path: ".env.local" });

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

const STORAGE_POLICIES = [
  {
    name: "Usuarios autenticados pueden subir archivos a label-assets",
    sql: `
      CREATE POLICY "Usuarios autenticados pueden subir archivos a label-assets"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'label-assets');
    `
  },
  {
    name: "Todos pueden leer archivos de label-assets",
    sql: `
      CREATE POLICY "Todos pueden leer archivos de label-assets"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'label-assets');
    `
  },
  {
    name: "Usuarios autenticados pueden actualizar archivos en label-assets",
    sql: `
      CREATE POLICY "Usuarios autenticados pueden actualizar archivos en label-assets"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'label-assets')
      WITH CHECK (bucket_id = 'label-assets');
    `
  },
  {
    name: "Usuarios autenticados pueden eliminar archivos de label-assets",
    sql: `
      CREATE POLICY "Usuarios autenticados pueden eliminar archivos de label-assets"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'label-assets');
    `
  }
];

async function setupStoragePolicies() {
  try {
    console.log("Configurando políticas RLS para storage...");
    
    // Primero, verificar si RLS está habilitado en storage.objects
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('check_rls_enabled', {
      table_name: 'objects',
      schema_name: 'storage'
    });
    
    if (rlsError) {
      console.log("No se pudo verificar el estado de RLS, continuando...");
    }
    
    // Habilitar RLS en storage.objects si no está habilitado
    const { error: enableRlsError } = await supabase.rpc('sql', {
      query: 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;'
    });
    
    if (enableRlsError && !enableRlsError.message.includes('already enabled')) {
      console.log("Advertencia al habilitar RLS:", enableRlsError.message);
    } else {
      console.log("RLS habilitado en storage.objects");
    }
    
    // Aplicar cada política
    for (const policy of STORAGE_POLICIES) {
      try {
        const { error } = await supabase.rpc('sql', {
          query: policy.sql
        });
        
        if (error) {
          if (error.message.includes('already exists')) {
            console.log(`✓ Política "${policy.name}" ya existe`);
          } else {
            console.error(`✗ Error creando política "${policy.name}":`, error.message);
          }
        } else {
          console.log(`✓ Política "${policy.name}" creada exitosamente`);
        }
      } catch (policyError) {
        console.error(`✗ Error aplicando política "${policy.name}":`, policyError);
      }
    }
    
    console.log("\n✅ Configuración de políticas RLS completada");
    
  } catch (error) {
    console.error("❌ Error configurando políticas RLS:", error.message ?? error);
    console.log("\n📝 Puedes aplicar las políticas manualmente ejecutando el archivo setup-storage-policies.sql en el SQL Editor de Supabase");
    process.exit(1);
  }
}

setupStoragePolicies();