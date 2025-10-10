import LeftSidebar from "@/components/shared/LeftSidebar";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import CreditClient from "@/components/admin/credit/CreditClient";
import { getClientsWithCredit } from "@/lib/services/creditService";
import { getAccounts } from "@/lib/services/accountService";
import { ModalForm } from "@/components/shared/ModalForm";


export default async function CreditPage() {
    const initialClients = await getClientsWithCredit();
    const initialAccounts = await getAccounts();

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
                        <SheetTitle className="sr-only">Menú Crédito</SheetTitle>
                        <LeftSidebar />
                    </SheetContent>
                </Sheet>
            </div>
            <main className="flex-1 overflow-auto p-4 md:p-6 md:pt-12">
               <CreditClient initialClients={initialClients} initialAccounts={initialAccounts} />
               <div className="mt-8">
                <ModalForm />
               </div>
            </main>
        </div>
    )
}
