import '@/app/globals.css'
import { ThemeProvider } from 'next-themes'
import { Inter } from 'next/font/google'
import type { Metadata } from 'next'
import { CartProvider } from '@/components/tienda/cart/CartProvider'
import { TiendaHeader } from '@/components/tienda/layout/TiendaHeader'
import { TiendaFooter } from '@/components/tienda/layout/TiendaFooter'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '22 Electronic - Tienda Online',
  description: 'Tienda oficial de 22 Electronic - Productos de tecnología y electrónica',
}

export default function TiendaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <CartProvider>
        <div className={`${inter.className} tienda-theme min-h-screen flex flex-col text-black dark:text-white`}>
          <TiendaHeader />
          <main className="flex-1">
            {children}
          </main>
          <TiendaFooter />
        </div>
      </CartProvider>
    </ThemeProvider>
  )
}
