import AuditClient from "@/components/admin/AuditClient";
import LeftSidebar from "@/components/shared/LeftSidebar";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export default function AuditoriaProductosPage() {
    return (
        <div className="flex h-screen w-full flex-row">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex">
                <LeftSidebar />
            </div>

            {/* Mobile Sidebar Trigger */}
            <div className="absolute top-4 left-4 z-50 md:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon">
                            <Menu className="h-6 w-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-[280px] border-r-0">
                        <SheetTitle className="sr-only">Menú de Auditoría</SheetTitle>
                        <LeftSidebar />
                    </SheetContent>
                </Sheet>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 md:pt-12">
                <div className="max-w-6xl mx-auto">
                    <AuditClient />
                </div>
            </main>
        </div>
    );
}
