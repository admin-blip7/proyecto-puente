"use client";

import { Header } from "@/components/shared/Header";
import InventoryClient from "@/components/admin/InventoryClient";
import { Product } from "@/types";
import LeftSidebar from "@/components/shared/LeftSidebar";
import MobileSidebar from "@/components/shared/MobileSidebar";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Bell } from "lucide-react";
import { getProducts } from "@/lib/services/productService";
import { useState } from "react";


export default async function AdminPage() {
    const initialProducts = await getProducts();
    return (
        <AdminLayoutWithMobile initialProducts={initialProducts} />
    )
}

function AdminLayoutWithMobile({ initialProducts }: { initialProducts: Product[] }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="flex h-screen w-full flex-row">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex">
                <LeftSidebar />
            </div>

            {/* Mobile Header & Sidebar */}
            <div className="md:hidden">
                {/* Mobile Header */}
                <div className="fixed top-0 left-0 right-0 h-14 bg-background border-b z-40 flex items-center justify-between px-4">
                    <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
                        <Menu className="h-6 w-6" />
                    </Button>
                    <span className="font-semibold">Inventario</span>
                    <Button variant="ghost" size="icon">
                        <Bell className="h-5 w-5" />
                    </Button>
                </div>

                {/* Mobile Sidebar */}
                <MobileSidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

                {/* Spacer for fixed header */}
                <div className="h-14" />
            </div>

            <main className="flex-1 overflow-hidden p-4 md:p-6 md:pt-12">
                <InventoryClient initialProducts={initialProducts} />
            </main>
        </div>
    )
}
