#!/bin/bash
# Diagnostico iPhone - Verificador USB (sin servicio Python)
set -e

echo "=================================================="
echo "  Diagnostico iPhone - Verificacion USB"
echo "=================================================="

tools=("idevice_id" "ideviceinfo" "idevicediagnostics" "idevicepair")
for tool in "${tools[@]}"; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "ERROR: $tool no está instalado. Ejecuta primero ./install.sh"
    exit 1
  fi
done

echo "\nDispositivos conectados (UDID):"
UDIDS=$(idevice_id -l || true)
if [ -z "$UDIDS" ]; then
  echo "  (ninguno)"
  echo "\nConecta un iPhone por USB, desbloquéalo y acepta 'Confiar en este ordenador'."
else
  echo "$UDIDS"
fi

echo "\nAbriendo /admin/diagnostico..."
open "http://localhost:9003/admin/diagnostico" 2>/dev/null || true

echo "\nListo. Si no ves el iPhone en la app:"
echo "  1) Cambia cable/puerto USB"
echo "  2) Desbloquea iPhone y acepta confianza"
echo "  3) Repite: idevice_id -l"
