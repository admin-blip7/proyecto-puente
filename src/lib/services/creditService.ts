import { db, storage } from "@/lib/firebase";
import { Client, CreditAccount, ClientPayment, ClientProfile } from "@/types";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot,
  query,
  where,
  limit,
  runTransaction,
  increment,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

const CLIENTS_COLLECTION = "clients";
const CREDIT_ACCOUNTS_COLLECTION = "credit_accounts";
const PAYMENTS_COLLECTION = "client_payments";
const STORAGE_CLIENT_DOCS_PATH = "client_documents";


// --- Converters ---
const clientFromDoc = (doc: QueryDocumentSnapshot<DocumentData>): Client => {
    const data = doc.data();
    return {
        id: doc.id,
        clientId: data.clientId,
        name: data.name,
        phone: data.phone,
        address: data.address,
        employmentInfo: data.employmentInfo,
        documents: data.documents,
        createdAt: data.createdAt.toDate(),
    };
};

const creditAccountFromDoc = (doc: QueryDocumentSnapshot<DocumentData>): CreditAccount => {
    const data = doc.data();
    return {
        id: doc.id,
        accountId: data.accountId,
        clientId: data.clientId,
        creditLimit: data.creditLimit,
        currentBalance: data.currentBalance,
        status: data.status,
        paymentDueDate: data.paymentDueDate.toDate(),
    };
}

// --- Service Functions ---

export const getClientsWithCredit = async (): Promise<ClientProfile[]> => {
    const clientsSnapshot = await getDocs(collection(db, CLIENTS_COLLECTION));
    const clients = clientsSnapshot.docs.map(clientFromDoc);
    
    const clientProfiles: ClientProfile[] = await Promise.all(
        clients.map(async (client) => {
            const q = query(
                collection(db, CREDIT_ACCOUNTS_COLLECTION),
                where("clientId", "==", client.id),
                limit(1)
            );
            const accountSnapshot = await getDocs(q);
            const creditAccount = accountSnapshot.empty ? undefined : creditAccountFromDoc(accountSnapshot.docs[0]);
            return { ...client, creditAccount };
        })
    );

    return clientProfiles.sort((a,b) => a.name.localeCompare(b.name));
}


export const addClient = async (
    clientData: Omit<Client, 'id' | 'clientId' | 'createdAt' | 'documents'>,
    creditLimit: number,
    paymentDueDate: Date
): Promise<ClientProfile> => {
    const clientId = `CLIENT-${uuidv4().substring(0, 8).toUpperCase()}`;
    const accountId = `ACC-${uuidv4().substring(0, 8).toUpperCase()}`;

    const clientRef = doc(collection(db, CLIENTS_COLLECTION));
    const accountRef = doc(collection(db, CREDIT_ACCOUNTS_COLLECTION));

    const newClient: Omit<Client, 'id'> = {
        ...clientData,
        clientId,
        documents: {},
        createdAt: new Date(), // Placeholder, server will overwrite
    };

    const newAccount: Omit<CreditAccount, 'id'> = {
        accountId,
        clientId: clientRef.id,
        creditLimit,
        currentBalance: 0,
        status: 'Al Corriente',
        paymentDueDate,
    };
    
    await runTransaction(db, async (transaction) => {
        transaction.set(clientRef, { ...newClient, createdAt: serverTimestamp() });
        transaction.set(accountRef, newAccount);
    });

    return {
        ...(await clientFromDoc((await getDoc(clientRef)) as any)),
        creditAccount: { ...newAccount, id: accountRef.id }
    };
};


export const uploadClientDocument = async (
    clientId: string,
    documentType: 'idUrl' | 'proofOfAddressUrl',
    file: File
): Promise<string> => {
    const filePath = `${STORAGE_CLIENT_DOCS_PATH}/${clientId}/${documentType}-${file.name}`;
    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    const clientRef = doc(db, CLIENTS_COLLECTION, clientId);
    await updateDoc(clientRef, {
        [`documents.${documentType}`]: downloadURL,
    });

    return downloadURL;
};

export const addPaymentToCreditAccount = async (
    accountId: string,
    amount: number
): Promise<void> => {
     await runTransaction(db, async (transaction) => {
        const accountRef = doc(db, CREDIT_ACCOUNTS_COLLECTION, accountId);
        const paymentRef = doc(collection(db, PAYMENTS_COLLECTION));

        const accountDoc = await transaction.get(accountRef);
        if (!accountDoc.exists()) {
            throw new Error("La cuenta de crédito no existe.");
        }

        // 1. Create payment record
        transaction.set(paymentRef, {
            paymentId: `PAY-${uuidv4().substring(0, 8).toUpperCase()}`,
            accountId: accountId,
            amountPaid: amount,
            paymentDate: serverTimestamp()
        });

        // 2. Decrement credit account balance
        transaction.update(accountRef, {
            currentBalance: increment(-amount)
        });
     });
}
