import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_BUFFER_BYTES = 1024 * 1024;
const TOOL_CHECK_TTL_MS = 15_000;

const REQUIRED_TOOLS = [
  "idevice_id",
  "ideviceinfo",
  "idevicediagnostics",
  "idevicepair",
] as const;

type Primitive = string | number | boolean | null;
type ParsedMap = Record<string, Primitive>;

interface CommandResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

interface ToolCache {
  checkedAt: number;
  missingTools: string[];
}

export interface DiagnosticsEnvironment {
  ready: boolean;
  missing_tools: string[];
}

export interface BatteryInfo {
  health_percent: number | null;
  cycle_count: number | null;
  full_charge_mah: number | null;
  design_mah: number | null;
  current_level_pct: number | null;
  voltage_mv: number | null;
  temperature_raw: number | null;
  source: string;
}

export interface DeviceResult {
  udid: string;
  paired: boolean;
  error: string | null;
  model_id?: string;
  model_name?: string;
  hardware_model?: string;
  model_number?: string;
  serial_number?: string;
  ios_version?: string;
  build_version?: string;
  baseband_version?: string;
  firmware_version?: string;
  imei?: string;
  imei2?: string;
  meid?: string;
  iccid?: string;
  phone_number?: string;
  carrier?: string;
  mcc?: string;
  mnc?: string;
  cpu_arch?: string;
  ram_gb?: number;
  chip_id?: string;
  board_id?: string;
  color?: string;
  color_marketing?: string;
  storage_gb?: number;
  available_gb?: number;
  used_gb?: number;
  activation_state?: string;
  icloud_locked?: boolean;
  wifi_mac?: string;
  bluetooth_mac?: string;
  ethernet_mac?: string;
  battery?: BatteryInfo;
  battery_genuine_apple?: boolean | null;
  parts_status?: "no_alerts" | "replacement_detected" | "unknown";
  parts_note?: string;
}

let toolCache: ToolCache | null = null;
const batteryCache = new Map<
  string,
  { battery?: BatteryInfo; batteryGenuineApple?: boolean | null }
>();

const IPHONE_MODELS: Record<string, string> = {
  "iPhone18,1": "iPhone 17",
  "iPhone18,2": "iPhone 17 Pro Max",
  "iPhone18,3": "iPhone 17 Pro",
  "iPhone18,4": "iPhone 17 Plus",
  "iPhone17,1": "iPhone 16 Pro",
  "iPhone17,2": "iPhone 16 Pro Max",
  "iPhone17,3": "iPhone 16",
  "iPhone17,4": "iPhone 16 Plus",
  "iPhone16,1": "iPhone 15 Pro",
  "iPhone16,2": "iPhone 15 Pro Max",
  "iPhone15,4": "iPhone 15",
  "iPhone15,5": "iPhone 15 Plus",
  "iPhone15,2": "iPhone 14 Pro",
  "iPhone15,3": "iPhone 14 Pro Max",
  "iPhone14,7": "iPhone 14",
  "iPhone14,8": "iPhone 14 Plus",
  "iPhone14,6": "iPhone SE (3rd gen)",
  "iPhone14,2": "iPhone 13 Pro",
  "iPhone14,3": "iPhone 13 Pro Max",
  "iPhone14,4": "iPhone 13 Mini",
  "iPhone14,5": "iPhone 13",
  "iPhone13,1": "iPhone 12 Mini",
  "iPhone13,2": "iPhone 12",
  "iPhone13,3": "iPhone 12 Pro",
  "iPhone13,4": "iPhone 12 Pro Max",
  "iPhone12,1": "iPhone 11",
  "iPhone12,3": "iPhone 11 Pro",
  "iPhone12,5": "iPhone 11 Pro Max",
  "iPhone12,8": "iPhone SE (2nd gen)",
  "iPhone11,2": "iPhone XS",
  "iPhone11,4": "iPhone XS Max",
  "iPhone11,6": "iPhone XS Max",
  "iPhone11,8": "iPhone XR",
  "iPhone10,3": "iPhone X",
  "iPhone10,6": "iPhone X",
  "iPhone10,1": "iPhone 8",
  "iPhone10,4": "iPhone 8",
  "iPhone10,2": "iPhone 8 Plus",
  "iPhone10,5": "iPhone 8 Plus",
  "iPhone9,1": "iPhone 7",
  "iPhone9,2": "iPhone 7 Plus",
  "iPhone9,3": "iPhone 7",
  "iPhone9,4": "iPhone 7 Plus",
};

const IPHONE_RAM_GB: Record<string, number> = {
  "iPhone18,1": 8,
  "iPhone18,2": 12,
  "iPhone18,3": 12,
  "iPhone18,4": 12,
  "iPhone17,1": 8,
  "iPhone17,2": 8,
  "iPhone17,3": 8,
  "iPhone17,4": 8,
  "iPhone16,1": 8,
  "iPhone16,2": 8,
  "iPhone15,2": 6,
  "iPhone15,3": 6,
  "iPhone15,4": 6,
  "iPhone15,5": 6,
};

function parsePrimitive(raw: string): Primitive {
  const value = raw.trim().replace(/^"(.*)"$/, "$1");

  if (!value || value === "<null>" || value.toLowerCase() === "nil") {
    return null;
  }

  const lower = value.toLowerCase();
  if (lower === "true" || lower === "yes") return true;
  if (lower === "false" || lower === "no") return false;

  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  return value;
}

function parseKeyValueOutput(output: string): ParsedMap {
  const parsed: ParsedMap = {};
  const lines = output.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === "{" || line === "}") continue;

    const match = line.match(/^"?(.+?)"?\s*(?::|=)\s*(.+?);?$/);
    if (!match) continue;

    const key = match[1]?.trim();
    const value = match[2]?.trim();
    if (!key || !value) continue;

    parsed[key] = parsePrimitive(value);
  }

  return parsed;
}

function pickString(source: ParsedMap | null, keys: string[]): string | undefined {
  if (!source) return undefined;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
    if (typeof value === "boolean") return value ? "true" : "false";
  }
  return undefined;
}

function pickNumber(source: ParsedMap | null, keys: string[]): number | undefined {
  if (!source) return undefined;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) {
      return Number(value);
    }
  }
  return undefined;
}

function pickBoolean(source: ParsedMap | null, keys: string[]): boolean | undefined {
  if (!source) return undefined;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const lower = value.toLowerCase();
      if (lower === "true" || lower === "yes") return true;
      if (lower === "false" || lower === "no") return false;
    }
  }
  return undefined;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function toNullable(value: number | undefined): number | null {
  return value === undefined ? null : value;
}

function bytesToGb(value: number | undefined, decimals = 0): number | undefined {
  if (value === undefined) return undefined;
  // iOS Ajustes muestra almacenamiento en base decimal (GB, 10^9).
  const gb = value / 1_000_000_000;
  const factor = 10 ** decimals;
  return Math.round(gb * factor) / factor;
}

async function getDiskUsageBytes(udid: string): Promise<{
  totalDiskBytes?: number;
  totalDataCapacityBytes?: number;
  totalDataAvailableBytes?: number;
  amountDataAvailableBytes?: number;
}> {
  const xmlResult = await runCommand("ideviceinfo", [
    "-u",
    udid,
    "-q",
    "com.apple.disk_usage",
    "-x",
  ]);

  if (xmlResult.ok && xmlResult.stdout.includes("<plist")) {
    const totalDiskBytes = pickPlistNumber(xmlResult.stdout, [
      "TotalDiskCapacity",
      "AmountTotalDiskCapacity",
    ]);
    const totalDataCapacityBytes = pickPlistNumber(xmlResult.stdout, [
      "TotalDataCapacity",
      "AmountDataCapacity",
    ]);
    const totalDataAvailableBytes = pickPlistNumber(xmlResult.stdout, [
      "TotalDataAvailable",
    ]);
    const amountDataAvailableBytes = pickPlistNumber(xmlResult.stdout, [
      "AmountDataAvailable",
    ]);

    if (
      totalDiskBytes !== undefined ||
      totalDataCapacityBytes !== undefined ||
      totalDataAvailableBytes !== undefined ||
      amountDataAvailableBytes !== undefined
    ) {
      return {
        totalDiskBytes,
        totalDataCapacityBytes,
        totalDataAvailableBytes,
        amountDataAvailableBytes,
      };
    }
  }

  const parsed = await getCommandMap("ideviceinfo", [
    "-u",
    udid,
    "-q",
    "com.apple.disk_usage",
  ]);

  return {
    totalDiskBytes:
      pickNumber(parsed, ["TotalDiskCapacity", "AmountTotalDiskCapacity"]) ?? undefined,
    totalDataCapacityBytes:
      pickNumber(parsed, ["TotalDataCapacity", "AmountDataCapacity"]) ?? undefined,
    totalDataAvailableBytes:
      pickNumber(parsed, ["TotalDataAvailable"]) ?? undefined,
    amountDataAvailableBytes:
      pickNumber(parsed, ["AmountDataAvailable"]) ?? undefined,
  };
}

