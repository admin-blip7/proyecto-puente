import LeftSidebar from "@/components/shared/LeftSidebar";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import IntelligenceClient from "@/components/admin/intelligence/IntelligenceClient";
import { getProducts } from "@/lib/services/productService";
import { getSales } from "@/lib/services/salesService";

export default async function IntelligencePage() {
    const products = await getProducts();
    // Load ALL sales for intelligence analysis (not paginated)
    // Using a high limit to ensure we get all historical sales for accurate ABC analysis
    const sales = await getSales('completed', 0, 10000);

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
                        <SheetTitle className="sr-only">Intelligence Menu</SheetTitle>
                        <LeftSidebar />
                    </SheetContent>
                </Sheet>
            </div>
            <main className="flex-1 overflow-auto p-4 md:p-6 md:pt-12">
                <IntelligenceClient allProducts={products} allSales={sales.sales} />
            </main>
        </div>
    )
}
