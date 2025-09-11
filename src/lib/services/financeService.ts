import { db, storage } from "@/lib/firebase";
import { Expense, ExpenseCategory } from "@/types";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  query,
  where,
  orderBy,
  DocumentData,
  QueryDocumentSnapshot,
  runTransaction,
  limit,
  increment,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

const EXPENSES_COLLECTION = "expenses";
const STORAGE_RECEIPTS_PATH = "receipts";
const CASH_SESSIONS_COLLECTION = "cash_sessions";
const ACCOUNTS_COLLECTION = "accounts";


const expenseFromDoc = (doc: QueryDocumentSnapshot<DocumentData>): Expense => {
    const data = doc.data();
    return {
        id: doc.id,
        expenseId: data.expenseId,
        description: data.description,
        category: data.category,
        amount: data.amount,
        paidFromAccountId: data.paidFromAccountId,
        paymentDate: data.paymentDate.toDate(),
        receiptUrl: data.receiptUrl,
        sessionId: data.sessionId,
    }
}

export const getExpenses = async (): Promise<Expense[]> => {
    const q = query(
        collection(db, EXPENSES_COLLECTION),
        orderBy("paymentDate", "desc")
    );
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(expenseFromDoc);
    } catch (error) {
        console.error("Error fetching expenses: ", error);
        throw new Error("Failed to fetch expenses.");
    }
}

const uploadReceipt = async (file: File, expenseId: string): Promise<string> => {
    const filePath = `${STORAGE_RECEIPTS_PATH}/${expenseId}-${file.name}`;
    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
};


export const addExpense = async (
    expenseData: Omit<Expense, 'id' | 'expenseId' | 'paymentDate' | 'receiptUrl'>,
    receiptFile?: File,
    userId?: string
): Promise<Expense> => {
    const expenseId = `EXP-${uuidv4().split('-')[0].toUpperCase()}`;
    
    if (!expenseData.paidFromAccountId) {
        throw new Error("La cuenta de origen del pago es requerida.");
    }
    
    let dataToSave: any = {
      ...expenseData,
      expenseId,
      paymentDate: serverTimestamp(),
    };

    if (receiptFile) {
        dataToSave.receiptUrl = await uploadReceipt(receiptFile, expenseId);
    }
    
    // Get active session outside transaction if userId is provided
    let activeSessionRef = null;
    if (userId) {
        const activeSessionQuery = query(
            collection(db, CASH_SESSIONS_COLLECTION),
            where("status", "==", "Abierto"),
            where("openedBy", "==", userId),
            orderBy("openedAt", "desc"),
            limit(1)
        );
        const activeSessionSnapshot = await getDocs(activeSessionQuery);
        if (!activeSessionSnapshot.empty) {
            activeSessionRef = activeSessionSnapshot.docs[0].ref;
            dataToSave.sessionId = activeSessionRef.id;
        }
    }


    await runTransaction(db, async (transaction) => {
        // 1. Create the expense document
        const expenseRef = doc(collection(db, EXPENSES_COLLECTION));
        transaction.set(expenseRef, dataToSave);
        dataToSave.id = expenseRef.id;
        
        // 2. Decrement the account balance
        const accountRef = doc(db, ACCOUNTS_COLLECTION, expenseData.paidFromAccountId);
        transaction.update(accountRef, { currentBalance: increment(-expenseData.amount) });

        // 3. If it's a quick expense from POS and a session is active, update the session
        if (activeSessionRef) {
            transaction.update(activeSessionRef, {
                totalCashPayouts: increment(expenseData.amount)
            });
        }
    });

    return {
        id: dataToSave.id,
        expenseId,
        ...expenseData,
        paymentDate: new Date(),
        receiptUrl: dataToSave.receiptUrl,
        sessionId: dataToSave.sessionId,
    };
};
