import { db } from "@/lib/firebase";
import { TicketSettings, TicketSettingsSchema } from "@/types";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

const SETTINGS_COLLECTION = "settings";
const TICKET_SETTINGS_DOC_ID = "ticket_design";

// Default settings in case nothing is in the database
const defaultSettings: TicketSettings = {
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
            // Validate data from Firestore against the Zod schema
            const parsed = TicketSettingsSchema.safeParse(docSnap.data());
            if (parsed.success) {
                return parsed.data;
            } else {
                console.warn("Invalid ticket settings in Firestore, returning defaults.", parsed.error);
                return defaultSettings;
            }
        } else {
            // If document doesn't exist, create it with defaults
            await setDoc(docRef, { ...defaultSettings, lastUpdated: serverTimestamp() });
            return defaultSettings;
        }
    } catch (error) {
        console.error("Error fetching ticket settings: ", error);
        // Return defaults on error to prevent app crash
        return defaultSettings;
    }
}


export const saveTicketSettings = async (settings: TicketSettings): Promise<void> => {
    try {
        // Validate settings with Zod before saving
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
