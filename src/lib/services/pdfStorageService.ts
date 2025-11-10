"use server";

import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { getLogger } from "@/lib/logger";

const log = getLogger("pdfStorageService");

const STORAGE_BUCKET = "cash-session-tickets";

/**
 * Uploads a PDF blob to Supabase Storage
 * @param blob The PDF blob to upload
 * @param filename The filename for the PDF (e.g., 'ticket-CS-ABC123-2025-02-02.pdf')
 * @returns The public URL of the uploaded PDF
 */
export const uploadPdfToStorage = async (
  blob: Blob,
  filename: string
): Promise<string> => {
  const supabase = getSupabaseServerClient();

  try {
    // Upload the PDF to storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, blob, {
        contentType: "application/pdf",
        upsert: true, // Allow overwriting if file already exists
      });

    if (error) {
      log.error("Error uploading PDF to storage", error);
      throw new Error(`Failed to upload PDF: ${error.message}`);
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filename);

    if (!urlData?.publicUrl) {
      throw new Error("Failed to get public URL for uploaded PDF");
    }

    log.info(`PDF uploaded successfully: ${filename}`);
    return urlData.publicUrl;
  } catch (error) {
    log.error("Error in uploadPdfToStorage", error);
    throw error;
  }
};

/**
 * Deletes a PDF from Supabase Storage
 * @param filename The filename of the PDF to delete
 */
export const deletePdfFromStorage = async (filename: string): Promise<void> => {
  const supabase = getSupabaseServerClient();

  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filename]);

    if (error) {
      log.error("Error deleting PDF from storage", error);
      throw new Error(`Failed to delete PDF: ${error.message}`);
    }

    log.info(`PDF deleted successfully: ${filename}`);
  } catch (error) {
    log.error("Error in deletePdfFromStorage", error);
    throw error;
  }
};
