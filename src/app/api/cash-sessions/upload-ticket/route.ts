import { NextRequest, NextResponse } from "next/server";
import { uploadPdfToStorage } from "@/lib/services/pdfStorageService";
import { updateCashSessionTicketUrl } from "@/lib/services/cashSessionService";
import { getLogger } from "@/lib/logger";

const log = getLogger("upload-ticket-api");

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const sessionId = formData.get("sessionId") as string;
    const sessionIdString = formData.get("sessionIdString") as string; // e.g., CS-ABC123

    if (!file || !sessionId || !sessionIdString) {
      return NextResponse.json(
        { error: "Missing required fields: file, sessionId, or sessionIdString" },
        { status: 400 }
      );
    }

    // Generate filename
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `ticket-${sessionIdString}-${timestamp}.pdf`;

    // Convert File to Blob
    const blob = new Blob([await file.arrayBuffer()], { type: "application/pdf" });

    // Upload to Supabase Storage
    const publicUrl = await uploadPdfToStorage(blob, filename);

    // Update the cash session with the PDF URL
    await updateCashSessionTicketUrl(sessionId, publicUrl);

    log.info(`Ticket uploaded successfully for session ${sessionIdString}: ${publicUrl}`);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
    });
  } catch (error) {
    log.error("Error uploading ticket PDF", error);
    
    // Provide more detailed error message
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const detailedError = errorMessage.includes("bucket")
      ? "Storage bucket 'cash-session-tickets' does not exist. Please run the setup script."
      : `Failed to upload ticket PDF: ${errorMessage}`;
    
    return NextResponse.json(
      { 
        error: detailedError,
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
