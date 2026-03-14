import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, execSync } from "node:child_process";

const projectRoot = process.cwd();
const source = path.join(projectRoot, "iphone-diagnostic-service", "bridge-agent.mjs");
const distDir = path.join(projectRoot, "iphone-diagnostic-service", "dist");

fs.mkdirSync(distDir, { recursive: true });

const builds = [
  { target: "node18-macos-arm64", output: "bridge-agent-macos-arm64" },
  { target: "node18-win-x64", output: "bridge-agent-win-x64.exe" },
  { target: "node18-linux-x64", output: "bridge-agent-linux-x64" },
];

for (const build of builds) {
  console.log(`Building ${build.target}...`);
  execFileSync("npx", [
    "--yes",
    "pkg",
    source,
    "--targets",
    build.target,
    "--output",
    path.join(distDir, build.output),
  ], { stdio: "inherit" });
}

if (os.platform() === "darwin") {
  const srcDir = fs.mkdtempSync(path.join(os.tmpdir(), "diag-bridge-"));
  const appDir = path.join(srcDir, "DiagnosticoBridgeAgent.app", "Contents");
  const macosDir = path.join(appDir, "MacOS");
  const dmgPath = path.join(distDir, "DiagnosticoBridgeAgent.dmg");

  fs.mkdirSync(macosDir, { recursive: true });
  fs.writeFileSync(
    path.join(appDir, "Info.plist"),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key><string>DiagnosticoBridgeAgent</string>
  <key>CFBundleIdentifier</key><string>com.22electronic.bridgeagent</string>
  <key>CFBundleName</key><string>DiagnosticoBridgeAgent</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
</dict>
</plist>`
  );

  const launcherScript = `#!/bin/bash
set -e

APP_URL_DEFAULT="https://22electronicgroup.com"
WORKDIR="$HOME/.22electronic-diagnostics-agent"
LOG_DIR="$WORKDIR/logs"
mkdir -p "$LOG_DIR"

LAUNCH_LOG="$LOG_DIR/launcher-$(date +%Y%m%d-%H%M%S).log"
touch "$LAUNCH_LOG"
exec > >(tee -a "$LAUNCH_LOG") 2>&1

echo "============================================================"
echo "  DiagnosticoBridgeAgent - Launcher"
echo "  Log: $LAUNCH_LOG"
echo "============================================================"
echo ""

APP_EXEC="$0"
APP_BUNDLE="$(cd "$(dirname "$APP_EXEC")/../../.." && pwd)"

extract_origin_from_where_froms() {
  local target="$1"
  local attr_tmp=""
  local parsed=""
  local url=""
  local origin=""

  [ -n "$target" ] || return 1
  [ -e "$target" ] || return 1

  attr_tmp="$(mktemp -t diag_wherefroms)"
  if ! xattr -p com.apple.metadata:kMDItemWhereFroms "$target" > "$attr_tmp" 2>/dev/null; then
    rm -f "$attr_tmp"
    return 1
  fi

  parsed="$(/usr/bin/plutil -p "$attr_tmp" 2>/dev/null || true)"
  rm -f "$attr_tmp"
  [ -n "$parsed" ] || return 1

  while IFS= read -r line; do
    url="$(echo "$line" | sed -n 's/.*"\\(https\\?:\\/\\/[^"]*\\)".*/\\1/p')"
    [ -n "$url" ] || continue
    origin="$(echo "$url" | sed -n 's#^\\(https\\?://[^/]*\\).*#\\1#p')"
    if [ -n "$origin" ]; then
      echo "$origin"
      return 0
    fi
  done <<< "$parsed"

  return 1
}

DETECTED_ORIGIN="$(extract_origin_from_where_froms "$APP_BUNDLE" || true)"
if [ -z "$DETECTED_ORIGIN" ]; then
  DETECTED_ORIGIN="$(extract_origin_from_where_froms "$APP_EXEC" || true)"
fi
if [ -n "$DETECTED_ORIGIN" ]; then
  APP_URL_DEFAULT="$DETECTED_ORIGIN"
fi

echo "App URL detectada para pairing: $APP_URL_DEFAULT"
echo ""

BUTTON=""
if command -v osascript >/dev/null 2>&1; then
  BUTTON=$(osascript -e 'button returned of (display dialog "DiagnosticoBridgeAgent\\n\\nInstalara o verificara automaticamente:\\n\\n  - Homebrew (si falta)\\n  - Node.js\\n  - libimobiledevice\\n  - usbmuxd\\n\\nDespues abrira el agente local en Terminal.\\n\\n¿Continuar?" buttons {"Cancelar", "Instalar"} default button "Instalar" with icon note)' 2>/dev/null || true)
fi

if [ "$BUTTON" = "Cancelar" ]; then
  echo "Instalacion cancelada por el usuario."
  exit 0
fi

if [ -z "$BUTTON" ]; then
  echo "No se pudo mostrar el dialogo grafico; continuando en modo consola."
fi

SCRIPT=$(mktemp -t diag_bridge_install)
cat > "$SCRIPT" <<'INSTALLEOF'
#!/bin/bash
set -e

APP_URL_DEFAULT="\${DIAG_BRIDGE_APP_URL:-https://22electronicgroup.com}"
WORKDIR="$HOME/.22electronic-diagnostics-agent"
LOG_DIR="$WORKDIR/logs"
mkdir -p "$WORKDIR" "$LOG_DIR"
cd "$WORKDIR"

INSTALL_LOG="$LOG_DIR/install-$(date +%Y%m%d-%H%M%S).log"
touch "$INSTALL_LOG"
exec > >(tee -a "$INSTALL_LOG") 2>&1

finish() {
  STATUS=$?
  echo ""
  if [ "$STATUS" -eq 0 ]; then
    echo "Instalacion finalizada correctamente."
  else
    echo "ERROR: la instalacion fallo con codigo $STATUS."
  fi
  echo "Revisa el log en: $INSTALL_LOG"
  echo ""
  read -r -p "Presiona Enter para cerrar..." _
}
trap finish EXIT

clear
echo "============================================================"
echo "  DiagnosticoBridgeAgent - Instalando"
echo "============================================================"
echo ""

echo "[1/4] Verificando Homebrew..."
if ! command -v brew >/dev/null 2>&1; then
  NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi
if [ -f "/opt/homebrew/bin/brew" ]; then eval "$(/opt/homebrew/bin/brew shellenv)"; fi
if [ -f "/usr/local/bin/brew" ]; then eval "$(/usr/local/bin/brew shellenv)"; fi
echo "  + Homebrew listo"

echo "[2/4] Verificando Node.js..."
if ! command -v node >/dev/null 2>&1; then
  brew install node
fi
echo "  + Node listo: $(node -v)"

echo "[3/4] Verificando libimobiledevice + usbmuxd..."
brew install libimobiledevice usbmuxd 2>/dev/null || brew upgrade libimobiledevice usbmuxd 2>/dev/null || true
echo "  + Dependencias USB listas"

echo "[4/4] Descargando agente..."
curl -fsSL "$APP_URL_DEFAULT/api/diagnostics/download?file=bridge-agent-js" -o bridge-agent.mjs
chmod +x bridge-agent.mjs
echo "  + Agente descargado en $WORKDIR/bridge-agent.mjs"
echo ""
echo "El agente abrira la web y se vinculara con tu cuenta sin pedir token manual."
echo "Despues guardara la configuracion y arrancara automaticamente."
echo ""
export DIAG_AGENT_URL="$APP_URL_DEFAULT"
node bridge-agent.mjs
INSTALLEOF

chmod +x "$SCRIPT"
export DIAG_BRIDGE_APP_URL="$APP_URL_DEFAULT"
if ! open -a Terminal "$SCRIPT"; then
  echo "No se pudo abrir Terminal automaticamente."
  echo "Ejecuta manualmente: $SCRIPT"
fi
`;

  fs.writeFileSync(path.join(macosDir, "DiagnosticoBridgeAgent"), launcherScript);
  fs.chmodSync(path.join(macosDir, "DiagnosticoBridgeAgent"), 0o755);

  execSync(
    `hdiutil create -volname "DiagnosticoBridgeAgent" -srcfolder "${srcDir}" -ov -format UDZO -o "${dmgPath}"`,
    { stdio: "inherit" }
  );
}

console.log("Bridge agent binaries ready in iphone-diagnostic-service/dist");
