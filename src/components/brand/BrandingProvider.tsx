"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { BrandingSettings } from "@/types";
import { getBrandingSettings } from "@/lib/services/settingsService";
import { Skeleton } from "../ui/skeleton";

interface BrandingContextType {
  settings: BrandingSettings;
  setSettings: React.Dispatch<React.SetStateAction<BrandingSettings>>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<BrandingSettings | null>(null);

  useEffect(() => {
    getBrandingSettings().then(setSettings);
  }, []);

  if (!settings) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="w-full max-w-sm space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <BrandingContext.Provider value={{ settings, setSettings: setSettings as React.Dispatch<React.SetStateAction<BrandingSettings>> }}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error("useBranding must be used within a BrandingProvider");
  }
  return context;
};
