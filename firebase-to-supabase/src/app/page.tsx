import POSClient from '@/components/pos/POSClient';
import { Product } from '@/types';
import LeftSidebar from '@/components/shared/LeftSidebar';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { getProducts } from '@/lib/services/productService';

export default async function POSPage() {
  const initialProducts = await getProducts();
  return (
    <div className="flex h-screen w-full bg-background">
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
              <SheetTitle className="sr-only">Main Menu</SheetTitle>
              <LeftSidebar />
            </SheetContent>
          </Sheet>
       </div>
      <main className="flex-1 flex flex-col overflow-hidden">
        <POSClient initialProducts={initialProducts} />
      </main>
    </div>
  );
} 
