'use server';

import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { getLogger } from "@/lib/logger";

const log = getLogger("documentService");

/**
 * Sanitizes object path to remove characters that cause StorageApiError
 */
const sanitizeObjectPath = (objectPath: string): string => {
  return objectPath
    .normalize('NFD') // Normalize to decompose accents
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-zA-Z0-9._/-]/g, '_') // Replace special characters with underscores (note: keeping forward slash for directory structure)
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .replace(/\/+/g, '/'); // Replace multiple slashes with single
};

export const uploadFile = async (file: File, path: string): Promise<string> => {
  const supabase = getSupabaseServerClient();
  const segments = path.split("/").filter(Boolean);
  if (segments.length < 2) {
    throw new Error("Storage path must include bucket and object key.");
  }

  const [bucket, ...objectParts] = segments;
  const objectPath = sanitizeObjectPath(objectParts.join("/"));

  try {
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, arrayBuffer, {
      upsert: true,
      contentType: file.type || "application/octet-stream",
    });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
    return data.publicUrl;
  } catch (error) {
    log.error(`Error uploading file to ${path}:`, error);
    throw error;
  }
};
