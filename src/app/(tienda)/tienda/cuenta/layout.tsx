'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, ShoppingBag, LogOut, MapPin } from 'lucide-react'
import { useAuth } from '@/lib/hooks'

export default function AccountLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const { signOut, userProfile } = useAuth()

    const navItems = [
        { href: '/tienda/cuenta/perfil', label: 'Mi Perfil', icon: User },
        { href: '/tienda/cuenta/compras', label: 'Mis Compras', icon: ShoppingBag },
        // { href: '/tienda/cuenta/direcciones', label: 'Direcciones', icon: MapPin }, // Future
    ]

    return (
        <div className="container mx-auto px-4 py-8 lg:py-12">
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar */}
                <aside className="w-full lg:w-64 flex-shrink-0">
                    <div className="bg-card border border-border rounded-xl p-6">
                        <div className="mb-6 pb-6 border-b border-border">
                            <h2 className="font-semibold text-lg">{userProfile?.name || 'Mi Cuenta'}</h2>
                            <p className="text-sm text-muted-foreground">{userProfile?.email}</p>
                        </div>

                        <nav className="space-y-1">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                const isActive = pathname === item.href

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                                ? 'bg-secondary text-foreground'
                                                : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {item.label}
                                    </Link>
                                )
                            })}

                            <button
                                onClick={() => signOut()}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors mt-4"
                            >
                                <LogOut className="w-4 h-4" />
                                Cerrar Sesión
                            </button>
                        </nav>
                    </div>
                </aside>

                {/* content */}
                <main className="flex-1">
                    {children}
                </main>
            </div>
        </div>
    )
}
