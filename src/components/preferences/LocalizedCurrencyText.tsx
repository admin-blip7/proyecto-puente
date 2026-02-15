"use client";

import { useMemo } from "react";
import { useAppPreferences } from "@/components/preferences/AppPreferencesProvider";

type LocalizedCurrencyTextProps = {
  amount: number;
  className?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

export default function LocalizedCurrencyText({
  amount,
  className,
  minimumFractionDigits,
  maximumFractionDigits,
}: LocalizedCurrencyTextProps) {
  const { preferences } = useAppPreferences();

  const formatted = useMemo(() => {
    return new Intl.NumberFormat(preferences.locale, {
      style: "currency",
      currency: preferences.currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(Number.isFinite(amount) ? amount : 0);
  }, [amount, maximumFractionDigits, minimumFractionDigits, preferences.currency, preferences.locale]);

  return <span className={className}>{formatted}</span>;
}
