'use server';

import { db } from "@/lib/firebase";
import { Client, CreditAccount, ClientProfile } from "@/types";
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
  getDoc,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { uploadFile } from "./documentService";

const CLIENTS_COLLECTION = "clients";
const CREDIT_ACCOUNTS_COLLECTION = "credit_accounts";


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

    const createdClientDoc = await getDoc(clientRef);
    const createdClient = clientFromDoc(createdClientDoc as QueryDocumentSnapshot<DocumentData>);

    return {
        ...createdClient,
        creditAccount: { ...newAccount, id: accountRef.id }
    };
};


export const uploadClientDocument = async (
    clientId: string,
    documentType: 'idUrl' | 'proofOfAddressUrl',
    file: File
): Promise<string> => {
    const filePath = `client_documents/${clientId}/${documentType}-${file.name}`;
    const downloadURL = await uploadFile(file, filePath);

    const clientRef = doc(db, CLIENTS_COLLECTION, clientId);
    await updateDoc(clientRef, {
        [`documents.${documentType}`]: downloadURL,
    });

    return downloadURL;
};
