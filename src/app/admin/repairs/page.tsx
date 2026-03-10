export const dynamic = "force-dynamic";

import LeftSidebar from "@/components/shared/LeftSidebar";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import RepairDashboard from "@/components/admin/repairs/RepairDashboard";
import { getRepairOrders } from "@/lib/services/repairService";
import { getProducts } from "@/lib/services/productService";
import { getTicketSettings, getLabelSettings } from "@/lib/services/settingsService";

export default async function RepairsPage() {
    const [initialOrders, spareParts, ticketSettings, labelSettings] = await Promise.all([
        getRepairOrders(),
        getProducts(),
        getTicketSettings(),
        getLabelSettings("repair")
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
                    <SheetContent side="left" className="p-0 w-[280px] border-r-0">
                        <SheetTitle className="sr-only">Repairs Menu</SheetTitle>
                        <LeftSidebar />
                    </SheetContent>
                </Sheet>
            </div>
            <main className="flex-1 overflow-auto p-4 md:p-6 md:pt-12">
                <RepairDashboard
                    initialOrders={initialOrders}
                    allSpareParts={spareParts.filter(p => p.type === 'Refacción')}
                    ticketSettings={ticketSettings}
                    labelSettings={labelSettings}
                />
            </main>
        </div>
    )
}
