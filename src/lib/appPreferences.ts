import { enUS, es, type Locale } from "date-fns/locale";
import {
  type AppPreferences,
  AppPreferencesSchema,
  type AppSupportedCurrency,
  type AppSupportedLanguage,
  type AppSupportedLocale,
} from "@/types";

export const APP_PREFERENCES_STORAGE_KEY = "app_preferences";

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  currency: "MXN",
  language: "es",
  locale: "es-MX",
};

const CURRENCY_LABELS: Record<AppSupportedCurrency, string> = {
  MXN: "Peso Mexicano",
  USD: "US Dollar",
  EUR: "Euro",
  COP: "Peso Colombiano",
};

let runtimePreferences: AppPreferences = DEFAULT_APP_PREFERENCES;
let initializedFromStorage = false;

export const resolveLocaleFromLanguage = (language: AppSupportedLanguage): AppSupportedLocale =>
  language === "en" ? "en-US" : "es-MX";

export const getCurrencyLabel = (currency: AppSupportedCurrency): string => CURRENCY_LABELS[currency];

export const normalizeAppPreferences = (value: unknown): AppPreferences => {
  const parsed = AppPreferencesSchema.safeParse(value);
  if (!parsed.success) {
    return { ...DEFAULT_APP_PREFERENCES };
  }
  return parsed.data;
};

const loadPreferencesFromStorage = (): AppPreferences | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(APP_PREFERENCES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = normalizeAppPreferences(JSON.parse(raw));
    return parsed;
  } catch {
    return null;
  }
};

const savePreferencesToStorage = (preferences: AppPreferences) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(APP_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Ignorar errores de cuota o disponibilidad de storage.
  }
};

export const setRuntimeAppPreferences = (preferences: AppPreferences) => {
  runtimePreferences = normalizeAppPreferences(preferences);
  savePreferencesToStorage(runtimePreferences);
};

export const getRuntimeAppPreferences = (): AppPreferences => {
  if (typeof window === "undefined") {
    return runtimePreferences;
  }

  if (!initializedFromStorage) {
    const saved = loadPreferencesFromStorage();
    if (saved) {
      runtimePreferences = saved;
    }
    initializedFromStorage = true;
  }

  return runtimePreferences;
};

export const getDateFnsLocale = (preferences?: AppPreferences): Locale => {
  const prefs = preferences ?? getRuntimeAppPreferences();
  return prefs.language === "en" ? enUS : es;
};

export const formatCurrencyWithPreferences = (amount: number, preferences?: AppPreferences): string => {
  const prefs = preferences ?? getRuntimeAppPreferences();
  return new Intl.NumberFormat(prefs.locale, {
    style: "currency",
    currency: prefs.currency,
  }).format(amount);
};

export const formatNumberWithPreferences = (value: number, preferences?: AppPreferences): string => {
  const prefs = preferences ?? getRuntimeAppPreferences();
  return new Intl.NumberFormat(prefs.locale, { maximumFractionDigits: 2 }).format(value);
};

export const formatDateTimeWithPreferences = (
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  preferences?: AppPreferences
): string => {
  const prefs = preferences ?? getRuntimeAppPreferences();
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat(
    prefs.locale,
    options ?? {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
};
