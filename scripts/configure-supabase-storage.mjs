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

const REQUIRED_BUCKETS = [
  { name: "label-assets", public: true, description: "Diseñador de etiquetas y logos" },
  { name: "receipts", public: true, description: "Recibos de gastos" },
  { name: "payment_proofs", public: true, description: "Comprobantes de pago a consignadores" },
  { name: "debt_proofs", public: true, description: "Comprobantes de pagos de deudas" },
  { name: "client_documents", public: true, description: "Documentos de clientes" },
  { name: "warranties", public: true, description: "Evidencia de garantías" },
];

async function ensureBucket(bucket) {
  const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    throw listError;
  }

  const current = existingBuckets?.find((item) => item.name === bucket.name) ?? null;

  if (!current) {
    const { error: createError } = await supabase.storage.createBucket(bucket.name, {
      public: bucket.public,
    });
    if (createError) {
      throw createError;
    }
    console.log(`Created bucket '${bucket.name}' (${bucket.description}).`);
    return;
  }

  if (Boolean(current.public) !== bucket.public) {
    const { error: updateError } = await supabase.storage.updateBucket(bucket.name, {
      public: bucket.public,
    });
    if (updateError) {
      throw updateError;
    }
    console.log(`Updated bucket '${bucket.name}' to public=${bucket.public}.`);
  } else {
    console.log(`Bucket '${bucket.name}' already configured.`);
  }
}

async function main() {
  try {
    for (const bucket of REQUIRED_BUCKETS) {
      await ensureBucket(bucket);
    }

    console.log("Supabase storage buckets are configured.");
  } catch (error) {
    console.error("Failed to configure Supabase storage buckets:", error.message ?? error);
    process.exit(1);
  }
}

main();
