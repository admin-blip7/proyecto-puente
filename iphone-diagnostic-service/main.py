"""
iPhone Diagnostic Service — extrae TODA la información disponible por USB.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import subprocess, plistlib
from concurrent.futures import ThreadPoolExecutor
from typing import Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="iPhone Diagnostic Service", version="2.0.0")
app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:3000","http://localhost:3001","http://localhost:3002"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

IPHONE_MODELS = {
    # iPhone 17 family (2025)
    "iPhone18,1":"iPhone 17","iPhone18,2":"iPhone 17 Plus",
    "iPhone18,3":"iPhone 17 Pro","iPhone18,4":"iPhone 17 Pro Max",
    # iPhone 16 family
    "iPhone17,1":"iPhone 16 Pro","iPhone17,2":"iPhone 16 Pro Max",
    "iPhone17,3":"iPhone 16","iPhone17,4":"iPhone 16 Plus",
    # iPhone 15 family
    "iPhone16,1":"iPhone 15 Pro","iPhone16,2":"iPhone 15 Pro Max",
    "iPhone15,4":"iPhone 15","iPhone15,5":"iPhone 15 Plus",
    # iPhone 14 family
    "iPhone15,2":"iPhone 14 Pro","iPhone15,3":"iPhone 14 Pro Max",
    "iPhone14,7":"iPhone 14","iPhone14,8":"iPhone 14 Plus",
    "iPhone14,6":"iPhone SE (3rd gen)",
    # iPhone 13 family
    "iPhone14,2":"iPhone 13 Pro","iPhone14,3":"iPhone 13 Pro Max",
    "iPhone14,4":"iPhone 13 Mini","iPhone14,5":"iPhone 13",
    # iPhone 12 family
    "iPhone13,1":"iPhone 12 Mini","iPhone13,2":"iPhone 12",
    "iPhone13,3":"iPhone 12 Pro","iPhone13,4":"iPhone 12 Pro Max",
    # iPhone 11 family
    "iPhone12,1":"iPhone 11","iPhone12,3":"iPhone 11 Pro",
    "iPhone12,5":"iPhone 11 Pro Max","iPhone12,8":"iPhone SE (2nd gen)",
    # Older
    "iPhone11,2":"iPhone XS","iPhone11,4":"iPhone XS Max",
    "iPhone11,6":"iPhone XS Max","iPhone11,8":"iPhone XR",
    "iPhone10,3":"iPhone X","iPhone10,6":"iPhone X",
    "iPhone10,1":"iPhone 8","iPhone10,4":"iPhone 8",
    "iPhone10,2":"iPhone 8 Plus","iPhone10,5":"iPhone 8 Plus",
    "iPhone9,1":"iPhone 7","iPhone9,3":"iPhone 7",
    "iPhone9,2":"iPhone 7 Plus","iPhone9,4":"iPhone 7 Plus",
}


def run_cmd(cmd, timeout=15):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return r.returncode == 0, r.stdout
    except Exception:
        return False, ""


def load_plist(text):
    try:
        return plistlib.loads(text.encode()) if text.strip() else None
    except Exception:
        return None


def list_udids():
    ok, out = run_cmd(["idevice_id", "-l"])
    if not ok or not out.strip():
        return []
    return [u.strip() for u in out.strip().split("\n") if u.strip()]


def get_all_device_info(udid):
    """Obtiene todos los valores de ideviceinfo."""
    ok, out = run_cmd(["ideviceinfo", "-u", udid, "-x"])
    return load_plist(out) if ok else None


def get_battery(udid):
    """Intenta 3 métodos para obtener datos de batería."""
    # Método 1: diagnostics completo
    ok, out = run_cmd(["idevicediagnostics", "-u", udid, "diagnostics"])
    if ok and out.strip():
        data = load_plist(out)
        if data:
            gg = data.get("GasGauge", {})
            if gg:
                full = gg.get("FullChargeCapacity") or 0
                design = gg.get("DesignCapacity") or 1
                return {
                    "health_percent": round(full / design * 100, 1),
                    "cycle_count": gg.get("CycleCount"),
                    "full_charge_mah": full,
                    "design_mah": design,
                    "current_level_pct": gg.get("AppleRawCurrentCapacity"),
                    "voltage_mv": gg.get("Voltage"),
                    "temperature_raw": gg.get("Temperature"),
                    "source": "GasGauge",
                }

    # Método 2: ioregentry AppleSmartBattery
    ok, out = run_cmd(["idevicediagnostics", "-u", udid, "ioregentry", "AppleSmartBattery"])
    if ok and out.strip():
        data = load_plist(out)
        if data:
            full = data.get("FullChargeCapacity") or 0
            design = data.get("DesignCapacity") or 1
            return {
                "health_percent": round(full / design * 100, 1),
                "cycle_count": data.get("CycleCount"),
                "full_charge_mah": full,
                "design_mah": design,
                "current_level_pct": data.get("CurrentCapacity"),
                "voltage_mv": data.get("Voltage"),
                "temperature_raw": data.get("Temperature"),
                "source": "AppleSmartBattery",
            }

    # Método 3: dominio battery de ideviceinfo
    ok, out = run_cmd(["ideviceinfo", "-u", udid, "-q", "com.apple.mobile.battery", "-x"])
    if ok and out.strip():
        data = load_plist(out)
        if data:
            return {
                "health_percent": data.get("BatteryCurrentCapacity"),
                "cycle_count": None,
                "full_charge_mah": None,
                "design_mah": None,
                "current_level_pct": data.get("BatteryCurrentCapacity"),
                "voltage_mv": None,
                "temperature_raw": None,
                "source": "BatteryDomain",
            }
    return None


def build_device_result(udid):
    info = get_all_device_info(udid)
    if info is None:
        return {"udid": udid, "paired": False,
                "error": "No se pudo leer. Acepta el par en el iPhone (toca 'Confiar')."}

    product_type = info.get("ProductType", "")
    model_name = IPHONE_MODELS.get(product_type, product_type or "Desconocido")

    activation_state = info.get("ActivationState", "Unknown")
    total_bytes = info.get("TotalDiskCapacity")
    storage_gb = round(total_bytes / (1024**3)) if total_bytes else None

    battery = get_battery(udid)

    # Campos de red / celular
    carrier = info.get("CarrierName") or info.get("SIMCarrierNetwork")
    mcc = info.get("MobileCountryCode")
    mnc = info.get("MobileNetworkCode")
    phone_number = info.get("PhoneNumber")
    iccid = info.get("ICCID")
    meid = info.get("MEID")

    # Hardware
    cpu_arch = info.get("CPUArchitecture")
    board_id = info.get("BoardId")
    chip_id = info.get("ChipID")
    hardware_model = info.get("HardwareModel")
    model_number = info.get("ModelNumber")

    # Versiones
    build_version = info.get("BuildVersion")
    baseband = info.get("BasebandVersion")
    firmware = info.get("FirmwareVersion")

    # Red
    wifi_mac = info.get("WiFiAddress")
    bt_mac = info.get("BluetoothAddress")
    ethernet_mac = info.get("EthernetAddress")

    # Capacidad libre
    avail_bytes = info.get("TotalDataAvailable")
    available_gb = round(avail_bytes / (1024**3), 1) if avail_bytes else None
    used_bytes = info.get("TotalDataCapacity")
    used_gb = round(used_bytes / (1024**3), 1) if used_bytes else None

    # Piezas — Apple NO expone esto por USB. Solo en Ajustes > General > Acerca de.
    # Lo que SÍ podemos saber: si hay un warning de batería de terceros.
    # idevicediagnostics devuelve BatteryStatus si la batería fue reemplazada sin certificar.
    battery_genuine = None
    ok, out = run_cmd(["idevicediagnostics", "-u", udid, "ioregentry", "AppleSmartBattery"])
    if ok and out.strip():
        d = load_plist(out)
        if d:
            battery_genuine = d.get("BatteryIsGenuineApple")  # bool si está disponible

    return {
        "udid": udid,
        "paired": True,
        "error": None,
        # Identidad
        "model_id": product_type,
        "model_name": model_name,
        "hardware_model": hardware_model,
        "model_number": model_number,
        "serial_number": info.get("SerialNumber"),
        "ios_version": info.get("ProductVersion"),
        "build_version": build_version,
        "baseband_version": baseband,
        "firmware_version": firmware,
        # IMEI / Red
        "imei": info.get("InternationalMobileEquipmentIdentity"),
        "imei2": info.get("InternationalMobileEquipmentIdentity2"),
        "meid": meid,
        "iccid": iccid,
        "phone_number": phone_number,
        "carrier": carrier,
        "mcc": mcc,
        "mnc": mnc,
        # Hardware
        "cpu_arch": cpu_arch,
        "chip_id": chip_id,
        "board_id": board_id,
        "color": info.get("DeviceColor"),
        "color_marketing": info.get("DeviceEnclosureColor"),
        # Almacenamiento
        "storage_gb": storage_gb,
        "available_gb": available_gb,
        "used_gb": used_gb,
        # Estado
        "activation_state": activation_state,
        "icloud_locked": activation_state not in ("Activated", ""),
        # Red local
        "wifi_mac": wifi_mac,
        "bluetooth_mac": bt_mac,
        "ethernet_mac": ethernet_mac,
        # Batería
        "battery": battery,
        "battery_genuine_apple": battery_genuine,
        # Piezas (nota)
        "parts_note": "La info de piezas reemplazadas no es accesible por USB. Ve a Ajustes > General > Acerca de > Piezas y servicio en el iPhone.",
    }


@app.get("/")
def health():
    return {"status": "ok", "service": "iPhone Diagnostic Service", "version": "2.0.0"}

@app.get("/devices")
def list_devices():
    udids = list_udids()
    return {"devices": udids, "count": len(udids)}

@app.get("/device/{udid}")
def get_device(udid: str):
    return build_device_result(udid)

@app.get("/scan-all")
def scan_all():
    udids = list_udids()
    if not udids:
        return {"results": [], "count": 0}
    with ThreadPoolExecutor(max_workers=10) as ex:
        results = list(ex.map(build_device_result, udids))
    return {"results": results, "count": len(results)}

@app.post("/pair/{udid}")
def pair_device(udid: str):
    ok, out = run_cmd(["idevicepair", "-u", udid, "pair"], timeout=30)
    return {"success": ok, "message": out.strip() or ("Emparejado" if ok else "Error al emparejar")}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8765, reload=True)
