"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { AppPreferences } from "@/types";
import { normalizeAppPreferences, setRuntimeAppPreferences } from "@/lib/appPreferences";

type AppPreferencesContextValue = {
  preferences: AppPreferences;
  setPreferences: (preferences: AppPreferences) => void;
};

const AppPreferencesContext = createContext<AppPreferencesContextValue | undefined>(undefined);

type AppPreferencesProviderProps = {
  initialPreferences: AppPreferences;
  children: ReactNode;
};

export function AppPreferencesProvider({ initialPreferences, children }: AppPreferencesProviderProps) {
  const [preferences, setPreferencesState] = useState<AppPreferences>(() => {
    const normalized = normalizeAppPreferences(initialPreferences);
    setRuntimeAppPreferences(normalized);
    return normalized;
  });

  const setPreferences = (nextPreferences: AppPreferences) => {
    const normalized = normalizeAppPreferences(nextPreferences);
    setPreferencesState(normalized);
    setRuntimeAppPreferences(normalized);
  };

  const value = useMemo(
    () => ({
      preferences,
      setPreferences,
    }),
    [preferences]
  );

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext);
  if (!context) {
    throw new Error("useAppPreferences must be used within AppPreferencesProvider");
  }
  return context;
}
