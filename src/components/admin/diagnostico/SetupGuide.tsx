"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Terminal,
  Monitor,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Smartphone,
  AlertTriangle,
  Apple,
  Zap,
  Link2,
} from "lucide-react";

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {label && <p className="text-xs text-muted-foreground mb-1">{label}</p>}
      <div className="flex items-start gap-2 rounded-lg bg-zinc-950 dark:bg-zinc-900 p-3">
        <pre className="flex-1 text-sm text-green-400 font-mono whitespace-pre-wrap overflow-x-auto">
          {code}
        </pre>
        <button
          onClick={copy}
          className="shrink-0 text-zinc-400 hover:text-white transition-colors p-0.5"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
        {number}
      </div>
      <div className="space-y-2 flex-1">
        <h3 className="font-semibold">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export default function SetupGuide() {
  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="border-sky-200 dark:border-sky-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Agente local para usar `/admin/diagnostico` desde la web remota
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Este agente corre en la PC/Mac que tiene conectado el iPhone, hace el diagnóstico por USB y
            sincroniza los resultados con esta web. Ya no necesitas capturar token manual.
            Solo descarga el instalador, ábrelo y la misma web vincula esa computadora con tu cuenta.
          </p>

          <div className="grid gap-2 md:grid-cols-3">
            <a
              href="/api/diagnostics/download?file=bridge-agent-dmg"
              download="DiagnosticoBridgeAgent.dmg"
              className="inline-flex items-center justify-center gap-2 rounded-lg border bg-primary text-primary-foreground px-3 py-2 font-medium hover:bg-primary/90 transition-colors"
            >
              <Download className="h-4 w-4" />
              Apple .dmg
            </a>
            <a
              href="/api/diagnostics/download?file=bridge-agent-exe"
              download="DiagnosticoBridgeAgent.exe"
              className="inline-flex items-center justify-center gap-2 rounded-lg border bg-primary text-primary-foreground px-3 py-2 font-medium hover:bg-primary/90 transition-colors"
            >
              <Download className="h-4 w-4" />
              Windows .exe
            </a>
            <a
              href="/api/diagnostics/download?file=bridge-agent-linux-bin"
              download="DiagnosticoBridgeAgent.run"
              className="inline-flex items-center justify-center gap-2 rounded-lg border bg-primary text-primary-foreground px-3 py-2 font-medium hover:bg-primary/90 transition-colors"
            >
              <Download className="h-4 w-4" />
              Linux
            </a>
          </div>

          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100">
            Flujo nuevo:
            <br />
            1. Abres el instalador en la PC con el iPhone.
            <br />
            2. El agente abre `/admin/diagnostico` en tu navegador.
            <br />
            3. La web vincula esa computadora con tu cuenta.
            <br />
            4. Cada diagnóstico queda asociado al usuario que lo lanzó y se guarda en historial.
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-primary">
        <CardContent className="pt-6 pb-5">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Apple className="h-8 w-8 text-primary" />
            </div>

            <div>
              <h2 className="text-xl font-bold">Instalación macOS — Un solo clic</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Instala y verifica `libimobiledevice` para usar el scanner directamente desde esta app.
              </p>
            </div>

            <div className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="font-semibold">Importante: no existe modo “solo web” para este flujo</p>
              <p className="mt-1">
                El navegador no puede ejecutar `idevice_id`, `ideviceinfo` ni abrir el canal USB/iOS que usa
                `libimobiledevice`. Si el iPhone está conectado a tu PC/Mac, esa misma máquina necesita las
                herramientas locales instaladas para que el botón <strong>Diagnosticar</strong> funcione.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 text-xs">
              {["Homebrew", "libimobiledevice", "usbmuxd", "Acceso directo en Escritorio"].map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-1 rounded-full border px-2.5 py-1 bg-muted"
                >
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  {item}
                </span>
              ))}
            </div>

            <a
              href="/api/diagnostics/download?file=bridge-agent-dmg"
              download="DiagnosticoBridgeAgent.dmg"
              className="inline-flex items-center gap-2.5 rounded-xl bg-primary px-8 py-4 text-primary-foreground font-semibold text-base shadow-lg hover:bg-primary/90 active:scale-95 transition-all"
            >
              <Download className="h-5 w-5" />
              Descargar DiagnosticoBridgeAgent.dmg
            </a>

            <div className="space-y-0.5 text-xs text-muted-foreground">
              <p className="font-medium">DiagnosticoBridgeAgent.dmg · macOS 12+</p>
              <p>Descarga · Doble clic · Instalar bridge local · Listo</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3 text-center text-sm">
        {[
          { icon: Download, step: "1", label: "Descarga el DMG" },
          { icon: Zap, step: "2", label: 'Abre el app y haz clic en "Instalar"' },
          { icon: Smartphone, step: "3", label: "Conecta iPhone y escanea" },
        ].map(({ icon: Icon, step, label }) => (
          <div key={step} className="flex flex-col items-center gap-2 rounded-lg border p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold">
              {step}
            </div>
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground leading-tight">{label}</span>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Qué hace el instalador automáticamente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-muted-foreground">
            {[
              "Muestra un diálogo de confirmación (puedes cancelar)",
              "Instala Homebrew si no está en tu Mac",
              "Instala o actualiza libimobiledevice y usbmuxd",
              "Verifica que existan idevice_id, ideviceinfo e idevicediagnostics",
              'Crea un acceso directo "Abrir Diagnóstico iPhone.command" en tu Escritorio',
              "Abre /admin/diagnostico para empezar a escanear",
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                {text}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Próximas veces que quieras usar el diagnóstico</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>El instalador crea un acceso directo en tu Escritorio:</p>
          <div className="flex items-center gap-2 rounded-lg border p-3 bg-muted/50">
            <Apple className="h-5 w-5 shrink-0" />
            <span className="font-medium">Abrir Diagnóstico iPhone.command</span>
          </div>
          <p>Doble clic para abrir la app y validar herramientas/conexión USB rápidamente.</p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Monitor className="h-5 w-5" />
          <h2 className="font-semibold">Linux (Ubuntu / Debian) — instalación manual</h2>
        </div>
        <div className="space-y-5 pl-1">
          <Step number={1} title="Instala libimobiledevice + usbmuxd">
            <CodeBlock code="sudo apt-get update && sudo apt-get install -y libimobiledevice-utils usbmuxd" />
          </Step>
          <Step number={2} title="Activa usbmuxd">
            <CodeBlock code="sudo systemctl enable --now usbmuxd" />
          </Step>
          <Step number={3} title="Verifica conexión de iPhone">
            <CodeBlock code="idevice_id -l" />
          </Step>
        </div>
      </div>

      <Card className="border-green-200 dark:border-green-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Verificar que funciona
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">Con el iPhone conectado por USB:</p>
          <CodeBlock code="idevice_id -l" label="Debe mostrar al menos un UDID" />
          <CodeBlock
            code="ideviceinfo -u <UDID> -k ProductType"
            label="Valida lectura real del dispositivo"
          />
          <p className="text-muted-foreground">
            Si estos comandos responden, el scanner de <strong>/admin/diagnostico</strong> queda operativo.
          </p>
        </CardContent>
      </Card>

      <Card className="border-yellow-200 dark:border-yellow-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            Solución de problemas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {[
            {
              problem: "La página muestra 'Scanner offline'",
              fix: "Faltan herramientas CLI. Instala libimobiledevice y recarga la página.",
            },
            {
              problem: "El iPhone no aparece en el scanner",
              fix: "Reconecta el cable USB y acepta 'Confiar en este ordenador' en el iPhone.",
            },
            {
              problem: "Could not connect to lockdownd",
              fix: "No hay pairing válido todavía. Desbloquea el iPhone, acepta confianza y reintenta.",
            },
            {
              problem: "idevice_id: command not found",
              fix: "libimobiledevice no quedó instalado correctamente. Reinstala con brew o apt.",
            },
            {
              problem: "Linux: permiso denegado al USB",
              fix: "Reinicia usbmuxd, reconecta el iPhone y ejecuta de nuevo tras desbloquearlo.",
            },
          ].map((item) => (
            <div key={item.problem} className="space-y-0.5">
              <p className="font-medium text-yellow-700 dark:text-yellow-400">{item.problem}</p>
              <p className="text-muted-foreground">{item.fix}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Limitación: navegador web</p>
        <p>
          Aunque la UI viva en <strong>/admin/diagnostico</strong>, el navegador por sí solo no puede leer un
          iPhone por USB como lo hace `libimobiledevice`. Para un flujo 100% sin instalación en la PC del
          usuario haría falta cambiar de arquitectura y usar hardware o servicio intermediario dedicado, no solo
          una página web.
        </p>
      </div>

      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Limitación: Piezas originales</p>
        <p>
          No existe API pública para verificar piezas OEM (pantalla, Face ID, etc.) por USB.
          Apple solo lo muestra en: <strong>Ajustes › General › Acerca de › Piezas y servicio</strong>.
        </p>
      </div>
    </div>
  );
}
