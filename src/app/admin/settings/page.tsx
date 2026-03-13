"use client";

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

// Default values for settings
const defaultTicketSettings = {
  paperWidth: 80,
  fontStyle: { bold: false, italic: false },
  header: {
    showLogo: true,
    logoUrl: "",
    show: { storeName: true, address: true, phone: true, rfc: false, website: false },
    storeName: "Mi Tienda",
    address: "",
    phone: "",
    rfc: "",
    website: "",
  },
  body: { showQuantity: true, showUnitPrice: false, showTotal: true, fontSize: "sm" },
  footer: {
    showSubtotal: true,
    showTaxes: true,
    showDiscounts: true,
    thankYouMessage: "¡Gracias por tu compra!",
    additionalInfo: "",
    showQrCode: false,
    qrCodeUrl: "",
  },
};

const defaultLabelSettings = {
  width: 51,
  height: 102,
  orientation: 'vertical',
  fontSize: 9,
  barcodeHeight: 30,
  includeLogo: false,
  logoUrl: "",
  storeName: "Mi Tienda",
  content: { showProductName: true, showSku: true, showPrice: true, showStoreName: false },
};

const defaultDiscountSettings = { discounts: [] };
const defaultPrintRoutingSettings = { useQzTray: false, ticketPrinterName: "", labelPrinterName: "" };
const defaultAppPreferences = { currency: "MXN", language: "es", locale: "es-MX" };

export default async function SettingsPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams;
    const tab = typeof searchParams.tab === 'string' ? searchParams.tab : 'general';

    // Fetch settings with fallbacks to prevent page from hanging
    let initialTicketSettings = defaultTicketSettings;
    let initialLabelSettings = defaultLabelSettings;
    let initialCategories: any[] = [];
    let initialDiscountSettings = defaultDiscountSettings;
    let initialPrintRoutingSettings = defaultPrintRoutingSettings;
    let initialAppPreferences = defaultAppPreferences;
    let initialBranchesWithNotificaciones: any[] = [];

    try {
        const results = await Promise.allSettled([
            getTicketSettings(),
            getLabelSettings("product"),
            import("@/lib/services/categoryService").then(m => m.getProductCategories()),
            getDiscountSettings(),
            getPrintRoutingSettings(),
            getAppPreferences(),
            getBranchesWithNotificaciones(),
        ]);

        // Extract successful results, use defaults for failed ones
        if (results[0].status === 'fulfilled') initialTicketSettings = results[0].value;
        if (results[1].status === 'fulfilled') initialLabelSettings = results[1].value;
        if (results[2].status === 'fulfilled') initialCategories = results[2].value;
        if (results[3].status === 'fulfilled') initialDiscountSettings = results[3].value;
        if (results[4].status === 'fulfilled') initialPrintRoutingSettings = results[4].value;
        if (results[5].status === 'fulfilled') initialAppPreferences = results[5].value;
        if (results[6].status === 'fulfilled') initialBranchesWithNotificaciones = results[6].value;
    } catch (error) {
        console.error("Error loading settings:", error);
    }

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
