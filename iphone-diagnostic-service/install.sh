#!/bin/bash
# Diagnostico iPhone - Instalador nativo libimobiledevice
set -e

echo ""
echo "=================================================="
echo "  Diagnostico iPhone - Instalador"
echo "  Modo: libimobiledevice nativo (sin Python)"
echo "=================================================="
echo ""

OS="$(uname -s)"

echo "[1/2] Instalando libimobiledevice..."
if [ "$OS" = "Darwin" ]; then
  if ! command -v brew >/dev/null 2>&1; then
    echo "ERROR: Homebrew no encontrado. Instálalo primero:"
    echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
  fi
  brew install libimobiledevice usbmuxd 2>/dev/null || brew upgrade libimobiledevice usbmuxd 2>/dev/null || true
elif [ "$OS" = "Linux" ]; then
  sudo apt-get update -q
  sudo apt-get install -y libimobiledevice-utils usbmuxd
  sudo systemctl enable --now usbmuxd
else
  echo "Sistema operativo no soportado: $OS"
  echo "Instala libimobiledevice manualmente desde: https://github.com/libimobiledevice/libimobiledevice"
  exit 1
fi

echo "  Dependencias instaladas."

echo ""
echo "[2/2] Verificando herramientas..."
TOOLS=("idevice_id" "ideviceinfo" "idevicediagnostics" "idevicepair")
ALL_OK=true
for tool in "${TOOLS[@]}"; do
  if command -v "$tool" >/dev/null 2>&1; then
    echo "  [OK] $tool"
  else
    echo "  [X]  $tool - NO ENCONTRADO"
    ALL_OK=false
  fi
done

echo ""
if [ "$ALL_OK" = true ]; then
  echo "=================================================="
  echo "  Instalacion completada."
  echo "  Usa la app web: /admin/diagnostico"
  echo "  Para validar USB: ./start.sh"
  echo "=================================================="
else
  echo "Faltan herramientas. Revisa instalación e intenta de nuevo."
  exit 1
fi
