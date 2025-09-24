import { db } from "@/lib/firebase";
import { Account, CashSession } from "@/types";
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
  runTransaction,
  increment,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { getLogger } from "@/lib/logger";
const log = getLogger("cashSessionService");
const CASH_SESSIONS_COLLECTION = "cash_sessions";
const ACCOUNTS_COLLECTION = "accounts";


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
        log.error("Error fetching closed cash sessions: ", error);
        return [];
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
        log.error("Error fetching open session: ", error);
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
        log.error("Error opening cash session:", error);
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
         await runTransaction(db, async (transaction) => {
            // Find default accounts
            const cashAccountQuery = query(collection(db, ACCOUNTS_COLLECTION), where("name", "==", "Caja Chica"), limit(1));
            const bankAccountQuery = query(collection(db, ACCOUNTS_COLLECTION), where("name", "==", "Banco Principal"), limit(1));
            
            const cashAccountSnapshot = await getDocs(cashAccountQuery);
            const bankAccountSnapshot = await getDocs(bankAccountQuery);

            const cashAccountRef = !cashAccountSnapshot.empty ? cashAccountSnapshot.docs[0].ref : null;
            const bankAccountRef = !bankAccountSnapshot.empty ? bankAccountSnapshot.docs[0].ref : null;

            // 1. Close the session
            transaction.update(sessionRef, closingData);

            // 2. Update account balances
            if (cashAccountRef && session.totalCashSales > 0) {
                transaction.update(cashAccountRef, { currentBalance: increment(session.totalCashSales) });
            }
            if (bankAccountRef && session.totalCardSales > 0) {
                transaction.update(bankAccountRef, { currentBalance: increment(session.totalCardSales) });
            }
        });

        return {
            ...session,
            ...closingData,
            closedAt: new Date(),
        };
    } catch (error) {
        log.error("Error closing cash session:", error);
        throw new Error("Failed to close cash session.");
    }
}
