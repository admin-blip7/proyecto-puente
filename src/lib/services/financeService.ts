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
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

const EXPENSES_COLLECTION = "expenses";
const STORAGE_RECEIPTS_PATH = "receipts";

const expenseFromDoc = (doc: QueryDocumentSnapshot<DocumentData>): Expense => {
    const data = doc.data();
    return {
        id: doc.id,
        expenseId: data.expenseId,
        description: data.description,
        category: data.category,
        amount: data.amount,
        paymentDate: data.paymentDate.toDate(),
        receiptUrl: data.receiptUrl,
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
    receiptFile?: File
): Promise<Expense> => {
    const expenseId = `EXP-${uuidv4().split('-')[0].toUpperCase()}`;
    
    let receiptUrl: string | undefined = undefined;
    if (receiptFile) {
        receiptUrl = await uploadReceipt(receiptFile, expenseId);
    }

    try {
        const docRef = await addDoc(collection(db, EXPENSES_COLLECTION), {
            ...expenseData,
            expenseId,
            receiptUrl,
            paymentDate: serverTimestamp(),
        });
        
        return {
            id: docRef.id,
            expenseId,
            ...expenseData,
            paymentDate: new Date(),
            receiptUrl
        };

    } catch (error) {
        console.error("Error adding expense: ", error);
        throw new Error("Failed to add expense.");
    }
};
