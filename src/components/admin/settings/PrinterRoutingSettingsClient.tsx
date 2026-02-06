"use client";

import { useEffect, useMemo, useState } from "react";
import type { PrintRoutingSettings } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { savePrintRoutingSettings } from "@/lib/services/settingsService";
import { connectQz, findQzPrinters, isQzActive } from "@/lib/printing/qzTrayClient";
import { savePrintRoutingSettingsCache } from "@/lib/printing/printRouter";
import { CheckCircle2, Loader2, RefreshCcw, Save, Wifi, WifiOff } from "lucide-react";

interface PrinterRoutingSettingsClientProps {
  initialSettings: PrintRoutingSettings;
}

const EMPTY_VALUE = "__none__";

export default function PrinterRoutingSettingsClient({ initialSettings }: PrinterRoutingSettingsClientProps) {
  const [savedSettings, setSavedSettings] = useState<PrintRoutingSettings>(initialSettings);
  const [settings, setSettings] = useState<PrintRoutingSettings>(initialSettings);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSignedModeReady, setIsSignedModeReady] = useState(false);
  const [printers, setPrinters] = useState<string[]>([]);
  const { toast } = useToast();

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(savedSettings);
  }, [savedSettings, settings]);

  useEffect(() => {
    void checkConnection();
    void (async () => {
      try {
        const response = await fetch("/api/qz/certificate", { cache: "no-store" });
        setIsSignedModeReady(response.ok);
      } catch {
        setIsSignedModeReady(false);
      }
    })();
  }, []);

  const checkConnection = async () => {
    const active = await isQzActive();
    setIsConnected(active);
    return active;
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connectQz();
      await checkConnection();
      toast({ title: "QZ Tray conectado", description: "La conexión local está activa." });
    } catch (error) {
      toast({
        title: "No se pudo conectar QZ Tray",
        description: error instanceof Error ? error.message : "Verifica que QZ Tray esté abierto.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLoadPrinters = async () => {
    setIsLoadingPrinters(true);
    try {
      if (!(await checkConnection())) {
        await connectQz();
        await checkConnection();
      }

      const found = await findQzPrinters();
      setPrinters(found);

      if (found.length === 0) {
        toast({ title: "Sin impresoras", description: "QZ Tray no encontró impresoras disponibles." });
      } else {
        toast({ title: "Impresoras detectadas", description: `Se encontraron ${found.length} impresoras.` });
      }
    } catch (error) {
      toast({
        title: "No se pudieron cargar impresoras",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPrinters(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await savePrintRoutingSettings(settings);
      savePrintRoutingSettingsCache(settings);
      setSavedSettings(settings);

      toast({
        title: "Configuración guardada",
        description: "Ticket y etiquetas ya usarán su impresora correspondiente.",
      });
    } catch (error) {
      toast({
        title: "Error al guardar",
        description: error instanceof Error ? error.message : "No se pudo guardar la configuración.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Impresoras</h1>
        <p className="text-muted-foreground">
          Configura una impresora para tickets y otra para etiquetas con QZ Tray.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isConnected ? <Wifi className="h-4 w-4 text-emerald-600" /> : <WifiOff className="h-4 w-4 text-muted-foreground" />}
            Estado de QZ Tray
          </CardTitle>
          <CardDescription>
            Abre QZ Tray en esta computadora y conecta para habilitar impresión dirigida.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleConnect} disabled={isConnecting || isLoadingPrinters}>
              {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Conectar QZ Tray
            </Button>
            <Button type="button" variant="outline" onClick={handleLoadPrinters} disabled={isConnecting || isLoadingPrinters}>
              {isLoadingPrinters ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              Buscar impresoras
            </Button>
          </div>

          <div className="flex items-center space-x-2 rounded-md border p-3">
            <Switch
              id="use-qz"
              checked={settings.useQzTray}
              onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, useQzTray: checked }))}
            />
            <Label htmlFor="use-qz">Usar QZ Tray para impresión automática</Label>
          </div>

          <div className="text-xs text-muted-foreground">
            Modo firmado: {isSignedModeReady ? "configurado" : "no configurado (se usará modo no firmado con más avisos)."}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Impresora de Tickets</Label>
              <Select
                value={settings.ticketPrinterName || EMPTY_VALUE}
                onValueChange={(value) => setSettings((prev) => ({ ...prev, ticketPrinterName: value === EMPTY_VALUE ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona impresora de tickets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_VALUE}>Sin asignar</SelectItem>
                  {printers.map((printer) => (
                    <SelectItem key={printer} value={printer}>
                      {printer}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Impresora de Etiquetas</Label>
              <Select
                value={settings.labelPrinterName || EMPTY_VALUE}
                onValueChange={(value) => setSettings((prev) => ({ ...prev, labelPrinterName: value === EMPTY_VALUE ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona impresora de etiquetas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_VALUE}>Sin asignar</SelectItem>
                  {printers.map((printer) => (
                    <SelectItem key={printer} value={printer}>
                      {printer}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="button" onClick={handleSave} disabled={isSaving || !hasUnsavedChanges}>
        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Guardar configuración de impresoras
      </Button>
    </div>
  );
}
