'use server';

import { db } from "@/lib/firebase";
import { Client, CreditAccount, ClientProfile, Product, UserProfile } from "@/types";
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
  increment,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { uploadFile } from "./documentService";

const CLIENTS_COLLECTION = "clients";
const CREDIT_ACCOUNTS_COLLECTION = "credit_accounts";
const SALES_COLLECTION = "sales";
const PRODUCTS_COLLECTION = "products";
const INVENTORY_LOGS_COLLECTION = "inventory_logs";


// --- Converters ---
const clientFromDoc = (doc: QueryDocumentSnapshot<DocumentData>): Client => {
    const data = doc.data();
    return {
        id: doc.id,
        clientId: data.clientId,
        name: data.name,
        phone: data.phone,
        address: data.address,
        curp: data.curp,
        employmentInfo: data.employmentInfo,
        socialMedia: data.socialMedia,
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
        interestRate: data.interestRate,
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
    paymentDueDate: Date,
    interestRate?: number,
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
        interestRate: interestRate || 0,
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

interface CreateFinancedSaleParams {
    product: Product;
    client: ClientProfile;
    user: UserProfile;
    terms: {
        downPayment: number;
        annualInterestRate: number;
        paymentFrequency: 'Semanal' | 'Mensual';
        term: number;
    }
}

export const createFinancedSale = async (params: CreateFinancedSaleParams): Promise<void> => {
    const { product, client, user, terms } = params;

    const saleId = `SALE-${uuidv4().split('-')[0].toUpperCase()}`;
    const accountId = `ACC-${uuidv4().substring(0, 8).toUpperCase()}`;
    const amountToFinance = product.price - terms.downPayment;

    await runTransaction(db, async (transaction) => {
        const productRef = doc(db, PRODUCTS_COLLECTION, product.id);
        const productDoc = await transaction.get(productRef);

        if (!productDoc.exists() || productDoc.data().stock < 1) {
            throw new Error(`Stock insuficiente para ${product.name}.`);
        }
        
        // 1. Create the Sale record
        const saleRef = doc(collection(db, SALES_COLLECTION));
        transaction.set(saleRef, {
            saleId,
            items: [{ productId: product.id, name: product.name, quantity: 1, priceAtSale: product.price }],
            totalAmount: product.price,
            paymentMethod: "Crédito",
            cashierId: user.uid,
            cashierName: user.name,
            customerName: client.name,
            customerPhone: client.phone,
            createdAt: serverTimestamp(),
        });
        
        // 2. Create the Credit Account
        const creditAccountRef = doc(collection(db, CREDIT_ACCOUNTS_COLLECTION));
        transaction.set(creditAccountRef, {
            accountId,
            clientId: client.id,
            creditLimit: product.price,
            currentBalance: amountToFinance,
            status: 'Al Corriente',
            paymentDueDate: new Date(), // This should be calculated based on frequency
            interestRate: terms.annualInterestRate,
            financeTerms: { // Store terms for future reference
                productId: product.id,
                productName: product.name,
                productPrice: product.price,
                ...terms
            }
        });

        // 3. Update product stock
        transaction.update(productRef, { stock: increment(-1) });

        // 4. Create inventory log
        const logRef = doc(collection(db, INVENTORY_LOGS_COLLECTION));
        transaction.set(logRef, {
            productId: product.id,
            productName: product.name,
            change: -1,
            reason: 'Venta a Crédito',
            updatedBy: user.uid,
            createdAt: serverTimestamp(),
            metadata: { saleId, cost: product.cost }
        });
    });
}
