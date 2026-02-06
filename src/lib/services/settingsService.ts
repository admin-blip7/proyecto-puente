"use server";

import {
  TicketSettings,
  TicketSettingsSchema,
  PrintRoutingSettings,
  PrintRoutingSettingsSchema,
  LabelSettings,
  LabelSettingsSchema,
  ContractTemplateSettings,
  ContractTemplateSchema,
  LabelType,
} from "@/types";
import {
  DiscountSettings,
  DiscountSettingsSchema,
  DiscountSetting,
  isDiscountValid,
  DiscountValidationResult,
} from "@/types/discount";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { nowIso } from "@/lib/supabase/utils";
import { getLogger } from "@/lib/logger";

const log = getLogger("settingsService");

const SETTINGS_TABLE = "settings";
const TICKET_SETTINGS_DOC_ID = "ticket_design";
const LABEL_SETTINGS_DOC_ID_BASE = "label_design";
const CONTRACT_TEMPLATE_DOC_ID = "contract_template";
const DISCOUNT_SETTINGS_DOC_ID = "discount_settings";
const PRINT_ROUTING_SETTINGS_DOC_ID = "print_routing";


// --- TICKET SETTINGS ---

const defaultTicketSettings: TicketSettings = {
  paperWidth: 80,
  fontStyle: {
    bold: false,
    italic: false,
  },
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
    id,
    created_at,
    createdAt,
    updatedAt,
    lastUpdated,
    last_updated,
    data,
    ...rest
  } = row;

  // Si los datos vienen en formato JSON en la columna 'data'
  if (data && typeof data === 'object') {
    const result = {
      ...data,
      id: id,
      lastUpdated: last_updated || lastUpdated
    };
    // Ensure visualLayout is a string or undefined, not null
    if (result.visualLayout === null) {
      result.visualLayout = undefined;
    } else if (result.visualLayout && typeof result.visualLayout === 'object') {
      // If visualLayout is already an object, convert it to JSON string
      result.visualLayout = JSON.stringify(result.visualLayout);
    }
    return result;
  }

  // Si los datos vienen directamente en el row (formato antiguo)
  if (lastUpdated || last_updated) {
    rest.lastUpdated = lastUpdated || last_updated;
  }
  // Handle null visualLayout values by setting them to undefined
  if (rest.visualLayout === null) {
    rest.visualLayout = undefined;
  } else if (rest.visualLayout && typeof rest.visualLayout === 'object') {
    // If visualLayout is already an object, convert it to JSON string
    rest.visualLayout = JSON.stringify(rest.visualLayout);
  }
  return rest;
};

const fetchSettingsDoc = async (docId: string) => {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select("*")
    .eq("id", docId)
    .limit(1)
    .maybeSingle();

  if (error) {
    log.error("Error fetching settings", { error: error.message, docId });
    throw error;
  }

  // Adaptar la estructura de datos para compatibilidad
  if (data && data.data) {
    // Si los datos están en formato JSON en la columna 'data'
    const adaptedRow = {
      ...data.data,
      id: data.id,
      lastUpdated: data.last_updated
    };
    return { row: adaptedRow, supabase };
  }

  return data ? { row: data, supabase } : { row: null, supabase };
};

