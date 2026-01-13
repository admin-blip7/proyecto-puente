export const dynamic = "force-dynamic";

import LeftSidebar from "@/components/shared/LeftSidebar";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { getProducts } from "@/lib/services/productService";
import { getRecentKardexEntries } from "@/lib/services/kardexService";
import KardexProductListClient from "@/components/admin/kardex/KardexProductListClient";

export default async function KardexProductsPage() {
  const [products, recentMovements] = await Promise.all([
    getProducts(),
    getRecentKardexEntries(10),
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
            <SheetTitle className="sr-only">Kardex Menu</SheetTitle>
            <LeftSidebar />
          </SheetContent>
        </Sheet>
      </div>
      <main className="flex-1 overflow-auto p-4 md:p-6 md:pt-12">
        <KardexProductListClient products={products} recentMovements={recentMovements} />
      </main>
    </div>
  );
}

