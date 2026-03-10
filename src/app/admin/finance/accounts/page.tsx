import LeftSidebar from "@/components/shared/LeftSidebar";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import AccountsClient from "@/components/admin/finance/accounts/AccountsClient";
import { getAccounts } from "@/lib/services/accountService";

// Render at runtime instead of build time (requires Supabase credentials)
export const dynamic = "force-dynamic";

export default async function AccountsPage() {
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
                    <SheetContent side="left" className="p-0 w-[280px] border-r-0">
                        <SheetTitle className="sr-only">Finance Menu</SheetTitle>
                        <LeftSidebar />
                    </SheetContent>
                </Sheet>
            </div>
            <main className="flex-1 overflow-auto p-4 md:p-6 md:pt-12">
              <AccountsClient initialAccounts={initialAccounts} />
            </main>
        </div>
    )
}
