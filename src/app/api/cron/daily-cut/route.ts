import { NextResponse } from "next/server";
import { getAllOpenSessions, closeCashSession, openCashSession } from "@/lib/services/cashSessionService";
import { getLogger } from "@/lib/logger";

const log = getLogger("dailyCutCron");

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
                // Assuming perfect count for automatic close
                const actualCashCount = session.expectedCashInDrawer;

                await closeCashSession(
                    session,
                    "SYSTEM",
                    "Sistema Automático",
                    actualCashCount
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
            await openCashSession(
                "SYSTEM",
                "Sistema Automático",
                0 // Starting float 0 for auto-opened session
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
