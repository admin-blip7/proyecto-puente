import { db, storage } from "@/lib/firebase";
import { TicketSettings, TicketSettingsSchema, LabelSettings, LabelSettingsSchema, BrandingSettings, BrandingSettingsSchema } from "@/types";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

const SETTINGS_COLLECTION = "settings";
const TICKET_SETTINGS_DOC_ID = "ticket_design";
const LABEL_SETTINGS_DOC_ID = "label_design";
const BRANDING_SETTINGS_DOC_ID = "branding";


// --- BRANDING SETTINGS ---
const defaultBrandingSettings: BrandingSettings = {
    logo_url: "",
    default_product_image_url: "https://placehold.co/400x400/E2E8F0/AAAAAA&text=Sin+Imagen"
};

export const getBrandingSettings = async (): Promise<BrandingSettings> => {
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, BRANDING_SETTINGS_DOC_ID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const parsed = BrandingSettingsSchema.safeParse(docSnap.data());
            if (parsed.success) {
                return parsed.data;
            } else {
                console.warn("Invalid branding settings in Firestore, returning defaults.", parsed.error);
                return defaultBrandingSettings;
            }
        } else {
            await setDoc(docRef, { ...defaultBrandingSettings, lastUpdated: serverTimestamp() });
            return defaultBrandingSettings;
        }
    } catch (error) {
        console.error("Error fetching branding settings: ", error);
        return defaultBrandingSettings;
    }
}

export const saveBrandingSettings = async (
    settings: Partial<BrandingSettings>,
    files: { logo?: File | null, default_product_image?: File | null }
): Promise<BrandingSettings> => {
    try {
        const settingsRef = doc(db, SETTINGS_COLLECTION, BRANDING_SETTINGS_DOC_ID);
        const dataToUpdate: Partial<BrandingSettings> & { lastUpdated: any } = { lastUpdated: serverTimestamp() };

        if (files.logo) {
            const logoStorageRef = ref(storage, `app_logos/${uuidv4()}-${files.logo.name}`);
            await uploadBytes(logoStorageRef, files.logo);
            dataToUpdate.logo_url = await getDownloadURL(logoStorageRef);
        } else if (settings.logo_url !== undefined) {
            dataToUpdate.logo_url = settings.logo_url;
        }

        if (files.default_product_image) {
            const defaultImageRef = ref(storage, `default_images/${uuidv4()}-${files.default_product_image.name}`);
            await uploadBytes(defaultImageRef, files.default_product_image);
            dataToUpdate.default_product_image_url = await getDownloadURL(defaultImageRef);
        } else if (settings.default_product_image_url !== undefined) {
            dataToUpdate.default_product_image_url = settings.default_product_image_url;
        }
        
        await setDoc(settingsRef, dataToUpdate, { merge: true });
        
        const updatedDoc = await getDoc(settingsRef);
        return updatedDoc.data() as BrandingSettings;

    } catch (error) {
        console.error("Error saving branding settings: ", error);
        throw new Error("Failed to save branding settings.");
    }
};


// --- TICKET SETTINGS ---

const defaultTicketSettings: TicketSettings = {
    header: {
        showLogo: true,
        logoUrl: "",
        show: {
            storeName: true,
            address: true,
            phone: true,
            rfc: false,
            website: false,
        },
        storeName: "Nombre de tu Tienda",
        address: "Dirección de tu Tienda",
        phone: "123-456-7890",
        rfc: "",
        website: "",
    },
    body: {
        showQuantity: true,
        showUnitPrice: false,
        showTotal: true,
        fontSize: "sm",
    },
    footer: {
        showSubtotal: true,
        showTaxes: true,
        showDiscounts: true,
        thankYouMessage: "¡Gracias por tu compra!",
        additionalInfo: "Políticas de devolución: 30 días con ticket.",
        showQrCode: false,
        qrCodeUrl: "",
    }
}

export const getTicketSettings = async (): Promise<TicketSettings> => {
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, TICKET_SETTINGS_DOC_ID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const parsed = TicketSettingsSchema.safeParse(docSnap.data());
            if (parsed.success) {
                return parsed.data;
            } else {
                console.warn("Invalid ticket settings in Firestore, returning defaults.", parsed.error);
                return defaultTicketSettings;
            }
        } else {
            await setDoc(docRef, { ...defaultTicketSettings, lastUpdated: serverTimestamp() });
            return defaultTicketSettings;
        }
    } catch (error) {
        console.error("Error fetching ticket settings: ", error);
        return defaultTicketSettings;
    }
}


export const saveTicketSettings = async (settings: TicketSettings): Promise<void> => {
    try {
        const validatedSettings = TicketSettingsSchema.parse(settings);
        const settingsRef = doc(db, SETTINGS_COLLECTION, TICKET_SETTINGS_DOC_ID);
        await setDoc(settingsRef, {
            ...validatedSettings,
            lastUpdated: serverTimestamp()
        }, { merge: true });

    } catch (error) {
        console.error("Error saving ticket settings: ", error);
        throw new Error("Failed to save ticket settings.");
    }
};


// --- LABEL SETTINGS ---

const defaultLabelSettings: LabelSettings = {
    width: 66.7, // 2.625 inches in mm
    height: 25.4, // 1 inch in mm
    margin: 10,
    gap: 0,
    fontSize: 9,
    barcodeHeight: 30,
    includeLogo: false,
    logoUrl: "",
    storeName: "Nombre de tu Tienda",
    content: {
        showProductName: true,
        showSku: true,
        showPrice: true,
        showStoreName: false,
    },
};

export const getLabelSettings = async (): Promise<LabelSettings> => {
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, LABEL_SETTINGS_DOC_ID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const parsed = LabelSettingsSchema.safeParse(docSnap.data());
            if (parsed.success) {
                return parsed.data;
            } else {
                console.warn("Invalid label settings in Firestore, returning defaults.", parsed.error);
                return defaultLabelSettings;
            }
        } else {
            await setDoc(docRef, { ...defaultLabelSettings, lastUpdated: serverTimestamp() });
            return defaultLabelSettings;
        }
    } catch (error) {
        console.error("Error fetching label settings: ", error);
        return defaultLabelSettings;
    }
}

export const saveLabelSettings = async (settings: LabelSettings): Promise<void> => {
    try {
        const validatedSettings = LabelSettingsSchema.parse(settings);
        const settingsRef = doc(db, SETTINGS_COLLECTION, LABEL_SETTINGS_DOC_ID);
        await setDoc(settingsRef, {
            ...validatedSettings,
            lastUpdated: serverTimestamp()
        }, { merge: true });

    } catch (error) {
        console.error("Error saving label settings: ", error);
        throw new Error("Failed to save label settings.");
    }
};
