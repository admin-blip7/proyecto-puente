#!/usr/bin/env node

import { config } from "dotenv";
import pkg from 'pg';
const { Client } = pkg;

// Load environment variables from .env.local
config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_DB_PASSWORD) {
  console.error(
    "Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_DB_PASSWORD before running this script."
  );
  console.log("\nPuedes encontrar SUPABASE_DB_PASSWORD en tu dashboard de Supabase:");
  console.log("Settings > Database > Database password");
  console.log("\nAlternativamente, ejecuta manualmente el archivo setup-storage-policies.sql en el SQL Editor de Supabase");
  process.exit(1);
}

// Extract database connection info from Supabase URL
const url = new URL(SUPABASE_URL);
const projectRef = url.hostname.split('.')[0];

// Construct PostgreSQL connection string
const connectionString = `postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${projectRef}.supabase.co:5432/postgres`;

const client = new Client({
  connectionString,
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
    console.log("Conectando a la base de datos de Supabase...");
    await client.connect();
    
    console.log("Configurando políticas RLS para storage...");
    
    // Habilitar RLS en storage.objects
    try {
      await client.query('ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;');
      console.log("✓ RLS habilitado en storage.objects");
    } catch (error) {
      if (error.message.includes('already enabled')) {
        console.log("✓ RLS ya estaba habilitado en storage.objects");
      } else {
        console.log("⚠️  Advertencia al habilitar RLS:", error.message);
      }
    }
    
    // Aplicar cada política
    for (const policy of STORAGE_POLICIES) {
      try {
        await client.query(policy.sql);
        console.log(`✓ Política "${policy.name}" creada exitosamente`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`✓ Política "${policy.name}" ya existe`);
        } else {
          console.error(`✗ Error creando política "${policy.name}":`, error.message);
        }
      }
    }
    
    console.log("\n✅ Configuración de políticas RLS completada exitosamente");
    console.log("🎉 Ahora los usuarios autenticados pueden subir imágenes al bucket 'label-assets'");
    
  } catch (error) {
    console.error("❌ Error configurando políticas RLS:", error.message);
    
    if (error.code === 'ENOTFOUND' || error.message.includes('connection')) {
      console.log("\n📝 Conexión fallida. Ejecuta manualmente estas políticas en el SQL Editor de Supabase:");
      console.log("   1. Ve a tu dashboard de Supabase");
      console.log("   2. Navega a SQL Editor");
      console.log("   3. Ejecuta el contenido del archivo: scripts/setup-storage-policies.sql");
    }
    
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupStoragePolicies();