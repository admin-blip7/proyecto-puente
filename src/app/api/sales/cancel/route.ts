import { NextResponse } from "next/server";
import { cancelSales } from "@/lib/services/salesService";
import { getLogger } from "@/lib/logger";

const log = getLogger("salesCancelAPI");

/**
 * API endpoint for cancelling one or multiple sales
 * POST /api/sales/cancel
 * 
 * Request body:
 * {
 *   saleIds: string[];        // Array of sale IDs to cancel
 *   performedBy: string;      // User ID performing the cancellation
 *   performedByName?: string; // User name (optional, defaults to performedBy)
 *   cancelReason?: string;    // Optional reason for cancellation
 * }
 * 
 * Response:
 * {
 *   success: boolean;
 *   results: Array<{
 *     saleId: string;
 *     success: boolean;
 *     errorMessage?: string;
 *   }>;
 *   totalProcessed: number;
 *   successCount: number;
 *   failureCount: number;
 *   message: string;
 *   timestamp: string;
 * }
 */
export async function POST(request: Request) {
  try {
    log.info("Sale cancellation API endpoint called");
    
    const body = await request.json();
    const { saleIds, performedBy, performedByName, cancelReason } = body;

    // Validate required fields
    if (!saleIds || !Array.isArray(saleIds) || saleIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Invalid request",
        details: "saleIds must be a non-empty array",
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    if (!performedBy || typeof performedBy !== 'string') {
      return NextResponse.json({
        success: false,
        error: "Invalid request",
        details: "performedBy is required and must be a string",
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Use performedByName if provided, otherwise use performedBy
    const userDisplayName = performedByName || performedBy;

    log.info(`Cancelling ${saleIds.length} sale(s)`, {
      saleIds,
      performedBy,
      performedByName: userDisplayName,
      cancelReason
    });

    // Call the service layer to cancel sales
    const result = await cancelSales(
      saleIds,
      performedBy,
      userDisplayName,
      cancelReason
    );

    // Determine overall success status
    const overallSuccess = result.failureCount === 0;
    
    // Determine HTTP status code
    let statusCode = 200;
    if (result.successCount === 0) {
      // All failed
      statusCode = 500;
    } else if (result.failureCount > 0) {
      // Partial success
      statusCode = 207; // Multi-Status
    }

    // Build response message
    let message: string;
    if (overallSuccess) {
      message = `Successfully cancelled ${result.successCount} sale(s)`;
    } else if (result.successCount === 0) {
      message = `Failed to cancel all ${result.totalProcessed} sale(s)`;
    } else {
      message = `Partially succeeded: ${result.successCount} sale(s) cancelled, ${result.failureCount} failed`;
    }

    log.info(`Cancellation complete: ${message}`, result);

    return NextResponse.json({
      success: overallSuccess,
      results: result.results,
      totalProcessed: result.totalProcessed,
      successCount: result.successCount,
      failureCount: result.failureCount,
      message,
      timestamp: new Date().toISOString()
    }, { status: statusCode });

  } catch (error: any) {
    log.error("Error cancelling sales:", error);
    
    return NextResponse.json({
      success: false,
      error: "Error cancelling sales",
      details: error.message || "Internal server error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
