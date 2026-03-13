"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, Bell } from "lucide-react";
import MobileSidebar from "./MobileSidebar";

interface MobileLayoutProps {
    children: React.ReactNode;
    title?: string;
}

export function MobileLayout({ children, title = "Panel" }: MobileLayoutProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="flex h-screen w-full flex-row">
            {/* Mobile Header & Sidebar */}
            <div className="md:hidden">
                <div className="fixed top-0 left-0 right-0 h-14 bg-background border-b z-40 flex items-center justify-between px-4">
                    <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
                        <Menu className="h-6 w-6" />
                    </Button>
                    <span className="font-semibold">{title}</span>
                    <Button variant="ghost" size="icon">
                        <Bell className="h-5 w-5" />
                    </Button>
                </div>
                <MobileSidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
                <div className="h-14" />
            </div>

            {children}
        </div>
    );
}
