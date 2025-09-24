import { db } from "@/lib/firebase";
import { FixedAsset, AssetCategory, DepreciationMethod } from "@/types";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  query,
  orderBy,
  DocumentData,
  QueryDocumentSnapshot,
  writeBatch,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { getLogger } from "@/lib/logger";
const log = getLogger("assetService");

const ASSETS_COLLECTION = "fixed_assets";

const assetFromDoc = (doc: QueryDocumentSnapshot<DocumentData>): FixedAsset => {
    const data = doc.data();
    return {
        id: doc.id,
        assetId: data.assetId,
        name: data.name,
        category: data.category,
        purchaseDate: data.purchaseDate.toDate(),
        purchaseCost: data.purchaseCost,
        usefulLifeYrs: data.usefulLifeYrs,
        salvageValue: data.salvageValue,
        currentValue: data.currentValue,
        depreciationMethod: data.depreciationMethod,
        lastDepreciationDate: data.lastDepreciationDate.toDate(),
    }
}

export const getAssets = async (): Promise<FixedAsset[]> => {
    const q = query(
        collection(db, ASSETS_COLLECTION),
        orderBy("purchaseDate", "desc")
    );
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(assetFromDoc);
    } catch (error) {
        log.error("Error fetching assets: ", error);
        return [];
    }
}

export const addAsset = async (
    assetData: Omit<FixedAsset, 'id' | 'assetId' | 'currentValue' | 'lastDepreciationDate'>
): Promise<FixedAsset> => {
    const assetId = `ASSET-${uuidv4().split('-')[0].toUpperCase()}`;
    
    try {
        const docRef = await addDoc(collection(db, ASSETS_COLLECTION), {
            ...assetData,
            assetId,
            currentValue: assetData.purchaseCost,
            lastDepreciationDate: assetData.purchaseDate,
            createdAt: serverTimestamp(),
        });
        
        return {
            id: docRef.id,
            assetId,
            ...assetData,
            currentValue: assetData.purchaseCost,
            lastDepreciationDate: assetData.purchaseDate,
        };

    } catch (error) {
        log.error("Error adding asset: ", error);
        throw error;
    }
};

export const runAnnualDepreciation = async (): Promise<number> => {
    const assetsSnapshot = await getDocs(collection(db, ASSETS_COLLECTION));
    const batch = writeBatch(db);
    let updatedCount = 0;
    const today = new Date();

    assetsSnapshot.forEach(docSnap => {
        const asset = assetFromDoc(docSnap);
        const yearsSinceLastDepreciation = (today.getTime() - asset.lastDepreciationDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

        if (yearsSinceLastDepreciation >= 1) {
            const annualDepreciation = (asset.purchaseCost - asset.salvageValue) / asset.usefulLifeYrs;
            let depreciationToApply = annualDepreciation * Math.floor(yearsSinceLastDepreciation);
            
            let newValue = asset.currentValue - depreciationToApply;
            if (newValue < asset.salvageValue) {
                depreciationToApply = asset.currentValue - asset.salvageValue;
                newValue = asset.salvageValue;
            }

            if (depreciationToApply > 0) {
                batch.update(docSnap.ref, { 
                    currentValue: newValue,
                    lastDepreciationDate: today 
                });
                updatedCount++;
            }
        }
    });

    if (updatedCount > 0) {
        await batch.commit();
    }
    
    return updatedCount;
};
