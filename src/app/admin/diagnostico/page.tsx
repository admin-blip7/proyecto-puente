import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smartphone, Settings } from "lucide-react";
import { AdminPageLayout } from "@/components/shared/AdminPageLayout";
import DiagnosticScanner from "@/components/admin/diagnostico/DiagnosticScanner";
import SetupGuide from "@/components/admin/diagnostico/SetupGuide";

export default function DiagnosticoPage() {
  return (
    <AdminPageLayout title="Diagnóstico">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Smartphone className="h-6 w-6" />
            Diagnóstico iPhone
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Conecta iPhones por USB para leer diagnósticos y agregarlos al inventario automáticamente.
          </p>
          <p className="text-xs text-muted-foreground mt-2 max-w-3xl">
            Este módulo no puede correr como web pura desde el navegador del cliente: el acceso al iPhone
            depende de herramientas locales (`libimobiledevice` + `usbmuxd`) en la máquina que tiene el USB conectado.
          </p>
        </div>

        <Tabs defaultValue="scanner">
          <TabsList>
            <TabsTrigger value="scanner" className="flex items-center gap-1.5">
              <Smartphone className="h-4 w-4" />
              Scanner
            </TabsTrigger>
            <TabsTrigger value="setup" className="flex items-center gap-1.5">
              <Settings className="h-4 w-4" />
              Configuración
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scanner" className="mt-4">
            <DiagnosticScanner />
          </TabsContent>

          <TabsContent value="setup" className="mt-4">
            <SetupGuide />
          </TabsContent>
        </Tabs>
      </div>
    </AdminPageLayout>
  )
}