const upsertSettingsDoc = async (docId: string, payload: Record<string, unknown>) => {
  try {
    const { row, supabase } = await fetchSettingsDoc(docId);
    const timestamp = nowIso();

    // Adaptar la estructura de datos para la tabla settings
    const data = {
      id: docId,
      data: payload, // Almacenar el payload como JSON en la columna data
      last_updated: timestamp, // Usar snake_case para consistencia con la BD
    };

    if (row) {
      const { error } = await supabase
        .from(SETTINGS_TABLE)
        .update(data)
        .eq("id", docId);
      if (error) {
        log.error("Database update error", { error, docId });
        throw new Error(`Database error: ${error.message}`);
      }
    } else {
      const { error } = await supabase.from(SETTINGS_TABLE).insert(data);
      if (error) {
        log.error("Database insert error", { error, docId });
        throw new Error(`Database error: ${error.message}`);
      }
    }
  } catch (error) {
    log.error("Error in upsertSettingsDoc", {
      error: error instanceof Error ? error.message : String(error),
      docId
    });
    throw error;
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

// --- PRINT ROUTING SETTINGS ---

const defaultPrintRoutingSettings: PrintRoutingSettings = {
  useQzTray: false,
  ticketPrinterName: "",
  labelPrinterName: "",
};

export const getPrintRoutingSettings = async (): Promise<PrintRoutingSettings> => {
  try {
    const { row } = await fetchSettingsDoc(PRINT_ROUTING_SETTINGS_DOC_ID);
    if (row) {
      const parsed = PrintRoutingSettingsSchema.safeParse(stripMeta(row));
      if (parsed.success) {
        return parsed.data;
      }
      log.warn("Invalid print routing settings in Supabase, returning defaults.", parsed.error);
    } else {
      await upsertSettingsDoc(PRINT_ROUTING_SETTINGS_DOC_ID, defaultPrintRoutingSettings);
    }
  } catch (error) {
    log.error("Error fetching print routing settings", error);
  }
  return defaultPrintRoutingSettings;
};

export const savePrintRoutingSettings = async (settings: PrintRoutingSettings): Promise<void> => {
  try {
    const validated = PrintRoutingSettingsSchema.parse(settings);
    await upsertSettingsDoc(PRINT_ROUTING_SETTINGS_DOC_ID, validated);
  } catch (error) {
    log.error("Error saving print routing settings", error);
    throw new Error("Failed to save print routing settings.");
  }
};


// --- LABEL SETTINGS ---

const createDefaultLabelSettings = (): Omit<LabelSettings, 'labelType'> => ({
  width: 51,
  height: 102,
  orientation: 'vertical',
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

const createDefaultRepairLabelSettings = (): Omit<LabelSettings, 'labelType'> => ({
  width: 51,
  height: 25, // Smaller height for repair labels usually, or keep same? User said 101x51 in walkthrough. Let's maintain user preference if known, otherwise distinct default.
  orientation: 'horizontal',
  fontSize: 10,
  barcodeHeight: 15,
  includeLogo: false,
  logoUrl: "",
  storeName: "Nombre de tu Tienda",
  content: {
    showProductName: false,
    showSku: false,
    showPrice: false,
    showStoreName: true,
  },
  visualLayout: JSON.stringify({
    elements: [
      { id: "title", type: "text", x: 2, y: 2, width: 47, height: 6, content: "REPARACIÓN", fontSize: 12, fontWeight: "bold", textAlign: "center" },
      { id: "order", type: "text", x: 2, y: 10, width: 47, height: 5, content: "{ID de Orden}", fontSize: 10, textAlign: "center", placeholderKey: "orderId" }
    ]
  }),
});

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
      const defaults = labelType === 'repair' ? createDefaultRepairLabelSettings() : createDefaultLabelSettings();
      await upsertSettingsDoc(docId, defaults);
      return { ...defaults, labelType };
    }
  } catch (error) {
    log.error("Error fetching label settings", error);
  }

  const defaults = labelType === 'repair' ? createDefaultRepairLabelSettings() : createDefaultLabelSettings();
  return {
    ...defaults,
    labelType,
  };
};

export const getLabelSettingsById = async (id: string): Promise<LabelSettings> => {
  try {
    const { row } = await fetchSettingsDoc(id);
    if (row) {
      const rowData = stripMeta(row);
      const parsed = LabelSettingsSchema.safeParse(rowData);

      // Determine label type from ID if possible, or fallback to data, or default to 'product'
      const typeFromId = id.includes('repair') ? 'repair' : 'product';

      if (parsed.success) {
        return {
          ...parsed.data,
          labelType: parsed.data.labelType || typeFromId,
        };
      }

      log.warn("Invalid label settings in Supabase for ID " + id, parsed.error);
    }
  } catch (error) {
    log.error("Error fetching label settings by ID", error);
  }

  // Fallback defaults if not found or invalid
  // Try to guess type from ID
  const isRepair = id.toLowerCase().includes('repair');
  const defaults = isRepair ? createDefaultRepairLabelSettings() : createDefaultLabelSettings();
  return {
    ...defaults,
    labelType: isRepair ? 'repair' : 'product',
  };
};

export const saveLabelSettings = async (settings: LabelSettings, id?: string): Promise<void> => {
  try {
    const { labelType, ...settingsToSave } = settings;
    // Ensure orientation has a default value if not provided
    const dataToValidate = {
      ...settingsToSave,
      orientation: settingsToSave.orientation || 'horizontal',
    };

    log.info("Attempting to save label settings", { labelType, dataToValidate, id });

    const validated = LabelSettingsSchema.parse(dataToValidate);

    // If ID is provided, use it. Otherwise, use the default type-based ID.
    const docId = id || `${LABEL_SETTINGS_DOC_ID_BASE}_${labelType}`;

    log.info("Validation successful, saving to database", { docId });

    await upsertSettingsDoc(docId, { ...validated, labelType }); // Save labelType in the data too

    log.info("Label settings saved successfully", { docId });
  } catch (error) {
    log.error("Error saving label settings", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      settings: JSON.stringify(settings, null, 2),
      errorType: error?.constructor?.name
    });

    // Check if it's a Zod validation error
    if (error?.constructor?.name === 'ZodError') {
      const zodError = error as any;
      const issues = zodError.issues?.map((issue: any) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
      throw new Error(`Error de validación: ${issues || zodError.message}`);
    } else if (error instanceof Error && error.message.includes('validation')) {
      throw new Error(`Error de validación: ${error.message}`);
    } else if (error instanceof Error && error.message.includes('database')) {
      throw new Error(`Error de base de datos: ${error.message}`);
    } else {
      throw new Error(`Failed to save label settings: ${error instanceof Error ? error.message : String(error)}`);
    }
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


// --- DISCOUNT SETTINGS ---

const defaultDiscountSettings: DiscountSettings = {
  discounts: [],
};

export const getDiscountSettings = async (): Promise<DiscountSettings> => {
  try {
    const { row } = await fetchSettingsDoc(DISCOUNT_SETTINGS_DOC_ID);
    if (row) {
      const parsed = DiscountSettingsSchema.safeParse(stripMeta(row));
      if (parsed.success) {
        return parsed.data;
      }
      log.warn("Invalid discount settings in Supabase, returning defaults.", parsed.error);
    } else {
      await upsertSettingsDoc(DISCOUNT_SETTINGS_DOC_ID, defaultDiscountSettings);
    }
  } catch (error) {
    log.error("Error fetching discount settings", error);
  }
  return defaultDiscountSettings;
};

export const saveDiscountSettings = async (settings: DiscountSettings): Promise<void> => {
  try {
    const validated = DiscountSettingsSchema.parse(settings);
    await upsertSettingsDoc(DISCOUNT_SETTINGS_DOC_ID, validated);
    log.info("Discount settings saved successfully");
  } catch (error) {
    log.error("Error saving discount settings", error);
    throw new Error("Failed to save discount settings.");
  }
};

export const validateDiscountCode = async (code: string): Promise<DiscountValidationResult> => {
  try {
    const settings = await getDiscountSettings();
    const normalizedCode = code.trim().toUpperCase();

    const discount = settings.discounts.find(
      d => d.discountCode.toUpperCase() === normalizedCode
    );

    if (!discount) {
      return { valid: false, error: "Código de descuento no encontrado" };
    }

    if (!discount.isActive) {
      return { valid: false, error: "Este código de descuento está inactivo" };
    }

    if (!isDiscountValid(discount)) {
      return { valid: false, error: "Este código de descuento ha expirado o aún no es válido" };
    }

    return { valid: true, discount };
  } catch (error) {
    log.error("Error validating discount code", error);
    return { valid: false, error: "Error al validar el código de descuento" };
  }
};
