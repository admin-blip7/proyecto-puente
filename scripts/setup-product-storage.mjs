#!/usr/bin/env node

import { config } from "dotenv";
import pkg from 'pg';
const { Client } = pkg;

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_DB_PASSWORD) {
    console.error("❌ Faltan credenciales.");
    console.error("Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_DB_PASSWORD en tu archivo .env.local");
    process.exit(1);
}

const url = new URL(SUPABASE_URL);
const projectRef = url.hostname.split('.')[0];
const connectionString = `postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${projectRef}.supabase.co:5432/postgres`;

const client = new Client({ connectionString });

async function setup() {
    try {
        console.log("Conectando a la base de datos...");
        await client.connect();

        // 1. Create Bucket
        console.log("Verificando bucket 'products'...");
        await client.query(`
      INSERT INTO storage.buckets (id, name, public) 
      VALUES ('products', 'products', true) 
      ON CONFLICT (id) DO NOTHING;
    `);
        console.log("✅ Bucket 'products' asegurado.");

        // 2. Add Column
        console.log("Verificando columna 'image_urls'...");
        await client.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';
    `);
        console.log("✅ Columna 'image_urls' asegurada.");

        // 3. Enable RLS on storage.objects
        try {
            await client.query('ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;');
        } catch (e) { }

        // 4. Policies
        console.log("Configurando políticas de almacenamiento...");
        const policies = [
            {
                name: "Public Access Products",
                sql: `CREATE POLICY "Public Access Products" ON storage.objects FOR SELECT USING ( bucket_id = 'products' );`
            },
            {
                name: "Authenticated Uploads Products",
                sql: `CREATE POLICY "Authenticated Uploads Products" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'products' );`
            },
            {
                name: "Authenticated Update Products",
                sql: `CREATE POLICY "Authenticated Update Products" ON storage.objects FOR UPDATE TO authenticated USING ( bucket_id = 'products' ) WITH CHECK ( bucket_id = 'products' );`
            },
            {
                name: "Authenticated Delete Products",
                sql: `CREATE POLICY "Authenticated Delete Products" ON storage.objects FOR DELETE TO authenticated USING ( bucket_id = 'products' );`
            }
        ];

        for (const p of policies) {
            try {
                await client.query(p.sql);
                console.log(`✅ Política "${p.name}" creada.`);
            } catch (e) {
                if (e.message.includes('already exists')) {
                    console.log(`ℹ️ La política "${p.name}" ya existe.`);
                } else {
                    console.error(`❌ Error creando política "${p.name}":`, e.message);
                }
            }
        }

        console.log("\n🎉 Configuración completada exitosamente.");

    } catch (e) {
        console.error("\n❌ Error fatal:", e.message);
        console.log("\nSi el error es de conexión, verifica tu SUPABASE_DB_PASSWORD en .env.local");
    } finally {
        await client.end();
    }
}

setup();
