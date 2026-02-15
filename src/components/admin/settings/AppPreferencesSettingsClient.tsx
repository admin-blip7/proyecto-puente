"use client";

import { useMemo, useState } from "react";
import {
  type AppPreferences,
  appSupportedCurrencies,
  appSupportedLanguages,
  type AppSupportedLanguage,
} from "@/types";
import { getCurrencyLabel, resolveLocaleFromLanguage } from "@/lib/appPreferences";
import { saveAppPreferences } from "@/lib/services/settingsService";
import { useToast } from "@/hooks/use-toast";
import { useAppPreferences } from "@/components/preferences/AppPreferencesProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe2, Loader2, Save } from "lucide-react";

interface AppPreferencesSettingsClientProps {
  initialPreferences: AppPreferences;
}

export default function AppPreferencesSettingsClient({ initialPreferences }: AppPreferencesSettingsClientProps) {
  const { setPreferences } = useAppPreferences();
  const { toast } = useToast();
  const [formState, setFormState] = useState<AppPreferences>(initialPreferences);
  const [savedState, setSavedState] = useState<AppPreferences>(initialPreferences);
  const [isSaving, setIsSaving] = useState(false);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(formState) !== JSON.stringify(savedState),
    [formState, savedState]
  );

  const handleLanguageChange = (language: AppSupportedLanguage) => {
    setFormState((prev) => ({
      ...prev,
      language,
      locale: resolveLocaleFromLanguage(language),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveAppPreferences(formState);
      setSavedState(formState);
      setPreferences(formState);
      toast({
        title: "Preferencias guardadas",
        description: "Moneda e idioma global actualizados para todo el sistema.",
      });
    } catch (error) {
      toast({
        title: "No se pudo guardar",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración General</h1>
        <p className="text-muted-foreground">
          Define la moneda e idioma globales para todas las páginas del sistema.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe2 className="h-4 w-4" />
            Moneda e idioma
          </CardTitle>
          <CardDescription>
            Estas preferencias se usan para formatear montos y contenido de fechas a nivel global.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="global-currency">Moneda global</Label>
            <Select
              value={formState.currency}
              onValueChange={(value) =>
                setFormState((prev) => ({
                  ...prev,
                  currency: value as AppPreferences["currency"],
                }))
              }
            >
              <SelectTrigger id="global-currency">
                <SelectValue placeholder="Selecciona moneda" />
              </SelectTrigger>
              <SelectContent>
                {appSupportedCurrencies.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currency} - {getCurrencyLabel(currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="global-language">Idioma global</Label>
            <Select value={formState.language} onValueChange={(value) => handleLanguageChange(value as AppSupportedLanguage)}>
              <SelectTrigger id="global-language">
                <SelectValue placeholder="Selecciona idioma" />
              </SelectTrigger>
              <SelectContent>
                {appSupportedLanguages.map((language) => (
                  <SelectItem key={language} value={language}>
                    {language === "es" ? "Español" : "English"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Locale activo</Label>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">{formState.locale}</div>
          </div>
        </CardContent>
      </Card>

      <Button type="button" onClick={handleSave} disabled={isSaving || !hasUnsavedChanges}>
        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Guardar configuración global
      </Button>
    </div>
  );
}
