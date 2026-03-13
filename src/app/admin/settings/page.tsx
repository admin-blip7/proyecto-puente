import LeftSidebar from "@/components/shared/LeftSidebar";
import MobileSidebar from "@/components/shared/MobileSidebar";
import { Button } from "@/components/ui/button";
import { Menu, Bell } from "lucide-react";
import { useState } from "react";
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
import NotificacionesSettingsClient from "@/components/admin/settings/NotificacionesSettingsClient";
import { getBranchesWithNotificaciones } from "@/lib/services/masterService";

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
        initialBranchesWithNotificaciones,
    ] = await Promise.all([
        getTicketSettings(),
        getLabelSettings("product"),
        import("@/lib/services/categoryService").then(m => m.getProductCategories()),
        getDiscountSettings(),
        getPrintRoutingSettings(),
        getAppPreferences(),
        getBranchesWithNotificaciones(),
    ]);

    return (
        <SettingsLayoutWithMobile
            tab={tab}
            initialTicketSettings={initialTicketSettings}
            initialLabelSettings={initialLabelSettings}
            initialCategories={initialCategories}
            initialDiscountSettings={initialDiscountSettings}
            initialPrintRoutingSettings={initialPrintRoutingSettings}
            initialAppPreferences={initialAppPreferences}
            initialBranchesWithNotificaciones={initialBranchesWithNotificaciones}
        />
    )
}

function SettingsLayoutWithMobile({
    tab,
    initialTicketSettings,
    initialLabelSettings,
    initialCategories,
    initialDiscountSettings,
    initialPrintRoutingSettings,
    initialAppPreferences,
    initialBranchesWithNotificaciones
}: {
    tab: string;
    initialTicketSettings: unknown;
    initialLabelSettings: unknown;
    initialCategories: unknown;
    initialDiscountSettings: unknown;
    initialPrintRoutingSettings: unknown;
    initialAppPreferences: unknown;
    initialBranchesWithNotificaciones: unknown;
}) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="flex h-screen w-full flex-row">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex">
                <LeftSidebar />
            </div>

            {/* Mobile Header & Sidebar */}
            <div className="md:hidden">
                <div className="fixed top-0 left-0 right-0 h-14 bg-background border-b z-40 flex items-center justify-between px-4">
                    <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
                        <Menu className="h-6 w-6" />
                    </Button>
                    <span className="font-semibold">Configuración</span>
                    <Button variant="ghost" size="icon">
                        <Bell className="h-5 w-5" />
                    </Button>
                </div>
                <MobileSidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
                <div className="h-14" />
            </div>

            <main className="flex-1 overflow-auto p-4 md:p-6 md:pt-12">
                <Tabs defaultValue={tab} className="w-full">
                    {/* Mobile: Horizontal scroll tabs with icons */}
                    <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                        <TabsList className="flex w-max md:w-full grid-cols-4 md:grid-cols-7">
                            <TabsTrigger value="general">🏠</TabsTrigger>
                            <TabsTrigger value="tickets">🎫</TabsTrigger>
                            <TabsTrigger value="labels">🏷️</TabsTrigger>
                            <TabsTrigger value="printers">🖨️</TabsTrigger>
                            <TabsTrigger value="categories">📁</TabsTrigger>
                            <TabsTrigger value="discounts">%</TabsTrigger>
                            <TabsTrigger value="notificaciones">🔔</TabsTrigger>
                        </TabsList>
                    </div>
                    <TabsContent value="general" className="mt-6">
                        <AppPreferencesSettingsClient initialPreferences={initialAppPreferences as any} />
                    </TabsContent>
                    <TabsContent value="tickets" className="mt-6">
                        <TicketDesignerClient initialSettings={initialTicketSettings as any} />
                    </TabsContent>
                    <TabsContent value="labels" className="mt-6">
                        <LabelDesignerClient initialSettings={initialLabelSettings as any} />
                    </TabsContent>
                    <TabsContent value="printers" className="mt-6">
                        <PrinterRoutingSettingsClient initialSettings={initialPrintRoutingSettings as any} />
                    </TabsContent>
                    <TabsContent value="categories" className="mt-6">
                        <CategoryManagerClient initialCategories={initialCategories as any} />
                    </TabsContent>
                    <TabsContent value="discounts" className="mt-6">
                        <DiscountSettingsClient initialSettings={initialDiscountSettings as any} />
                    </TabsContent>
                    <TabsContent value="notificaciones" className="mt-6">
                        <NotificacionesSettingsClient initialBranches={initialBranchesWithNotificaciones as any} />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}
