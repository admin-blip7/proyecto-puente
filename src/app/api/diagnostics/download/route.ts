import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";

export const runtime = "nodejs";

const DEFAULT_APP_URL = "http://localhost:3000/admin/diagnostico";

const LINUX_INSTALL_SCRIPT = `#!/usr/bin/env bash
set -e

echo "[1/3] Instalando libimobiledevice + usbmuxd..."
sudo apt-get update
sudo apt-get install -y libimobiledevice-utils usbmuxd

echo "[2/3] Activando usbmuxd..."
sudo systemctl enable --now usbmuxd

echo "[3/3] Verificando comandos..."
for tool in idevice_id ideviceinfo idevicediagnostics idevicepair; do
  if command -v "$tool" >/dev/null 2>&1; then
    echo "  [OK] $tool"
  else
    echo "  [X]  $tool"
  fi
done

echo ""
echo "Listo. Abre /admin/diagnostico en tu app."`;

function resolveAppUrl(req: NextRequest): string {
  const host = req.headers.get("host");
  if (!host) return DEFAULT_APP_URL;

  const forwardedProto = req.headers.get("x-forwarded-proto");
  const protocol = forwardedProto || (host.includes("localhost") ? "http" : "https");
  return `${protocol}://${host}/admin/diagnostico`;
}

function buildMacInstallerScript(appUrl: string): string {
  const shortcutScript = [
    "#!/bin/bash",
    "clear",
    'echo "Diagnóstico iPhone (libimobiledevice)"',
    'echo ""',
    "if ! command -v idevice_id >/dev/null 2>&1; then",
    '  echo "libimobiledevice no está instalado."',
    '  echo "Ejecuta de nuevo el instalador."',
    "else",
    '  echo "Dispositivos detectados (UDID):"',
    "  idevice_id -l || true",
    "fi",
    'echo ""',
    `open "${appUrl}" 2>/dev/null || true`,
    'echo "Se abrió /admin/diagnostico en el navegador."',
    'echo ""',
    'read -r -p "Presiona Enter para cerrar..." _',
  ].join("\n");

  return [
    "#!/bin/bash",
    "set -e",
    "",
    "clear",
    'echo "============================================================"',
    'echo "  Diagnóstico iPhone - Instalador libimobiledevice"',
    'echo "============================================================"',
    'echo ""',
    "",
    "osascript -e 'display dialog \"Diagnóstico iPhone\\n\\nSe instalará automáticamente:\\n\\n  - Homebrew (si no existe)\\n  - libimobiledevice\\n  - usbmuxd\\n\\nLuego abrirá /admin/diagnostico.\\n\\n¿Continuar?\" buttons {\"Cancelar\", \"Instalar\"} default button \"Instalar\" with icon note' >/dev/null 2>&1",
    "if [ $? -ne 0 ]; then",
    '  echo "Instalación cancelada."',
    "  exit 0",
    "fi",
    "",
    'echo "[1/4] Verificando Homebrew..."',
    "if ! command -v brew >/dev/null 2>&1; then",
    '  NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
    "fi",
    'if [ -f "/opt/homebrew/bin/brew" ]; then eval "$(/opt/homebrew/bin/brew shellenv)"; fi',
    'if [ -f "/usr/local/bin/brew" ]; then eval "$(/usr/local/bin/brew shellenv)"; fi',
    'echo "  + Homebrew listo"',
    "",
    'echo "[2/4] Instalando libimobiledevice + usbmuxd..."',
    "brew install libimobiledevice usbmuxd 2>/dev/null || brew upgrade libimobiledevice usbmuxd 2>/dev/null || true",
    'echo "  + Dependencias instaladas"',
    "",
    'echo "[3/4] Verificando comandos..."',
    "MISSING=0",
    "for tool in idevice_id ideviceinfo idevicediagnostics idevicepair; do",
    "  if command -v \"$tool\" >/dev/null 2>&1; then",
    '    echo "  [OK] $tool"',
    "  else",
    '    echo "  [X]  $tool"',
    "    MISSING=1",
    "  fi",
    "done",
    "if [ $MISSING -ne 0 ]; then",
    '  echo ""',
    '  echo "Faltan herramientas de libimobiledevice. Revisa brew y reintenta."',
    '  read -r -p "Presiona Enter para cerrar..." _',
    "  exit 1",
    "fi",
    "",
    'echo "[4/4] Creando acceso directo..."',
    'SHORTCUT_PATH="$HOME/Desktop/Abrir Diagnóstico iPhone.command"',
    "cat > \"$SHORTCUT_PATH\" << 'SHORTEOF'",
    shortcutScript,
    "SHORTEOF",
    'chmod +x "$SHORTCUT_PATH"',
    'echo "  + Acceso directo creado en: $SHORTCUT_PATH"',
    "",
    `open "${appUrl}" 2>/dev/null || true`,
    'echo ""',
    'echo "Instalación completada. Ya puedes escanear desde /admin/diagnostico."',
    'echo ""',
    'read -r -p "Presiona Enter para cerrar..." _',
  ].join("\n");
}

