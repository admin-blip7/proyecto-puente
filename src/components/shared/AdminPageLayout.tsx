"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, Bell } from "lucide-react";
import LeftSidebar from "./LeftSidebar";
import MobileSidebar from "./MobileSidebar";

interface AdminPageLayoutProps {
  children: React.ReactNode;
  title?: string;
}

/**
 * Reusable layout for admin pages.
 * - Desktop: Shows LeftSidebar
 * - Mobile: Shows hamburger menu + MobileSidebar overlay
 * 
 * Usage:
 * ```tsx
 * import { AdminPageLayout } from "@/components/shared/AdminPageLayout";
 * 
 * export default function MyPage() {
 *   return (
 *     <AdminPageLayout title="My Page">
 *       <MyContent />
 *     </AdminPageLayout>
 *   );
 * }
 * ```
 */
export function AdminPageLayout({ children, title = "Administración" }: AdminPageLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <LeftSidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      <MobileSidebar 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-background border-b z-40 flex items-center justify-between px-4">
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <span className="font-semibold">{title}</span>
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
        </div>

        {/* Mobile Spacer */}
        <div className="md:hidden h-14 shrink-0" />

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 md:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}
