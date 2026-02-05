import { NextResponse } from "next/server";
import { getAllOpenSessions, closeCashSession, openCashSession, depositToAccount } from "@/lib/services/cashSessionService";
import { getLogger } from "@/lib/logger";

const log = getLogger("dailyCutCron");

/**
 * REFACTORING NOTE: Simplified Daily Cut Cron - Removed All Balance Bag Functionality
 * 
 * This automated endpoint now:
 * - Closes open sessions from previous days
 * - Opens a new session for today if none exists
 * 
 * Previous complexity eliminated:
 * - Removed bag-related parameters from closeCashSession
 * - Simplified to only use actualCashCount and optional depositAccountId
 * - For auto-closed sessions, we skip the deposit (no account selected)
 * 
 * The automated process ensures:
 * - Sessions are properly closed at end of day
 * - Data integrity is maintained without complex bag tracking
 */
export async function GET() {
    try {
        const openSessions = await getAllOpenSessions();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let sessionsClosed = 0;
        let sessionsOpened = 0;

        // 1. Close sessions from previous days
        for (const session of openSessions) {
            const openedAt = new Date(session.openedAt);
            openedAt.setHours(0, 0, 0, 0);

            if (openedAt.getTime() < today.getTime()) {
                // Close session
                // SIMPLIFICATION: Only pass actualCashCount, no deposit account for auto-close
                // Auto-closed sessions don't perform actual deposits - they're just closed in the system
                const actualCashCount = session.expectedCashInDrawer;

                await closeCashSession(
                    session,
                    "SYSTEM",
                    "Sistema Automático",
                    actualCashCount,
                    // SIMPLIFICATION: No deposit account for auto-close - sessions are closed without actual deposit
                    // This maintains data integrity without requiring user interaction
                    "" // Empty depositAccountId to skip deposit for auto-closed sessions
                );
                sessionsClosed++;
            }
        }

        // 2. Check if there is ANY session for today (Open OR Closed)
        // We fetch from DB to be sure, as openSessions only has open ones
        const { getSessionForDate } = await import("@/lib/services/cashSessionService");
        const existingSession = await getSessionForDate(today);

        if (!existingSession) {
            // Open new session for today
            // SIMPLIFICATION: Only pass starting float, removed bagsStartAmounts
            await openCashSession(
                "SYSTEM",
                "Sistema Automático",
                0, // Starting float 0 for auto-opened session
                undefined // No previous session confirmation for auto-open
            );
            sessionsOpened++;
        } else {
            log.info("Session for today already exists, skipping creation", { sessionId: existingSession.sessionId });
        }

        return NextResponse.json({
            success: true,
            message: "Daily cut process completed",
            stats: {
                sessionsClosed,
                sessionsOpened
            }
        });

    } catch (error: any) {
        log.error("Error in daily cut cron", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
