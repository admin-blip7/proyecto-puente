'use server';

import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { getLogger } from "@/lib/logger";

const log = getLogger("documentService");

export const uploadFile = async (file: File, path: string): Promise<string> => {
  const supabase = getSupabaseServerClient();
  const segments = path.split("/").filter(Boolean);
  if (segments.length < 2) {
    throw new Error("Storage path must include bucket and object key.");
  }

  const [bucket, ...objectParts] = segments;
  const objectPath = objectParts.join("/");

  try {
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, arrayBuffer, {
      upsert: true,
      contentType: file.type || "application/octet-stream",
    });

    if (uploadError) {
      throw uploadError;
    }

    const { data, error: publicUrlError } = supabase.storage.from(bucket).getPublicUrl(objectPath);
    if (publicUrlError) {
      throw publicUrlError;
    }

    return data.publicUrl;
  } catch (error) {
    log.error(`Error uploading file to ${path}:`, error);
    throw error;
  }
};
