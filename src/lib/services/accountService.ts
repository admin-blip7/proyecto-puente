import { db } from "@/lib/firebase";
import { Account, AccountType } from "@/types";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";

const ACCOUNTS_COLLECTION = "accounts";

const accountFromDoc = (doc: QueryDocumentSnapshot<DocumentData>): Account => {
    const data = doc.data();
    return {
        id: doc.id,
        name: data.name,
        type: data.type,
        currentBalance: data.currentBalance,
    };
};

export const getAccounts = async (): Promise<Account[]> => {
  const q = query(collection(db, ACCOUNTS_COLLECTION), orderBy("name"));
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(accountFromDoc);
  } catch (error) {
    console.error("Error fetching accounts: ", error);
    throw new Error("Failed to fetch accounts.");
  }
};

export const addAccount = async (
  accountData: Omit<Account, "id">
): Promise<Account> => {
  try {
    const docRef = await addDoc(collection(db, ACCOUNTS_COLLECTION), accountData);
    return {
      id: docRef.id,
      ...accountData,
    };
  } catch (error) {
    console.error("Error adding account: ", error);
    throw new Error("Failed to add account.");
  }
};

export const updateAccount = async (
  accountId: string,
  dataToUpdate: Partial<Omit<Account, "id">>
): Promise<void> => {
  try {
    const accountRef = doc(db, ACCOUNTS_COLLECTION, accountId);
    await updateDoc(accountRef, dataToUpdate);
  } catch (error) {
    console.error("Error updating account: ", error);
    throw new Error("Failed to update account.");
  }
};

export const deleteAccount = async (accountId: string): Promise<void> => {
    try {
        const accountRef = doc(db, ACCOUNTS_COLLECTION, accountId);
        // Add checks here to prevent deletion if balance is not 0 or if it's linked
        await deleteDoc(accountRef);
    } catch (error) {
        console.error("Error deleting account:", error);
        throw new Error("Failed to delete account.")
    }
}
