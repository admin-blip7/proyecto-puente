import LeftSidebar from "@/components/shared/LeftSidebar";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { getConsignors } from "@/lib/services/consignorService";
import ConsignorClient from "@/components/admin/consignors/ConsignorClient";
import { getProducts } from "@/lib/services/productService";
import { getSales } from "@/lib/services/salesService";

export default async function ConsignorsPage() {
    const initialConsignors = await getConsignors();
    const allProducts = await getProducts();
    const allSales = await getSales();

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
                        <SheetTitle className="sr-only">Consignors Menu</SheetTitle>
                        <LeftSidebar />
                    </SheetContent>
                </Sheet>
            </div>
            <main className="flex-1 overflow-hidden p-4 md:p-6 md:pt-12">
               <ConsignorClient 
                initialConsignors={initialConsignors}
                allProducts={allProducts}
                allSales={allSales}
               />
            </main>
        </div>
    )
}
