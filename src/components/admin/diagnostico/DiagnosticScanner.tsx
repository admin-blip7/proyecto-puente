"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Smartphone, RefreshCw, Wifi, WifiOff, ShieldCheck, ShieldX,
  Plus, CheckCircle2, Loader, Battery, Cpu, Hash, HardDrive,
  Signal, Globe, AlertTriangle, Info, ChevronDown, ChevronUp,
} from "lucide-react";
import AddToInventoryModal from "./AddToInventoryModal";

// ── Tipos ───────────────────────────────────────────────────────────────────

interface BatteryInfo {
  health_percent: number | null;
  cycle_count: number | null;
  full_charge_mah: number | null;
  design_mah: number | null;
  current_level_pct: number | null;
  voltage_mv: number | null;
  temperature_raw: number | null;
  source: string;
}

interface DeviceResult {
  udid: string;
  paired: boolean;
  error: string | null;
  // Identidad
  model_id?: string;
  model_name?: string;
  hardware_model?: string;
  model_number?: string;
  serial_number?: string;
  ios_version?: string;
  build_version?: string;
  baseband_version?: string;
  firmware_version?: string;
  // IMEI / Red celular
  imei?: string;
  imei2?: string;
  meid?: string;
  iccid?: string;
  phone_number?: string;
  carrier?: string;
  mcc?: string;
  mnc?: string;
  // Hardware
  cpu_arch?: string;
  ram_gb?: number;
  chip_id?: string;
  board_id?: string;
  color?: string;
  color_marketing?: string;
  // Almacenamiento
  storage_gb?: number;
  available_gb?: number;
  used_gb?: number;
  // Estado
  activation_state?: string;
  icloud_locked?: boolean;
  // Red local
  wifi_mac?: string;
  bluetooth_mac?: string;
  ethernet_mac?: string;
  // Batería
  battery?: BatteryInfo;
  battery_genuine_apple?: boolean | null;
  parts_status?: "no_alerts" | "replacement_detected" | "unknown";
  parts_note?: string;
}

interface AddedDevice { product_id: string; product_name: string; }

// ── Helpers UI ──────────────────────────────────────────────────────────────

// iOS recientes exponen códigos de color numéricos que cambian por familia.
const APPLE_HEX_COLORS: Record<string, string> = {
  "#1a1a1a": "Negro",
  "#f2f2f0": "Blanco / Plata",
  "#ff3b2f": "Rojo",
  "#ffd60a": "Amarillo",
  "#007aff": "Azul",
  "#34c759": "Verde",
};

const MODEL_COLOR_OVERRIDES: Record<string, Record<string, string>> = {
  // Ajuste observado en dispositivo real iPhone18,2.
  "iPhone18,2": {
    "1": "Naranja",
  },
};

function resolveColor(raw?: string | null, modelId?: string): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (modelId && MODEL_COLOR_OVERRIDES[modelId]?.[value]) {
    return MODEL_COLOR_OVERRIDES[modelId][value];
  }

  if (value.startsWith("#")) {
    return APPLE_HEX_COLORS[value.toLowerCase()] ?? value;
  }

  if (/^\d+$/.test(value)) {
    return `Color (${value})`;
  }

  return value;
}

function Row({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-muted/50 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={`text-xs text-right ${mono ? "font-mono" : "font-medium"}`}>{String(value)}</span>
    </div>
  );
}

function Empty({ msg }: { msg?: string }) {
  return (
    <p className="text-xs text-muted-foreground italic py-1">
      {msg ?? "No disponible para este dispositivo / versión de iOS"}
    </p>
  );
}

function Section({ title, icon: Icon, children, empty }: {
  title: string; icon: any; children?: React.ReactNode; empty?: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
      </div>
      {children ?? <Empty msg={empty} />}
    </div>
  );
}

function BatteryBar({ pct }: { pct: number }) {
  const color = pct >= 85 ? "bg-green-500" : pct >= 70 ? "bg-yellow-500" : "bg-red-500";
  const text = pct >= 85 ? "text-green-600" : pct >= 70 ? "text-yellow-600" : "text-red-600";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={`text-xs font-bold ${text}`}>{pct}%</span>
    </div>
  );
}

// ── Tarjeta de dispositivo ───────────────────────────────────────────────────

