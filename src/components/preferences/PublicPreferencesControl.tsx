"use client";

import { useTransition } from "react";
import {
  appSupportedCurrencies,
  appSupportedLanguages,
  type AppPreferences,
  type AppSupportedCurrency,
  type AppSupportedLanguage,
} from "@/types";
import { getCurrencyLabel, resolveLocaleFromLanguage } from "@/lib/appPreferences";
import { saveAppPreferences } from "@/lib/services/settingsService";
import { useAppPreferences } from "@/components/preferences/AppPreferencesProvider";
import { cn } from "@/lib/utils";

type PublicPreferencesControlProps = {
  className?: string;
  persist?: boolean;
};

export default function PublicPreferencesControl({
  className,
  persist = true,
}: PublicPreferencesControlProps) {
  const { preferences, setPreferences } = useAppPreferences();
  const [, startTransition] = useTransition();

  const persistChange = (next: AppPreferences) => {
    if (!persist) return;

    startTransition(() => {
      void saveAppPreferences(next).catch(() => {
        // No bloquea UX pública: el estado local sigue vigente.
      });
    });
  };

  const handleCurrencyChange = (currency: AppSupportedCurrency) => {
    const next = { ...preferences, currency };
    setPreferences(next);
    persistChange(next);
  };

  const handleLanguageChange = (language: AppSupportedLanguage) => {
    const next = {
      ...preferences,
      language,
      locale: resolveLocaleFromLanguage(language),
    };
    setPreferences(next);
    persistChange(next);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <select
        aria-label="Seleccionar idioma"
        value={preferences.language}
        onChange={(event) => handleLanguageChange(event.target.value as AppSupportedLanguage)}
        className="h-8 rounded-full border-none bg-brand-gray-100 px-3 text-xs font-bold text-brand-black shadow-sm outline-none transition-colors hover:bg-brand-gray-200 focus:ring-2 focus:ring-brand-gold dark:bg-brand-gray-800 dark:text-brand-white dark:hover:bg-brand-gray-700"
      >
        {appSupportedLanguages.map((language) => (
          <option key={language} value={language}>
            {language === "es" ? "ES" : "EN"}
          </option>
        ))}
      </select>

      <select
        aria-label="Seleccionar moneda"
        value={preferences.currency}
        onChange={(event) => handleCurrencyChange(event.target.value as AppSupportedCurrency)}
        className="h-8 rounded-full border-none bg-brand-gray-100 px-3 text-xs font-bold text-brand-black shadow-sm outline-none transition-colors hover:bg-brand-gray-200 focus:ring-2 focus:ring-brand-gold dark:bg-brand-gray-800 dark:text-brand-white dark:hover:bg-brand-gray-700"
      >
        {appSupportedCurrencies.map((currency) => (
          <option key={currency} value={currency}>
            {currency}
          </option>
        ))}
      </select>
    </div>
  );
}
