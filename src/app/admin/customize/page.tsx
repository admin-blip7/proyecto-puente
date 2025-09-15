import CustomizationClient from "@/components/admin/customize/CustomizationClient";
import LeftSidebar from "@/components/shared/LeftSidebar";
import { getBrandingSettings } from "@/lib/services/settingsService";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default async function AdminCustomizationPage() {
    const initialSettings = await getBrandingSettings();

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
                        <SheetTitle className="sr-only">Customize Menu</SheetTitle>
                        <LeftSidebar />
                    </SheetContent>
                </Sheet>
            </div>
            <main className="flex-1 overflow-auto p-4 md:p-6 md:pt-12">
               <CustomizationClient initialSettings={initialSettings} />
            </main>
        </div>
    )
}