function DeviceCard({
  device, scanning, onScan, onAdd, added,
}: {
  device: DeviceResult;
  scanning: boolean;
  onScan: () => void;
  onAdd: () => void;
  added?: AddedDevice;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasData = !!device.serial_number;

  const tempC = device.battery?.temperature_raw
    ? (device.battery.temperature_raw / 100).toFixed(1)
    : null;

  const storageBar = device.storage_gb && device.used_gb
    ? Math.round((device.used_gb / device.storage_gb) * 100)
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Smartphone className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-base leading-tight">
                {device.model_name ?? "iPhone conectado"}
              </CardTitle>
              {device.model_number && (
                <p className="text-xs text-muted-foreground">{device.model_number}</p>
              )}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            {device.icloud_locked ? (
              <Badge variant="destructive" className="text-xs"><ShieldX className="h-3 w-3 mr-1" />iCloud</Badge>
            ) : device.activation_state === "Activated" ? (
              <Badge variant="outline" className="text-xs border-green-500 text-green-600"><ShieldCheck className="h-3 w-3 mr-1" />OK</Badge>
            ) : null}
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-mono truncate">{device.udid}</p>
      </CardHeader>

      <CardContent className="space-y-3">
        {device.error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950 p-2 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            {device.error}
          </div>
        )}

        {/* Batería — siempre visible si existe */}
        {device.battery && (
          <div className="rounded-lg bg-muted/50 p-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Battery className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Batería</span>
              {device.battery_genuine_apple === false && (
                <Badge variant="destructive" className="text-xs ml-auto">Batería no original</Badge>
              )}
              {device.battery_genuine_apple === true && (
                <Badge variant="outline" className="text-xs ml-auto border-green-500 text-green-600">Batería original</Badge>
              )}
            </div>
            {device.battery.health_percent !== null && (
              <BatteryBar pct={device.battery.health_percent!} />
            )}
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <Row label="Salud" value={device.battery.health_percent !== null ? `${device.battery.health_percent}%` : null} />
              <Row label="Ciclos" value={device.battery.cycle_count} />
              <Row label="Cap. actual" value={device.battery.full_charge_mah ? `${device.battery.full_charge_mah} mAh` : null} />
              <Row label="Cap. diseño" value={device.battery.design_mah ? `${device.battery.design_mah} mAh` : null} />
              <Row label="Nivel actual" value={device.battery.current_level_pct !== null ? `${device.battery.current_level_pct}%` : null} />
              <Row label="Voltaje" value={device.battery.voltage_mv ? `${device.battery.voltage_mv} mV` : null} />
              {tempC && <Row label="Temperatura" value={`${tempC} °C`} />}
            </div>
          </div>
        )}

        {/* Resumen rápido */}
        {hasData && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <Row label="Serial" value={device.serial_number} mono />
            <Row label="iOS" value={device.ios_version} />
            <Row label="Storage" value={device.storage_gb ? `${device.storage_gb} GB` : null} />
            <Row label="RAM" value={device.ram_gb ? `${device.ram_gb} GB` : null} />
            {storageBar !== null && (
              <Row label="Usado" value={`${device.used_gb} GB (${storageBar}%)`} />
            )}
          </div>
        )}

        {/* Detalles expandibles */}
        {hasData && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Ocultar detalles" : "Ver toda la información"}
          </button>
        )}

        {/* Batería — aviso si no disponible */}
        {!device.battery && hasData && (
          <div className="flex items-start gap-2 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-2 text-xs text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>Batería no disponible — <code>idevicediagnostics</code> puede no soportar iOS {device.ios_version ?? "26"}. Reintenta el escaneo con el iPhone desbloqueado.</span>
          </div>
        )}

        {expanded && (
          <div className="space-y-4 pt-1 border-t">
            {/* Identidad */}
            <Section title="Identidad" icon={Hash}>
              <Row label="Modelo ID" value={device.model_id} mono />
              <Row label="Hardware" value={device.hardware_model} mono />
              <Row label="Número modelo" value={device.model_number} />
              <Row label="Serial" value={device.serial_number} mono />
              <Row label="iOS" value={device.ios_version} />
              <Row label="Build" value={device.build_version} mono />
              <Row label="Baseband" value={device.baseband_version} mono />
              <Row
                label="Color"
                value={resolveColor(device.color_marketing ?? device.color, device.model_id)}
              />
              <Row label="iCloud" value={device.icloud_locked ? "Bloqueado ⚠️" : "Libre ✓"} />
              <Row label="Activación" value={device.activation_state} />
            </Section>

            {/* Hardware */}
            <Section title="Hardware" icon={Cpu}
              empty="No expuesto por ideviceinfo en esta versión de iOS">
              {(device.cpu_arch || device.chip_id || device.board_id) ? (
                <>
                  <Row label="CPU" value={device.cpu_arch} />
                  <Row label="RAM" value={device.ram_gb ? `${device.ram_gb} GB` : null} />
                  <Row label="Chip ID" value={device.chip_id} mono />
                  <Row label="Board ID" value={device.board_id} mono />
                </>
              ) : null}
            </Section>

            {/* Almacenamiento */}
            <Section title="Almacenamiento" icon={HardDrive}
              empty="No disponible — requiere iOS con ideviceinfo extendido">
              {(device.storage_gb || device.used_gb || device.available_gb) ? (
                <>
                  <Row label="Total" value={device.storage_gb ? `${device.storage_gb} GB` : null} />
                  <Row label="Usado" value={device.used_gb ? `${device.used_gb} GB` : null} />
                  <Row label="Disponible" value={device.available_gb ? `${device.available_gb} GB` : null} />
                </>
              ) : null}
            </Section>

            {/* Red celular */}
            <Section title="Red celular" icon={Signal}
              empty="Sin datos de operador / SIM disponibles">
              {(device.imei || device.imei2 || device.carrier || device.iccid) ? (
                <>
                  <Row label="IMEI" value={device.imei} mono />
                  <Row label="IMEI 2" value={device.imei2} mono />
                  <Row label="MEID" value={device.meid} mono />
                  <Row label="ICCID" value={device.iccid} mono />
                  <Row label="Teléfono" value={device.phone_number} />
                  <Row label="Operador" value={device.carrier} />
                  <Row label="MCC/MNC" value={device.mcc && device.mnc ? `${device.mcc}/${device.mnc}` : null} />
                </>
              ) : null}
            </Section>

            {/* Red local */}
            <Section title="Red local" icon={Wifi}
              empty="MACs no disponibles en esta versión">
              {(device.wifi_mac || device.bluetooth_mac) ? (
                <>
                  <Row label="Wi-Fi MAC" value={device.wifi_mac} mono />
                  <Row label="Bluetooth" value={device.bluetooth_mac} mono />
                  {device.ethernet_mac && <Row label="Ethernet" value={device.ethernet_mac} mono />}
                </>
              ) : null}
            </Section>

            {/* Piezas */}
            <Section title="Piezas reemplazadas" icon={Info}>
              {device.battery_genuine_apple === false && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 dark:bg-red-950 rounded p-2 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Batería NO es original de Apple
                </div>
              )}
              {device.battery_genuine_apple === true && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 dark:bg-green-950 rounded p-2 mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  Batería original Apple confirmada
                </div>
              )}
              {device.parts_status === "no_alerts" && (
                <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 dark:bg-green-950 rounded p-2 mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  Sin alertas de piezas cambiadas (detección USB)
                </div>
              )}
              {device.parts_status === "replacement_detected" && (
                <div className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 dark:bg-red-950 rounded p-2 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Se detectó al menos una alerta de pieza reemplazada
                </div>
              )}
              {device.parts_status === "unknown" && (
                <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950 rounded p-2 mb-1">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Verificación completa de piezas OEM no disponible por USB en este iOS.
                </div>
              )}
              <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                <Globe className="h-3 w-3 inline mr-1" />
                {device.parts_note ?? "Revisa Ajustes › General › Acerca de › Piezas y servicio para confirmación completa."}
              </div>
            </Section>
          </div>
        )}

        {/* Acciones */}
        {added ? (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950 rounded p-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Agregado: <strong>{added.product_name}</strong></span>
          </div>
        ) : (
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={onScan} disabled={scanning}>
              {scanning
                ? <Loader className="h-4 w-4 animate-spin mr-1" />
                : <RefreshCw className="h-4 w-4 mr-1" />}
              {scanning ? "Escaneando..." : hasData ? "Re-escanear" : "Escanear"}
            </Button>
            {hasData && !device.error && (
              <Button size="sm" onClick={onAdd}>
                <Plus className="h-4 w-4 mr-1" />Agregar a Inventario
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Scanner principal ────────────────────────────────────────────────────────

export default function DiagnosticScanner() {
  const [serviceOnline, setServiceOnline] = useState<boolean | null>(null);
  const [missingTools, setMissingTools] = useState<string[]>([]);
  const [deviceUdids, setDeviceUdids] = useState<string[]>([]);
  const [deviceResults, setDeviceResults] = useState<Record<string, DeviceResult>>({});
  const [scanningAll, setScanningAll] = useState(false);
  const [scanningDevice, setScanningDevice] = useState<Record<string, boolean>>({});
  const [addedDevices, setAddedDevices] = useState<Record<string, AddedDevice>>({});
  const [modalDevice, setModalDevice] = useState<DeviceResult | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch("/api/diagnostics/devices", { cache: "no-store" });
      const data = await res.json();
      if (res.status === 503 || data.error === "service_offline") {
        setServiceOnline(false);
        setMissingTools(Array.isArray(data.missing_tools) ? data.missing_tools : []);
        setDeviceUdids([]);
        return;
      }
      setServiceOnline(true);
      setMissingTools([]);
      setDeviceUdids(data.devices ?? []);
    } catch {
      setServiceOnline(false);
      setMissingTools([]);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
    pollingRef.current = setInterval(fetchDevices, 4000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchDevices]);

  const scanDevice = useCallback(async (udid: string) => {
    setScanningDevice((p) => ({ ...p, [udid]: true }));
    try {
      const res = await fetch(`/api/diagnostics/scan?udid=${udid}`, { cache: "no-store" });
      const data = await res.json();
      if (res.status === 503 || data.error === "service_offline") {
        setServiceOnline(false);
        setMissingTools(Array.isArray(data.missing_tools) ? data.missing_tools : []);
        return;
      }
      setServiceOnline(true);
      setDeviceResults((p) => ({ ...p, [udid]: data }));
    } finally {
      setScanningDevice((p) => ({ ...p, [udid]: false }));
    }
  }, []);

  const scanAll = useCallback(async () => {
    setScanningAll(true);
    try {
      const res = await fetch("/api/diagnostics/scan", { cache: "no-store" });
      const data = await res.json();
      if (res.status === 503 || data.error === "service_offline") {
        setServiceOnline(false);
        setMissingTools(Array.isArray(data.missing_tools) ? data.missing_tools : []);
        return;
      }
      setServiceOnline(true);
      const m: Record<string, DeviceResult> = {};
      for (const r of data.results ?? []) m[r.udid] = r;
      setDeviceResults((p) => ({ ...p, ...m }));
    } finally { setScanningAll(false); }
  }, []);

  const allUdids = Array.from(new Set([...deviceUdids, ...Object.keys(deviceResults)]));

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {serviceOnline === null
            ? <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
            : serviceOnline
              ? <Wifi className="h-4 w-4 text-green-600" />
              : <WifiOff className="h-4 w-4 text-red-500" />}
          <span className="text-sm text-muted-foreground">
            {serviceOnline === null ? "Conectando..."
              : serviceOnline
                ? `Scanner local activo · ${deviceUdids.length} dispositivo${deviceUdids.length !== 1 ? "s" : ""} conectado${deviceUdids.length !== 1 ? "s" : ""}`
                : "Scanner offline — ve a la pestaña Configuración"}
          </span>
        </div>
        {serviceOnline && deviceUdids.length > 0 && (
          <Button size="sm" onClick={scanAll} disabled={scanningAll}>
            {scanningAll ? <Loader className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Escanear todos
          </Button>
        )}
      </div>

      {serviceOnline === false && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <WifiOff className="h-8 w-8 mx-auto mb-2" />
          <p className="font-medium">Scanner no disponible</p>
          <p className="text-sm mt-1">Ve a la pestaña <strong>Configuración</strong> para instalar/verificar <code>libimobiledevice</code>.</p>
          {missingTools.length > 0 && (
            <p className="text-xs mt-2 font-mono text-red-600">
              Faltan: {missingTools.join(", ")}
            </p>
          )}
        </div>
      )}

      {serviceOnline && deviceUdids.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <Smartphone className="h-8 w-8 mx-auto mb-2" />
          <p className="font-medium">Sin dispositivos conectados</p>
          <p className="text-sm mt-1">Conecta un iPhone por USB y acepta el par en el dispositivo.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {allUdids.map((udid) => (
          <DeviceCard
            key={udid}
            device={deviceResults[udid] ?? { udid, paired: false, error: null }}
            scanning={!!scanningDevice[udid]}
            onScan={() => scanDevice(udid)}
            onAdd={() => setModalDevice(deviceResults[udid])}
            added={addedDevices[udid]}
          />
        ))}
      </div>

      {modalDevice && (
        <AddToInventoryModal
          device={modalDevice as any}
          open={!!modalDevice}
          onClose={() => setModalDevice(null)}
          onAdded={(productId, productName) => {
            setAddedDevices((p) => ({ ...p, [modalDevice.udid]: { product_id: productId, product_name: productName } }));
            setModalDevice(null);
          }}
        />
      )}
    </div>
  );
}
