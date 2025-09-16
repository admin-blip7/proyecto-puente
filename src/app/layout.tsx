import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { Toaster } from '@/components/ui/toaster';
import { Inter } from 'next/font/google'

export const metadata: Metadata = {
  title: 'Storefront Swift',
  description: 'Modern Point of Sale System',
};

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${inter.variable} antialiased`}>
        <AuthProvider>
            {children}
            <Toaster />
        </AuthProvider>
        <div id="portal-root" />
      </body>
    </html>
  );
}
