"use client";

import { Product } from '@/types';
import LeftSidebar from '@/components/shared/LeftSidebar';
import MobileSidebar from '@/components/shared/MobileSidebar';
import POSMobileLayout from '@/components/pos/POSMobileLayout';
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

      {/* Mobile Sidebar (menu overlay) */}
      <MobileSidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* POS Layout - handles mobile vs desktop internally */}
        <POSMobileLayout 
          initialProducts={initialProducts} 
          initialCategories={initialCategories}
          onMenuOpen={() => setMobileMenuOpen(true)}
        />
      </main>
    </div>
  );
}
