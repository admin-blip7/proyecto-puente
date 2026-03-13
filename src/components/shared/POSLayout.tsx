import POSClient from '@/components/pos/POSClient';
import { Product } from '@/types';
import LeftSidebar from '@/components/shared/LeftSidebar';
import MobileSidebar from '@/components/shared/MobileSidebar';
import { Button } from '@/components/ui/button';
import { Menu, Bell } from 'lucide-react';
import { useState } from 'react';

interface POSLayoutProps {
  initialProducts: Product[];
  initialCategories: any[];
}

export function POSLayoutWithMobile({ initialProducts, initialCategories }: POSLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <LeftSidebar />
      </div>

      {/* Mobile Header & Sidebar */}
      <div className="md:hidden">
        <div className="fixed top-0 left-0 right-0 h-14 bg-background border-b z-40 flex items-center justify-between px-4">
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <span className="font-semibold">POS</span>
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
        </div>
        <MobileSidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        <div className="h-14" />
      </div>

      <main className="flex-1 flex flex-col overflow-hidden">
        <POSClient initialProducts={initialProducts} initialCategories={initialCategories} />
      </main>
    </div>
  );
}