function buildDmg(appUrl: string): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "diag-iphone-"));
  const srcDir = path.join(tmpDir, "src");
  const appDir = path.join(srcDir, "DiagnosticoiPhone.app", "Contents");
  const macosDir = path.join(appDir, "MacOS");
  const dmgPath = path.join(tmpDir, "DiagnosticoiPhone.dmg");

  fs.mkdirSync(macosDir, { recursive: true });

  fs.writeFileSync(
    path.join(appDir, "Info.plist"),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key><string>DiagnosticoiPhone</string>
  <key>CFBundleIdentifier</key><string>com.22electronic.diagnostico</string>
  <key>CFBundleName</key><string>DiagnosticoiPhone</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleVersion</key><string>2.0</string>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
  <key>LSUIElement</key><false/>
</dict>
</plist>`
  );

  const installerScript = buildMacInstallerScript(appUrl);
  const appLauncher = [
    "#!/bin/bash",
    "set -e",
    "",
    "INSTALLER=$(mktemp /tmp/diag_install_XXXXX.command)",
    'cat > "$INSTALLER" << \'INSTALLEOF\'',
    installerScript,
    "INSTALLEOF",
    'chmod +x "$INSTALLER"',
    'open -a Terminal "$INSTALLER"',
  ].join("\n");

  const binaryPath = path.join(macosDir, "DiagnosticoiPhone");
  fs.writeFileSync(binaryPath, appLauncher);
  fs.chmodSync(binaryPath, 0o755);

  execSync(
    `hdiutil create -volname "DiagnosticoiPhone" -srcfolder "${srcDir}" -ov -format UDZO -o "${dmgPath}"`,
    { stdio: "pipe" }
  );

  return dmgPath;
}

export async function GET(req: NextRequest) {
  const file = req.nextUrl.searchParams.get("file");
  const appUrl = resolveAppUrl(req);

  if (file === "installer-dmg") {
    try {
      const dmgPath = buildDmg(appUrl);
      const content = fs.readFileSync(dmgPath);

      try {
        fs.rmSync(path.dirname(path.dirname(dmgPath)), { recursive: true, force: true });
      } catch {
        // noop
      }

      return new NextResponse(content, {
        status: 200,
        headers: {
          "Content-Type": "application/x-apple-diskimage",
          "Content-Disposition": 'attachment; filename="DiagnosticoiPhone.dmg"',
          "Content-Length": String(content.length),
        },
      });
    } catch (error) {
      console.error("[diagnostics:dmg]", error);
      return NextResponse.json(
        { error: "No se pudo generar el DMG. Este endpoint requiere ejecutarse en macOS." },
        { status: 500 }
      );
    }
  }

  if (file === "installer-mac") {
    const script = buildMacInstallerScript(appUrl);
    const content = Buffer.from(script, "utf-8");

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": 'attachment; filename="DiagnosticoiPhone.command"',
        "Content-Length": String(content.length),
      },
    });
  }

  if (file === "install") {
    const content = Buffer.from(LINUX_INSTALL_SCRIPT, "utf-8");
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "application/x-sh",
        "Content-Disposition": 'attachment; filename="install-linux.sh"',
        "Content-Length": String(content.length),
      },
    });
  }

  return NextResponse.json(
    { error: "Archivo no valido", allowed: ["installer-dmg", "installer-mac", "install"] },
    { status: 400 }
  );
}
