export const dynamic = "force-dynamic";

import LeftSidebar from "@/components/shared/LeftSidebar";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { getProducts } from "@/lib/services/productService";
import { getAllPartnerSummaries } from "@/lib/services/masterService";
import MasterDashboardClient from "@/components/admin/inventario-global/MasterDashboardClient";

export default async function InventarioGlobalPage() {
    const [summaries, allProducts] = await Promise.all([
        getAllPartnerSummaries(),
        getProducts(),
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
                        <SheetTitle className="sr-only">Menú Master</SheetTitle>
                        <LeftSidebar />
                    </SheetContent>
                </Sheet>
            </div>
            <main className="flex-1 overflow-auto p-4 md:p-8 md:pt-12">
                <MasterDashboardClient summaries={summaries} allProducts={allProducts} />
            </main>
        </div>
    );
}
