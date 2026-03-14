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
mkdir -p "$WORKDIR"
LAUNCHER="$WORKDIR/bridge-agent.mjs"

osascript -e 'display dialog "DiagnosticoBridgeAgent\\n\\nInstalara o verificara automaticamente:\\n\\n  - Homebrew (si falta)\\n  - Node.js\\n  - libimobiledevice\\n  - usbmuxd\\n\\nDespues abrira el agente local en Terminal.\\n\\n¿Continuar?" buttons {"Cancelar", "Instalar"} default button "Instalar" with icon note' >/dev/null 2>&1 || exit 0

SCRIPT=$(mktemp /tmp/diag_bridge_install_XXXXX.sh)
cat > "$SCRIPT" <<'INSTALLEOF'
#!/bin/bash
set -e

APP_URL_DEFAULT="https://22electronicgroup.com"
WORKDIR="$HOME/.22electronic-diagnostics-agent"
mkdir -p "$WORKDIR"
cd "$WORKDIR"

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
node bridge-agent.mjs
INSTALLEOF

chmod +x "$SCRIPT"
open -a Terminal "$SCRIPT"
`;

  fs.writeFileSync(path.join(macosDir, "DiagnosticoBridgeAgent"), launcherScript);
  fs.chmodSync(path.join(macosDir, "DiagnosticoBridgeAgent"), 0o755);

  execSync(
    `hdiutil create -volname "DiagnosticoBridgeAgent" -srcfolder "${srcDir}" -ov -format UDZO -o "${dmgPath}"`,
    { stdio: "inherit" }
  );
}

console.log("Bridge agent binaries ready in iphone-diagnostic-service/dist");
