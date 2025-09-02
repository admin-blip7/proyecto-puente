import LeftSidebar from "@/components/shared/LeftSidebar";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { getWarranties } from "@/lib/services/warrantyService";
import WarrantyClient from "@/components/admin/warranties/WarrantyClient";

export default async function WarrantiesPage() {
    const initialWarranties = await getWarranties();
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
                    <LeftSidebar />
                    </SheetContent>
                </Sheet>
            </div>
            <main className="flex-1 overflow-hidden p-4 md:p-6 md:pt-12">
                <WarrantyClient initialWarranties={initialWarranties} />
            </main>
        </div>
    )
}