function extractPlistPrimitive(plistXml: string, keyPath: string): Primitive | undefined {
  try {
    const raw = execFileSync(
      "plutil",
      ["-extract", keyPath, "raw", "-o", "-", "-"],
      {
        input: plistXml,
        maxBuffer: MAX_BUFFER_BYTES,
        stdio: ["pipe", "pipe", "ignore"],
        encoding: "utf-8",
      }
    ).trim();

    if (!raw) return undefined;
    return parsePrimitive(raw);
  } catch {
    return undefined;
  }
}

function pickPlistNumber(plistXml: string, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = extractPlistPrimitive(plistXml, key);
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) {
      return Number(value);
    }
  }
  return undefined;
}

function pickPlistBoolean(plistXml: string, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = extractPlistPrimitive(plistXml, key);
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const lower = value.toLowerCase();
      if (lower === "true" || lower === "yes") return true;
      if (lower === "false" || lower === "no") return false;
    }
  }
  return undefined;
}

async function runCommand(
  command: string,
  args: string[],
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      timeout: timeoutMs,
      maxBuffer: MAX_BUFFER_BYTES,
    });

    return {
      ok: true,
      stdout: String(stdout ?? ""),
      stderr: String(stderr ?? ""),
    };
  } catch (error) {
    const err = error as Error & {
      code?: string;
      stdout?: string | Buffer;
      stderr?: string | Buffer;
    };

    const stdout =
      typeof err.stdout === "string" ? err.stdout : err.stdout?.toString() ?? "";
    const stderr =
      typeof err.stderr === "string"
        ? err.stderr
        : err.stderr?.toString() ?? err.message;

    return { ok: false, stdout, stderr };
  }
}

async function commandExists(command: string): Promise<boolean> {
  try {
    await execFileAsync(command, ["--help"], {
      timeout: 4_000,
      maxBuffer: MAX_BUFFER_BYTES,
    });
    return true;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return false;
    return true;
  }
}

async function getMissingTools(force = false): Promise<string[]> {
  const now = Date.now();
  if (
    !force &&
    toolCache &&
    now - toolCache.checkedAt < TOOL_CHECK_TTL_MS
  ) {
    return toolCache.missingTools;
  }

  const checks = await Promise.all(
    REQUIRED_TOOLS.map(async (tool) => ({
      tool,
      exists: await commandExists(tool),
    }))
  );

  const missingTools = checks.filter((item) => !item.exists).map((item) => item.tool);
  toolCache = { checkedAt: now, missingTools };
  return missingTools;
}

async function getCommandMap(command: string, args: string[]): Promise<ParsedMap | null> {
  const result = await runCommand(command, args);
  if (!result.ok || !result.stdout.trim()) return null;
  return parseKeyValueOutput(result.stdout);
}

function buildDeviceReadError(stderr: string): string {
  const clean = stderr.replace(/\s+/g, " ").trim();
  if (!clean) {
    return "No se pudo leer el dispositivo. Acepta 'Confiar' en el iPhone y reintenta.";
  }
  return `No se pudo leer el dispositivo. Acepta 'Confiar' en el iPhone y reintenta. (${clean})`;
}

async function readBatteryInfo(
  udid: string
): Promise<{ battery?: BatteryInfo; batteryGenuineApple?: boolean | null }> {
  const ioregResult = await runCommand("idevicediagnostics", [
    "-u",
    udid,
    "ioregentry",
    "AppleSmartBattery",
  ]);

  if (ioregResult.ok && ioregResult.stdout.includes("<plist")) {
    const cycleCount = pickPlistNumber(ioregResult.stdout, [
      "IORegistry.BatteryData.CycleCount",
      "IORegistry.CycleCount",
      "IORegistry.BatteryCycleCount",
    ]);

    const designMah = pickPlistNumber(ioregResult.stdout, [
      "IORegistry.BatteryData.DesignCapacity",
      "IORegistry.DesignCapacity",
    ]);

    const fullChargeMah = pickPlistNumber(ioregResult.stdout, [
      "IORegistry.AppleRawMaxCapacity",
      "IORegistry.NominalChargeCapacity",
      "IORegistry.FullChargeCapacity",
    ]);

    const currentPct = pickPlistNumber(ioregResult.stdout, [
      "IORegistry.CurrentCapacity",
      "IORegistry.BatteryCurrentCapacity",
    ]);

    const voltageMv = pickPlistNumber(ioregResult.stdout, [
      "IORegistry.Voltage",
      "IORegistry.AppleRawBatteryVoltage",
    ]);

    const temperatureRaw = pickPlistNumber(ioregResult.stdout, [
      "IORegistry.Temperature",
      "IORegistry.VirtualTemperature",
    ]);

    const batteryHealthMetric = pickPlistNumber(ioregResult.stdout, [
      "IORegistry.BatteryData.BatteryHealthMetric",
      "IORegistry.MaximumCapacityPercent",
      "IORegistry.BatteryHealth",
    ]);

    const batteryGenuineApple = pickPlistBoolean(ioregResult.stdout, [
      "IORegistry.BatteryIsGenuineApple",
      "IORegistry.BatteryData.BatteryIsGenuineApple",
    ]);

    const healthFromCapacity =
      fullChargeMah !== undefined && designMah && designMah > 0
        ? Math.min(round1((fullChargeMah / designMah) * 100), 100)
        : undefined;

    const healthPercent = healthFromCapacity ?? batteryHealthMetric;

    if (
      cycleCount !== undefined ||
      fullChargeMah !== undefined ||
      designMah !== undefined ||
      healthPercent !== undefined ||
      currentPct !== undefined
    ) {
      const value = {
        battery: {
          health_percent: toNullable(healthPercent),
          cycle_count: toNullable(cycleCount),
          full_charge_mah: toNullable(fullChargeMah),
          design_mah: toNullable(designMah),
          current_level_pct: toNullable(currentPct),
          voltage_mv: toNullable(voltageMv),
          temperature_raw: toNullable(temperatureRaw),
          source: "AppleSmartBattery",
        },
        batteryGenuineApple:
          batteryGenuineApple === undefined ? null : batteryGenuineApple,
      };
      batteryCache.set(udid, value);
      return value;
    }
  }

  const ioreg = ioregResult.ok && ioregResult.stdout.trim()
    ? parseKeyValueOutput(ioregResult.stdout)
    : null;

  const batteryGenuineApple = pickBoolean(ioreg, ["BatteryIsGenuineApple"]);

  const fullChargeMah = pickNumber(ioreg, ["FullChargeCapacity"]);
  const designMah = pickNumber(ioreg, ["DesignCapacity"]);
  const cycleCount = pickNumber(ioreg, ["CycleCount"]);
  const currentPct = pickNumber(ioreg, [
    "CurrentCapacity",
    "AppleRawCurrentCapacity",
    "BatteryCurrentCapacity",
  ]);
  const voltageMv = pickNumber(ioreg, ["Voltage"]);
  const temperatureRaw = pickNumber(ioreg, ["Temperature"]);
  const healthFromIoreg =
    fullChargeMah !== undefined && designMah && designMah > 0
      ? round1((fullChargeMah / designMah) * 100)
      : undefined;

  if (fullChargeMah !== undefined || cycleCount !== undefined || currentPct !== undefined) {
    return {
      battery: {
        health_percent: toNullable(healthFromIoreg),
        cycle_count: toNullable(cycleCount),
        full_charge_mah: toNullable(fullChargeMah),
        design_mah: toNullable(designMah),
        current_level_pct: toNullable(currentPct),
        voltage_mv: toNullable(voltageMv),
        temperature_raw: toNullable(temperatureRaw),
        source: "AppleSmartBattery",
      },
      batteryGenuineApple:
        batteryGenuineApple === undefined ? null : batteryGenuineApple,
    };
  }

  const batteryDomain = await getCommandMap("ideviceinfo", [
    "-u",
    udid,
    "-q",
    "com.apple.mobile.battery",
  ]);

  const fallbackHealth = pickNumber(batteryDomain, [
    "MaximumCapacity",
    "MaximumCapacityPercent",
    "BatteryHealth",
  ]);
  const fallbackCurrent = pickNumber(batteryDomain, ["BatteryCurrentCapacity"]);
  const fallbackVoltage = pickNumber(batteryDomain, ["Voltage"]);
  const fallbackTemp = pickNumber(batteryDomain, ["Temperature"]);

  if (fallbackHealth !== undefined || fallbackCurrent !== undefined) {
    const value = {
      battery: {
        health_percent: toNullable(fallbackHealth),
        cycle_count: null,
        full_charge_mah: null,
        design_mah: null,
        current_level_pct: toNullable(fallbackCurrent),
        voltage_mv: toNullable(fallbackVoltage),
        temperature_raw: toNullable(fallbackTemp),
        source: "BatteryDomain",
      },
      batteryGenuineApple:
        batteryGenuineApple === undefined ? null : batteryGenuineApple,
    };
    batteryCache.set(udid, value);
    return value;
  }

  const cached = batteryCache.get(udid);
  if (cached) {
    return cached;
  }

  return {
    battery: undefined,
    batteryGenuineApple:
      batteryGenuineApple === undefined ? null : batteryGenuineApple,
  };
}

export async function checkDiagnosticsEnvironment(
  force = false
): Promise<DiagnosticsEnvironment> {
  const missingTools = await getMissingTools(force);
  return {
    ready: missingTools.length === 0,
    missing_tools: missingTools,
  };
}

export async function listConnectedDevices(): Promise<string[]> {
  const result = await runCommand("idevice_id", ["-l"], 8_000);
  if (!result.ok || !result.stdout.trim()) return [];

  return result.stdout
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function scanDevice(udid: string): Promise<DeviceResult> {
  const infoResult = await runCommand("ideviceinfo", ["-u", udid], 12_000);
  if (!infoResult.ok || !infoResult.stdout.trim()) {
    return {
      udid,
      paired: false,
      error: buildDeviceReadError(infoResult.stderr),
    };
  }

  const info = parseKeyValueOutput(infoResult.stdout);
  const batteryInfo = await readBatteryInfo(udid);
  const diskUsage = await getDiskUsageBytes(udid);

  const productType = pickString(info, ["ProductType"]) ?? "";
  const modelName = IPHONE_MODELS[productType] ?? (productType || "Modelo desconocido");
  const activationState = pickString(info, ["ActivationState"]) ?? "Unknown";

  const totalDiskBytes = diskUsage.totalDiskBytes ?? pickNumber(info, ["TotalDiskCapacity"]);
  const totalDataCapacityBytes =
    diskUsage.totalDataCapacityBytes ?? pickNumber(info, ["TotalDataCapacity"]);
  const totalDataAvailableBytes =
    diskUsage.totalDataAvailableBytes ?? pickNumber(info, ["TotalDataAvailable"]);
  const amountDataAvailableBytes =
    diskUsage.amountDataAvailableBytes ?? pickNumber(info, ["AmountDataAvailable"]);
  const fallbackAvailableBytes = amountDataAvailableBytes ?? totalDataAvailableBytes;

  // En iOS recientes, TotalDataCapacity alinea mejor con "iPhone Storage > used".
  const usedFromDataCapacity =
    totalDataCapacityBytes !== undefined && totalDataCapacityBytes > 0
      ? totalDiskBytes !== undefined
        ? Math.min(totalDataCapacityBytes, totalDiskBytes)
        : totalDataCapacityBytes
      : undefined;

  const usedDataBytes =
    usedFromDataCapacity ??
    (totalDiskBytes !== undefined && fallbackAvailableBytes !== undefined
      ? Math.max(totalDiskBytes - fallbackAvailableBytes, 0)
      : undefined);
  const availableDataBytes =
    totalDiskBytes !== undefined && usedDataBytes !== undefined
      ? Math.max(totalDiskBytes - usedDataBytes, 0)
      : fallbackAvailableBytes;

  const storageGb = bytesToGb(totalDiskBytes);
  const usedGb = bytesToGb(usedDataBytes, 1);
  const availableGb = bytesToGb(availableDataBytes, 1);

  let partsStatus: "no_alerts" | "replacement_detected" | "unknown" = "unknown";
  if (batteryInfo.batteryGenuineApple === false) {
    partsStatus = "replacement_detected";
  } else if (batteryInfo.battery) {
    partsStatus = "no_alerts";
  }

  return {
    udid,
    paired: true,
    error: null,
    model_id: productType || undefined,
    model_name: modelName,
    hardware_model: pickString(info, ["HardwareModel"]),
    model_number: pickString(info, ["ModelNumber"]),
    serial_number: pickString(info, ["SerialNumber"]),
    ios_version: pickString(info, ["ProductVersion"]),
    build_version: pickString(info, ["BuildVersion"]),
    baseband_version: pickString(info, ["BasebandVersion"]),
    firmware_version: pickString(info, ["FirmwareVersion"]),
    imei: pickString(info, ["InternationalMobileEquipmentIdentity"]),
    imei2: pickString(info, ["InternationalMobileEquipmentIdentity2"]),
    meid: pickString(info, ["MEID"]),
    iccid: pickString(info, ["ICCID"]),
    phone_number: pickString(info, ["PhoneNumber"]),
    carrier: pickString(info, ["CarrierName", "SIMCarrierNetwork"]),
    mcc: pickString(info, ["MobileCountryCode"]),
    mnc: pickString(info, ["MobileNetworkCode"]),
    cpu_arch: pickString(info, ["CPUArchitecture"]),
    ram_gb: IPHONE_RAM_GB[productType],
    chip_id: pickString(info, ["ChipID"]),
    board_id: pickString(info, ["BoardId"]),
    color: pickString(info, ["DeviceColor"]),
    color_marketing: pickString(info, ["DeviceEnclosureColor"]),
    storage_gb: storageGb,
    used_gb: usedGb,
    available_gb: availableGb,
    activation_state: activationState,
    icloud_locked: activationState !== "Activated" && activationState !== "",
    wifi_mac: pickString(info, ["WiFiAddress"]),
    bluetooth_mac: pickString(info, ["BluetoothAddress"]),
    ethernet_mac: pickString(info, ["EthernetAddress"]),
    battery: batteryInfo.battery,
    battery_genuine_apple: batteryInfo.batteryGenuineApple,
    parts_status: partsStatus,
    parts_note:
      partsStatus === "replacement_detected"
        ? "Se detectó alerta de batería por USB. Valida en Ajustes > General > Acerca de > Piezas y servicio."
        : partsStatus === "no_alerts"
          ? "Sin alertas de piezas cambiadas detectables por USB."
          : "No fue posible verificar piezas por USB. Revísalo en Ajustes > General > Acerca de > Piezas y servicio.",
  };
}

export async function scanAllDevices(): Promise<{ results: DeviceResult[]; count: number }> {
  const udids = await listConnectedDevices();
  if (udids.length === 0) {
    return { results: [], count: 0 };
  }

  const results = await Promise.all(udids.map((udid) => scanDevice(udid)));
  return { results, count: results.length };
}
