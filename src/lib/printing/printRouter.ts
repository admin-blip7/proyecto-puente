"use client";

import type { PrintRoutingSettings } from "@/types";
import { getPrintRoutingSettings } from "@/lib/services/settingsService";
import { printPdfWithQz } from "@/lib/printing/qzTrayClient";

export type PrintDocumentType = "ticket" | "label";

const LOCAL_STORAGE_KEY = "print-routing-settings";

const defaultSettings: PrintRoutingSettings = {
  useQzTray: false,
  ticketPrinterName: "",
  labelPrinterName: "",
};

const getCachedSettings = (): PrintRoutingSettings | null => {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PrintRoutingSettings>;
    return {
      useQzTray: Boolean(parsed.useQzTray),
      ticketPrinterName: parsed.ticketPrinterName || "",
      labelPrinterName: parsed.labelPrinterName || "",
    };
  } catch {
    return null;
  }
};

const cacheSettings = (settings: PrintRoutingSettings) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
};

const getSettings = async (): Promise<PrintRoutingSettings> => {
  const cached = getCachedSettings();
  if (cached) return cached;

  try {
    const settings = await getPrintRoutingSettings();
    cacheSettings(settings);
    return settings;
  } catch {
    return defaultSettings;
  }
};

export const savePrintRoutingSettingsCache = (settings: PrintRoutingSettings) => {
  cacheSettings(settings);
};

export const printViaBrowserDialog = (pdfBlob: Blob) => {
  const pdfUrl = URL.createObjectURL(pdfBlob);

  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = pdfUrl;
  document.body.appendChild(iframe);

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.print();
    }, 300);
  };

  setTimeout(() => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
    URL.revokeObjectURL(pdfUrl);
  }, 60000);
};

export const routePdfToPrinter = async (
  docType: PrintDocumentType,
  pdfBlob: Blob,
  options?: { fallbackToBrowser?: boolean }
): Promise<"qz" | "browser"> => {
  const fallbackToBrowser = options?.fallbackToBrowser ?? true;
  const settings = await getSettings();

  if (!settings.useQzTray) {
    if (fallbackToBrowser) {
      printViaBrowserDialog(pdfBlob);
      return "browser";
    }
    throw new Error("QZ Tray está desactivado en configuración.");
  }

  const printerName = docType === "ticket" ? settings.ticketPrinterName : settings.labelPrinterName;
  if (!printerName) {
    if (fallbackToBrowser) {
      printViaBrowserDialog(pdfBlob);
      return "browser";
    }
    throw new Error(`No hay impresora configurada para ${docType}.`);
  }

  try {
    await printPdfWithQz(printerName, pdfBlob);
    return "qz";
  } catch (error) {
    if (!fallbackToBrowser) {
      throw error;
    }

    printViaBrowserDialog(pdfBlob);
    return "browser";
  }
};
