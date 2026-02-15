import Link from "next/link";
import { LayoutDashboard, Package, ReceiptText, Settings } from "lucide-react";
import type { ReactNode } from "react";

const navItems = [
  { href: "/tienda-admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tienda-admin/products", label: "Productos", icon: Package },
  { href: "/tienda-admin/orders", label: "Ordenes", icon: ReceiptText },
  { href: "/tienda-admin/settings", label: "Ajustes", icon: Settings },
];

export default function TiendaAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fafafa] text-black">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border border-black/10 bg-white p-4 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <h1 className="mb-6 font-editors-note text-3xl font-light">
            HiyoRi <span className="text-accent">CMS</span>
          </h1>
          <nav className="space-y-2">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-accent/20"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        <section className="rounded-2xl border border-black/10 bg-white p-6">{children}</section>
      </div>
    </div>
  );
}
