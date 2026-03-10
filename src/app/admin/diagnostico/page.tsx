import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Smartphone, Settings } from "lucide-react";
import LeftSidebar from "@/components/shared/LeftSidebar";
import DiagnosticScanner from "@/components/admin/diagnostico/DiagnosticScanner";
import SetupGuide from "@/components/admin/diagnostico/SetupGuide";

export default function DiagnosticoPage() {
  return (
    <div className="flex h-screen w-full flex-row">
      <div className="hidden md:flex">
        <LeftSidebar />
      </div>

      {/* Mobile sidebar */}
      <div className="absolute top-4 left-4 z-50 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[280px] border-r-0">
            <SheetTitle className="sr-only">Admin Menu</SheetTitle>
            <LeftSidebar />
          </SheetContent>
        </Sheet>
      </div>

      <main className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Smartphone className="h-6 w-6" />
            Diagnóstico iPhone
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Conecta iPhones por USB para leer diagnósticos y agregarlos al inventario automáticamente.
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
      </main>
    </div>
  );
}
