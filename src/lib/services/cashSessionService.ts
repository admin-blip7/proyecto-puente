import { db } from "@/lib/firebase";
import { CashSession } from "@/types";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  addDoc,
  serverTimestamp,
  updateDoc,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

const CASH_SESSIONS_COLLECTION = "cash_sessions";

const sessionFromDoc = (doc: QueryDocumentSnapshot<DocumentData>): CashSession => {
    const data = doc.data();
    return {
        id: doc.id,
        sessionId: data.sessionId,
        status: data.status,
        openedBy: data.openedBy,
        openedByName: data.openedByName,
        openedAt: data.openedAt.toDate(),
        startingFloat: data.startingFloat,
        closedBy: data.closedBy,
        closedByName: data.closedByName,
        closedAt: data.closedAt ? data.closedAt.toDate() : undefined,
        totalCashSales: data.totalCashSales,
        totalCardSales: data.totalCardSales,
        totalCashPayouts: data.totalCashPayouts,
        expectedCashInDrawer: data.expectedCashInDrawer,
        actualCashCount: data.actualCashCount,
        difference: data.difference,
    }
}

export const getAllClosedSessions = async (): Promise<CashSession[]> => {
    const q = query(
        collection(db, CASH_SESSIONS_COLLECTION),
        where("status", "==", "Cerrado")
    );
    try {
        const querySnapshot = await getDocs(q);
        const sessions = querySnapshot.docs.map(sessionFromDoc);
        // Sort client-side to avoid composite index
        return sessions.sort((a,b) => (b.closedAt?.getTime() || 0) - (a.closedAt?.getTime() || 0));
    } catch (error) {
        console.error("Error fetching closed cash sessions: ", error);
        throw new Error("Failed to fetch closed sessions.");
    }
};


export const getCurrentOpenSession = async (userId: string): Promise<CashSession | null> => {
    const q = query(
        collection(db, CASH_SESSIONS_COLLECTION),
        where("status", "==", "Abierto"),
        where("openedBy", "==", userId),
        limit(1)
    );

    try {
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return null;
        }
        return sessionFromDoc(querySnapshot.docs[0]);
    } catch (error) {
        console.error("Error fetching open session: ", error);
        throw new Error("Failed to fetch open session.");
    }
}

export const openCashSession = async (
    userId: string,
    userName: string,
    startingFloat: number
): Promise<CashSession> => {
    const sessionId = `CS-${uuidv4().split('-')[0].toUpperCase()}`;
    const newSessionData: Omit<CashSession, 'id' | 'openedAt'> = {
        sessionId,
        status: 'Abierto',
        openedBy: userId,
        openedByName: userName,
        startingFloat,
        totalCashSales: 0,
        totalCardSales: 0,
        totalCashPayouts: 0,
        expectedCashInDrawer: startingFloat,
    };

    try {
        const docRef = await addDoc(collection(db, CASH_SESSIONS_COLLECTION), {
            ...newSessionData,
            openedAt: serverTimestamp(),
        });
        return {
            id: docRef.id,
            ...newSessionData,
            openedAt: new Date(),
        };
    } catch (error) {
        console.error("Error opening cash session:", error);
        throw new Error("Failed to open cash session.");
    }
}

export const closeCashSession = async (
    session: CashSession,
    userId: string,
    userName: string,
    actualCashCount: number
): Promise<CashSession> => {
    const sessionRef = doc(db, CASH_SESSIONS_COLLECTION, session.id);

    const expectedCashInDrawer = session.startingFloat + session.totalCashSales - session.totalCashPayouts;
    const difference = actualCashCount - expectedCashInDrawer;

    const closingData = {
        status: 'Cerrado' as const,
        closedBy: userId,
        closedByName: userName,
        closedAt: serverTimestamp(),
        actualCashCount,
        expectedCashInDrawer,
        difference,
    };

    try {
        await updateDoc(sessionRef, closingData);
        return {
            ...session,
            ...closingData,
            closedAt: new Date(),
        };
    } catch (error) {
        console.error("Error closing cash session:", error);
        throw new Error("Failed to close cash session.");
    }
}
