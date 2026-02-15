import LeftSidebar from "@/components/shared/LeftSidebar";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import TicketDesignerClient from "@/components/admin/settings/TicketDesignerClient";
import {
    getTicketSettings,
    getLabelSettings,
    getDiscountSettings,
    getPrintRoutingSettings,
    getAppPreferences,
} from "@/lib/services/settingsService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LabelDesignerClient from "@/components/admin/settings/LabelDesignerClient";
import CategoryManagerClient from '@/components/admin/settings/CategoryManagerClient';
import DiscountSettingsClient from "@/components/admin/settings/DiscountSettingsClient";
import PrinterRoutingSettingsClient from "@/components/admin/settings/PrinterRoutingSettingsClient";
import AppPreferencesSettingsClient from "@/components/admin/settings/AppPreferencesSettingsClient";

export default async function SettingsPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams;
    const tab = typeof searchParams.tab === 'string' ? searchParams.tab : 'general';

    const [
        initialTicketSettings,
        initialLabelSettings,
        initialCategories,
        initialDiscountSettings,
        initialPrintRoutingSettings,
        initialAppPreferences,
    ] = await Promise.all([
        getTicketSettings(),
        getLabelSettings("product"), // Load product settings by default
        import("@/lib/services/categoryService").then(m => m.getProductCategories()),
        getDiscountSettings(),
        getPrintRoutingSettings(),
        getAppPreferences(),
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
                <Tabs defaultValue={tab} className="w-full">
                    <TabsList className="grid w-full grid-cols-6">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="tickets">Diseño de Tickets</TabsTrigger>
                        <TabsTrigger value="labels">Diseño de Etiquetas</TabsTrigger>
                        <TabsTrigger value="printers">Impresoras</TabsTrigger>
                        <TabsTrigger value="categories">Categorías</TabsTrigger>
                        <TabsTrigger value="discounts">Descuentos</TabsTrigger>
                    </TabsList>
                    <TabsContent value="general" className="mt-6">
                        <AppPreferencesSettingsClient initialPreferences={initialAppPreferences} />
                    </TabsContent>
                    <TabsContent value="tickets" className="mt-6">
                        <TicketDesignerClient initialSettings={initialTicketSettings} />
                    </TabsContent>
                    <TabsContent value="labels" className="mt-6">
                        <LabelDesignerClient initialSettings={initialLabelSettings} />
                    </TabsContent>
                    <TabsContent value="printers" className="mt-6">
                        <PrinterRoutingSettingsClient initialSettings={initialPrintRoutingSettings} />
                    </TabsContent>
                    <TabsContent value="categories" className="mt-6">
                        <CategoryManagerClient initialCategories={initialCategories} />
                    </TabsContent>
                    <TabsContent value="discounts" className="mt-6">
                        <DiscountSettingsClient initialSettings={initialDiscountSettings} />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}
