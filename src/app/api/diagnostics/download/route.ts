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

function quoteShell(value: string): string {
  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}

function buildBridgeAgentMacScript(appOrigin: string, token: string, agentName: string): string {
  return [
    "#!/bin/bash",
    "set -e",
    "",
    "clear",
    'echo "============================================================"',
    'echo "  Diagnóstico iPhone - Agente local bridge"',
    'echo "============================================================"',
    'echo ""',
    'if ! command -v node >/dev/null 2>&1; then',
    '  echo "Node.js 18+ no está instalado."',
    '  echo "Instálalo y vuelve a ejecutar este archivo."',
    '  read -r -p "Presiona Enter para cerrar..." _',
    "  exit 1",
    "fi",
    'for tool in idevice_id ideviceinfo idevicediagnostics idevicepair; do',
    '  if ! command -v "$tool" >/dev/null 2>&1; then',
    '    echo "Falta $tool. Instala libimobiledevice primero."',
    '    read -r -p "Presiona Enter para cerrar..." _',
    "    exit 1",
    "  fi",
    "done",
    "",
    'WORKDIR="$HOME/.22electronic-diagnostics-agent"',
    'mkdir -p "$WORKDIR"',
    'cd "$WORKDIR"',
    `curl -fsSL ${quoteShell(`${appOrigin}/api/diagnostics/download?file=bridge-agent-js`)} -o bridge-agent.mjs`,
    `export DIAG_AGENT_URL=${quoteShell(appOrigin)}`,
    `export DIAG_AGENT_TOKEN=${quoteShell(token)}`,
    `export DIAG_AGENT_NAME=${quoteShell(agentName)}`,
    'echo "Iniciando agente local..."',
    'node bridge-agent.mjs',
  ].join("\n");
}

function buildBridgeAgentLinuxScript(appOrigin: string, token: string, agentName: string): string {
  return [
    "#!/usr/bin/env bash",
    "set -e",
    "",
    'if ! command -v node >/dev/null 2>&1; then',
    '  echo "Node.js 18+ no está instalado."',
    "  exit 1",
    "fi",
    'for tool in idevice_id ideviceinfo idevicediagnostics idevicepair; do',
    '  if ! command -v "$tool" >/dev/null 2>&1; then',
    '    echo "Falta $tool. Instala libimobiledevice primero."',
    "    exit 1",
    "  fi",
    "done",
    'WORKDIR="$HOME/.22electronic-diagnostics-agent"',
    'mkdir -p "$WORKDIR"',
    'cd "$WORKDIR"',
    `curl -fsSL ${quoteShell(`${appOrigin}/api/diagnostics/download?file=bridge-agent-js`)} -o bridge-agent.mjs`,
    `export DIAG_AGENT_URL=${quoteShell(appOrigin)}`,
    `export DIAG_AGENT_TOKEN=${quoteShell(token)}`,
    `export DIAG_AGENT_NAME=${quoteShell(agentName)}`,
    'node bridge-agent.mjs',
  ].join("\n");
}

