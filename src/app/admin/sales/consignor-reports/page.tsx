import LeftSidebar from "@/components/shared/LeftSidebar";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { getConsignors } from "@/lib/services/consignorService";
import ConsignorSelector from "@/components/admin/consignors/ConsignorSelector";

export default async function ConsignorReportsPage() {
    const consignors = await getConsignors();

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
                        <SheetTitle className="sr-only">Consignor Reports Menu</SheetTitle>
                        <LeftSidebar />
                    </SheetContent>
                </Sheet>
            </div>
            <main className="flex-1 overflow-hidden p-4 md:p-6 md:pt-12">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold tracking-tight mb-2">Reportes de Ventas por Consignador</h1>
                    <p className="text-muted-foreground">
                        Selecciona un consignador para ver su reporte detallado de ventas.
                    </p>
                </div>
                <ConsignorSelector consignors={consignors} />
            </main>
        </div>
    );
}