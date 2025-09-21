import LeftSidebar from "@/components/shared/LeftSidebar";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import TicketDesignerClient from "@/components/admin/settings/TicketDesignerClient";
import { getTicketSettings, getLabelSettings, getContractTemplate } from "@/lib/services/settingsService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LabelDesignerClient from "@/components/admin/settings/LabelDesignerClient";
import ContractTemplateClient from "@/components/admin/settings/ContractTemplateClient";


export default async function SettingsPage() {
    const [initialTicketSettings, initialLabelSettings, initialContractTemplate] = await Promise.all([
        getTicketSettings(),
        getLabelSettings(),
        getContractTemplate()
    ]);
   
    return (
        <div className="flex h-screen w-full flex-row">
            <div className="hidden md:flex">
                <LeftSidebar />
            </div>
            <div className="absolute top-4 left-4 z-50 md:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Menu className="h-6 w-6" />
                    </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-24">
                        <SheetTitle className="sr-only">Ajustes Menu</SheetTitle>
                        <LeftSidebar />
                    </SheetContent>
                </Sheet>
            </div>
            <main className="flex-1 overflow-auto p-4 md:p-6 md:pt-12">
              <Tabs defaultValue="tickets" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="tickets">Diseño de Tickets</TabsTrigger>
                    <TabsTrigger value="labels">Diseño de Etiquetas</TabsTrigger>
                    <TabsTrigger value="contract">Plantilla de Contrato</TabsTrigger>
                </TabsList>
                <TabsContent value="tickets" className="mt-6">
                    <TicketDesignerClient initialSettings={initialTicketSettings} />
                </TabsContent>
                <TabsContent value="labels" className="mt-6">
                    <LabelDesignerClient initialSettings={initialLabelSettings} />
                </TabsContent>
                <TabsContent value="contract" className="mt-6">
                    <ContractTemplateClient initialSettings={initialContractTemplate} />
                </TabsContent>
              </Tabs>
            </main>
        </div>
    )
}