function escapePowerShell(value: string): string {
  return value.replace(/'/g, "''");
}

function buildBridgeAgentWindowsScript(appOrigin: string, token: string, agentName: string): string {
  return [
    '$ErrorActionPreference = "Stop"',
    'Write-Host "Diagnóstico iPhone - Agente local bridge"',
    'if (-not (Get-Command node -ErrorAction SilentlyContinue)) {',
    '  Write-Host "Node.js 18+ no está instalado."',
    "  exit 1",
    "}",
    '$required = @("idevice_id","ideviceinfo","idevicediagnostics","idevicepair")',
    'foreach ($tool in $required) {',
    '  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {',
    '    Write-Host "Falta $tool. Instala libimobiledevice primero."',
    "    exit 1",
    "  }",
    "}",
    '$workdir = Join-Path $HOME ".22electronic-diagnostics-agent"',
    'New-Item -ItemType Directory -Force -Path $workdir | Out-Null',
    'Set-Location $workdir',
    `Invoke-WebRequest -Uri '${escapePowerShell(`${appOrigin}/api/diagnostics/download?file=bridge-agent-js`)}' -OutFile 'bridge-agent.mjs'`,
    `$env:DIAG_AGENT_URL='${escapePowerShell(appOrigin)}'`,
    `$env:DIAG_AGENT_TOKEN='${escapePowerShell(token)}'`,
    `$env:DIAG_AGENT_NAME='${escapePowerShell(agentName)}'`,
    'node .\\bridge-agent.mjs',
  ].join("\r\n");
}

function readNativeBridgeAsset(filename: string): Buffer | null {
  const assetPath = path.join(process.cwd(), "iphone-diagnostic-service", "dist", filename);
  if (!fs.existsSync(assetPath)) {
    return null;
  }
  return fs.readFileSync(assetPath);
}

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
  const appOrigin = appUrl.replace(/\/admin\/diagnostico$/, "");
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const name = req.nextUrl.searchParams.get("name") ?? "Agente Recepción";

  if (file === "bridge-agent-js") {
    const agentPath = path.join(process.cwd(), "iphone-diagnostic-service", "bridge-agent.mjs");
    const content = fs.readFileSync(agentPath);

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Content-Disposition": 'attachment; filename="bridge-agent.mjs"',
        "Content-Length": String(content.length),
      },
    });
  }

  if (file === "bridge-agent-dmg") {
    const content = readNativeBridgeAsset("DiagnosticoBridgeAgent.dmg");
    if (!content) {
      return NextResponse.json({ error: "DMG del bridge agent no disponible en este entorno" }, { status: 404 });
    }
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "application/x-apple-diskimage",
        "Content-Disposition": 'attachment; filename="DiagnosticoBridgeAgent.dmg"',
        "Content-Length": String(content.length),
      },
    });
  }

  if (file === "bridge-agent-exe") {
    const content = readNativeBridgeAsset("bridge-agent-win-x64.exe");
    if (!content) {
      return NextResponse.json({ error: "EXE del bridge agent no disponible en este entorno" }, { status: 404 });
    }
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.microsoft.portable-executable",
        "Content-Disposition": 'attachment; filename="DiagnosticoBridgeAgent.exe"',
        "Content-Length": String(content.length),
      },
    });
  }

  if (file === "bridge-agent-linux-bin") {
    const content = readNativeBridgeAsset("bridge-agent-linux-x64");
    if (!content) {
      return NextResponse.json({ error: "Binario Linux del bridge agent no disponible en este entorno" }, { status: 404 });
    }
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": 'attachment; filename="DiagnosticoBridgeAgent.run"',
        "Content-Length": String(content.length),
      },
    });
  }

  if (file === "bridge-agent-mac") {
    if (!token) {
      return NextResponse.json({ error: "Falta token para generar el instalador del agente" }, { status: 400 });
    }
    const content = Buffer.from(buildBridgeAgentMacScript(appOrigin, token, name), "utf-8");
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": 'attachment; filename="DiagnosticoBridgeAgent.command"',
        "Content-Length": String(content.length),
      },
    });
  }

  if (file === "bridge-agent-linux") {
    if (!token) {
      return NextResponse.json({ error: "Falta token para generar el instalador del agente" }, { status: 400 });
    }
    const content = Buffer.from(buildBridgeAgentLinuxScript(appOrigin, token, name), "utf-8");
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "application/x-sh",
        "Content-Disposition": 'attachment; filename="diagnostico-bridge-agent.sh"',
        "Content-Length": String(content.length),
      },
    });
  }

  if (file === "bridge-agent-ps1") {
    if (!token) {
      return NextResponse.json({ error: "Falta token para generar el instalador del agente" }, { status: 400 });
    }
    const content = Buffer.from(buildBridgeAgentWindowsScript(appOrigin, token, name), "utf-8");
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename="DiagnosticoBridgeAgent.ps1"',
        "Content-Length": String(content.length),
      },
    });
  }

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
    { error: "Archivo no valido", allowed: ["bridge-agent-js", "bridge-agent-dmg", "bridge-agent-exe", "bridge-agent-linux-bin", "bridge-agent-mac", "bridge-agent-linux", "bridge-agent-ps1", "installer-dmg", "installer-mac", "install"] },
    { status: 400 }
  );
}
