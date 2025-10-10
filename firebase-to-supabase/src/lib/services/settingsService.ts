"use server";

import {
  TicketSettings,
  TicketSettingsSchema,
  LabelSettings,
  LabelSettingsSchema,
  ContractTemplateSettings,
  ContractTemplateSchema,
  LabelType,
} from "@/types";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { nowIso } from "@/lib/supabase/utils";
import { getLogger } from "@/lib/logger";

const log = getLogger("settingsService");

const SETTINGS_TABLE = "settings";
const TICKET_SETTINGS_DOC_ID = "ticket_design";
const LABEL_SETTINGS_DOC_ID_BASE = "label_design";
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

const stripMeta = (row: any) => {
  if (!row) return null;
  const {
    firestore_id,
    id,
    created_at,
    createdAt,
    updatedAt,
    lastUpdated,
    ...rest
  } = row;
  if (lastUpdated) {
    rest.lastUpdated = lastUpdated;
  }
  // Handle null visualLayout values by setting them to undefined
  if (rest.visualLayout === null) {
    rest.visualLayout = undefined;
  }
  return rest;
};

const fetchSettingsDoc = async (docId: string) => {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select("*")
    .eq("firestore_id", docId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? { row: data, supabase } : { row: null, supabase };
};

const upsertSettingsDoc = async (docId: string, payload: Record<string, unknown>) => {
  const { row, supabase } = await fetchSettingsDoc(docId);
  const timestamp = nowIso();
  const data = {
    firestore_id: docId,
    ...payload,
    lastUpdated: timestamp,
  };

  if (row) {
    const { error } = await supabase
      .from(SETTINGS_TABLE)
      .update(data)
      .eq("firestore_id", docId);
    if (error) {
      throw error;
    }
  } else {
    const { error } = await supabase.from(SETTINGS_TABLE).insert(data);
    if (error) {
      throw error;
    }
  }
};

export const getTicketSettings = async (): Promise<TicketSettings> => {
  try {
    const { row } = await fetchSettingsDoc(TICKET_SETTINGS_DOC_ID);
    if (row) {
      const parsed = TicketSettingsSchema.safeParse(stripMeta(row));
      if (parsed.success) {
        return parsed.data;
      }
      log.warn("Invalid ticket settings in Supabase, returning defaults.", parsed.error);
    } else {
      await upsertSettingsDoc(TICKET_SETTINGS_DOC_ID, defaultTicketSettings);
    }
  } catch (error) {
    log.error("Error fetching ticket settings", error);
  }
  return defaultTicketSettings;
};


export const saveTicketSettings = async (settings: TicketSettings): Promise<void> => {
  try {
    const validated = TicketSettingsSchema.parse(settings);
    await upsertSettingsDoc(TICKET_SETTINGS_DOC_ID, validated);
  } catch (error) {
    log.error("Error saving ticket settings", error);
    throw new Error("Failed to save ticket settings.");
  }
};


// --- LABEL SETTINGS ---

const createDefaultLabelSettings = (): Omit<LabelSettings, 'labelType'> => ({
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
});

const defaultLabelSettings = createDefaultLabelSettings();

export const getLabelSettings = async (labelType: LabelType = "product"): Promise<LabelSettings> => {
  try {
    const docId = `${LABEL_SETTINGS_DOC_ID_BASE}_${labelType}`;
    const { row } = await fetchSettingsDoc(docId);
    if (row) {
      const rowData = stripMeta(row);
      const parsed = LabelSettingsSchema.safeParse(rowData);
      if (parsed.success) {
        return {
          ...parsed.data,
          labelType,
        };
      }
      
      log.warn("Invalid label settings in Supabase, returning defaults.", parsed.error);
    } else {
      await upsertSettingsDoc(docId, createDefaultLabelSettings());
    }
  } catch (error) {
    log.error("Error fetching label settings", error);
  }
  return {
    ...createDefaultLabelSettings(),
    labelType,
  };
};

export const saveLabelSettings = async (settings: LabelSettings): Promise<void> => {
  try {
    const { labelType, ...settingsToSave } = settings;
    const validated = LabelSettingsSchema.parse(settingsToSave);
    const docId = `${LABEL_SETTINGS_DOC_ID_BASE}_${labelType}`;
    await upsertSettingsDoc(docId, validated);
  } catch (error) {
    log.error("Error saving label settings", error);
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
  try {
    const { row } = await fetchSettingsDoc(CONTRACT_TEMPLATE_DOC_ID);
    if (row) {
      const parsed = ContractTemplateSchema.safeParse(stripMeta(row));
      if (parsed.success) {
        return parsed.data;
      }
      log.warn("Invalid contract template in Supabase, returning defaults.", parsed.error);
    } else {
      await upsertSettingsDoc(CONTRACT_TEMPLATE_DOC_ID, defaultContractTemplateSettings);
    }
  } catch (error) {
    log.error("Error fetching contract template", error);
  }
  return defaultContractTemplateSettings;
};

export const saveContractTemplate = async (settings: ContractTemplateSettings): Promise<void> => {
  const validated = ContractTemplateSchema.parse(settings);
  await upsertSettingsDoc(CONTRACT_TEMPLATE_DOC_ID, validated);
};
