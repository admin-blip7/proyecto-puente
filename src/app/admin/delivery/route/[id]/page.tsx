export const dynamic = "force-dynamic";

import LeftSidebar from "@/components/shared/LeftSidebar";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import RouteDetailPanel from "@/components/admin/delivery/RouteDetailPanel";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DeliveryRouteDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <div className="flex h-screen w-full flex-row bg-zinc-50">
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
            <SheetTitle className="sr-only">Delivery menu</SheetTitle>
            <LeftSidebar />
          </SheetContent>
        </Sheet>
      </div>

      <main className="flex-1 overflow-auto p-4 md:p-6 md:pt-8">
        <RouteDetailPanel routeId={id} />
      </main>
    </div>
  );
}
