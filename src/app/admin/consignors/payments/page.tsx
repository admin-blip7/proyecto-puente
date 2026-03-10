import LeftSidebar from "@/components/shared/LeftSidebar";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, DollarSign } from "lucide-react";
import ConsignorPaymentsClient from "@/components/admin/consignors/ConsignorPaymentsClient";

export default async function ConsignorPaymentsPage() {
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
                        <SheetTitle className="sr-only">Consignors Payments Menu</SheetTitle>
                        <LeftSidebar />
                    </SheetContent>
                </Sheet>
            </div>
            <main className="flex-1 overflow-hidden p-4 md:p-6 md:pt-12">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <DollarSign className="h-6 w-6 text-green-600" />
                        Pagos de Consignadores
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Gestiona y visualiza todos los pagos realizados a consignadores
                    </p>
                </div>
                <ConsignorPaymentsClient />
            </main>
        </div>
    )
}