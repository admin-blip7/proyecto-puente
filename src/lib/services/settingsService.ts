import { db, storage } from "@/lib/firebase";
import { TicketSettings, TicketSettingsSchema, LabelSettings, LabelSettingsSchema, ContractTemplateSettings, ContractTemplateSchema } from "@/types";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { getLogger } from "@/lib/logger";
const log = getLogger("settingsService");

const SETTINGS_COLLECTION = "settings";
const TICKET_SETTINGS_DOC_ID = "ticket_design";
const LABEL_SETTINGS_DOC_ID = "label_design";
const CONTRACT_TEMPLATE_DOC_ID = "contract_template";


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
                log.warn("Invalid ticket settings in Firestore, returning defaults.", parsed.error);
                return defaultTicketSettings;
            }
        } else {
            await setDoc(docRef, { ...defaultTicketSettings, lastUpdated: serverTimestamp() });
            return defaultTicketSettings;
        }
    } catch (error) {
        log.error("Error fetching ticket settings: ", error);
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
        log.error("Error saving ticket settings: ", error);
        throw new Error("Failed to save ticket settings.");
    }
};


// --- LABEL SETTINGS ---

const defaultLabelSettings: LabelSettings = {
    width: 58, 
    height: 40, 
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
                log.warn("Invalid label settings in Firestore, returning defaults.", parsed.error);
                return defaultLabelSettings;
            }
        } else {
            await setDoc(docRef, { ...defaultLabelSettings, lastUpdated: serverTimestamp() });
            return defaultLabelSettings;
        }
    } catch (error) {
        log.error("Error fetching label settings: ", error);
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
        log.error("Error saving label settings: ", error);
        throw new Error("Failed to save label settings.");
    }
};


// --- CONTRACT TEMPLATE SETTINGS ---

const defaultContractTemplateSettings: ContractTemplateSettings = {
    content: `CONTRATO DE CRÉDITO

En la ciudad de {{STORE_CITY}} a {{CURRENT_DATE}}, se celebra el presente contrato de crédito entre:
- El ACREEDOR: {{STORE_NAME}}
- El DEUDOR: {{CLIENT_NAME}}, con domicilio en {{CLIENT_ADDRESS}}.

CLÁUSULAS:
1. Se otorga un límite de crédito de {{CREDIT_LIMIT}}.
2. La fecha límite de pago es el día {{PAYMENT_DUE_DAY}} de cada mes.
3. Se aplicará una tasa de interés anual del {{INTEREST_RATE}}% sobre saldos insolutos.

_________________________
{{CLIENT_NAME}}
`,
};

export const getContractTemplate = async (): Promise<ContractTemplateSettings> => {
    const docRef = doc(db, SETTINGS_COLLECTION, CONTRACT_TEMPLATE_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const parsed = ContractTemplateSchema.safeParse(docSnap.data());
        if (parsed.success) return parsed.data;
    }
    await setDoc(docRef, { ...defaultContractTemplateSettings, lastUpdated: serverTimestamp() });
    return defaultContractTemplateSettings;
};

export const saveContractTemplate = async (settings: ContractTemplateSettings): Promise<void> => {
    const validatedSettings = ContractTemplateSchema.parse(settings);
    const settingsRef = doc(db, SETTINGS_COLLECTION, CONTRACT_TEMPLATE_DOC_ID);
    await setDoc(settingsRef, { ...validatedSettings, lastUpdated: serverTimestamp() }, { merge: true });
};
