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
  setDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { getLogger } from "@/lib/logger";
const log = getLogger("financeService");
const EXPENSES_COLLECTION = "expenses";
const STORAGE_RECEIPTS_PATH = "receipts";
const CASH_SESSIONS_COLLECTION = "cash_sessions";
const ACCOUNTS_COLLECTION = "accounts";
const DAILY_EARNINGS_COLLECTION = "daily_earnings";


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
        log.error("Error fetching expenses: ", error);
        return [];
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

// Función para registrar ganancias por intereses en ganancias diarias
export const addInterestEarnings = async (
    amount: number,
    clientId: string,
    clientName: string,
    description?: string
): Promise<void> => {
    const today = new Date();
    const dateKey = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const earningsData = {
        date: serverTimestamp(),
        dateKey,
        type: 'interest',
        amount,
        clientId,
        clientName,
        description: description || `Ganancia por intereses - ${clientName}`,
        createdAt: serverTimestamp(),
    };

    await runTransaction(db, async (transaction) => {
        // Buscar si ya existe un registro de ganancias para hoy
        const dailyEarningsQuery = query(
            collection(db, DAILY_EARNINGS_COLLECTION),
            where("dateKey", "==", dateKey)
        );
        
        const dailyEarningsSnapshot = await getDocs(dailyEarningsQuery);
        
        if (dailyEarningsSnapshot.empty) {
            // Crear nuevo registro de ganancias diarias
            const newDailyEarningsRef = doc(collection(db, DAILY_EARNINGS_COLLECTION));
            transaction.set(newDailyEarningsRef, {
                dateKey,
                date: serverTimestamp(),
                totalInterestEarnings: amount,
                totalEarnings: amount,
                interestTransactions: [earningsData],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        } else {
            // Actualizar registro existente
            const existingDoc = dailyEarningsSnapshot.docs[0];
            const existingData = existingDoc.data();
            
            transaction.update(existingDoc.ref, {
                totalInterestEarnings: increment(amount),
                totalEarnings: increment(amount),
                interestTransactions: [...(existingData.interestTransactions || []), earningsData],
                updatedAt: serverTimestamp(),
            });
        }
    });
};

// Generate automatic payment plan
export async function generatePaymentPlan(
    clientId: string,
    creditAmount: number,
    interestRate: number,
    termInMonths: number = 12
) {
    try {
        const monthlyRate = interestRate / 100 / 12;
        const monthlyPayment = (creditAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termInMonths));
        
        let remainingBalance = creditAmount;
        const paymentPlan = [];
        const startDate = new Date();

        for (let i = 1; i <= termInMonths; i++) {
            const interest = remainingBalance * monthlyRate;
            const principal = monthlyPayment - interest;
            remainingBalance -= principal;

            const paymentDate = new Date(startDate);
            paymentDate.setMonth(paymentDate.getMonth() + i);

            paymentPlan.push({
                paymentNumber: i,
                paymentDate: paymentDate.toISOString(),
                paymentAmount: monthlyPayment,
                interest,
                principal,
                remainingBalance: remainingBalance > 0 ? remainingBalance : 0,
                status: 'pending' as const
            });
        }

        // Save payment plan to Firestore
        const paymentPlanRef = doc(db, 'paymentPlans', `${clientId}_${Date.now()}`);
        await setDoc(paymentPlanRef, {
            clientId,
            creditAmount,
            interestRate,
            termInMonths,
            monthlyPayment,
            paymentPlan,
            createdAt: new Date().toISOString(),
            status: 'active'
        });

        return { success: true, paymentPlanId: paymentPlanRef.id, paymentPlan };
    } catch (error) {
        log.error('Error generating payment plan:', error);
        throw error;
    }
}

// Generate automatic contract
export async function generateContract(
    clientId: string,
    clientName: string,
    clientAddress: string,
    clientPhone: string,
    creditLimit: number,
    interestRate: number,
    paymentDueDate: Date
) {
    try {
        // Get contract template
        const { getContractTemplate } = await import("./settingsService");
        const template = await getContractTemplate();
        
        // Process template with client data
        let content = template.content;
        const replacements = {
            "{{CLIENT_NAME}}": clientName,
            "{{CLIENT_ADDRESS}}": clientAddress,
            "{{CLIENT_PHONE}}": clientPhone,
            "{{CREDIT_LIMIT}}": `$${creditLimit.toFixed(2)} MXN`,
            "{{INTEREST_RATE}}": `${interestRate || 0}%`,
            "{{PAYMENT_DUE_DAY}}": paymentDueDate.getDate().toString(),
            "{{STORE_NAME}}": "Storefront Swift",
            "{{STORE_ADDRESS}}": "Dirección de la Tienda",
            "{{STORE_CITY}}": "Tu Ciudad",
            "{{CURRENT_DATE}}": new Date().toLocaleDateString('es-ES', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
            }),
        };

        for (const [key, value] of Object.entries(replacements)) {
            content = content.replace(new RegExp(key, 'g'), value);
        }

        // Save contract to Firestore
        const contractRef = doc(db, 'contracts', `${clientId}_${Date.now()}`);
        await setDoc(contractRef, {
            clientId,
            clientName,
            content,
            createdAt: new Date().toISOString(),
            status: 'active',
            creditLimit,
            interestRate
        });

        return { success: true, contractId: contractRef.id, content };
    } catch (error) {
        log.error('Error generating contract:', error);
        throw error;
    }
}
