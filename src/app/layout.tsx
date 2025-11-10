import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { Toaster } from '@/components/ui/toaster';
import { Inter } from 'next/font/google'
import ErrorSuppressionScript from '@/components/shared/ErrorSuppressionScript';

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
      <head>
        {/* Block problematic service workers and fix Response issues */}
        <Script 
          src="/sw-block.js" 
          strategy="beforeInteractive"
        />
      </head>
      <body className={`font-sans ${inter.variable} antialiased`}>
        <ErrorSuppressionScript />
        <AuthProvider>
            {children}
            <Toaster />
        </AuthProvider>
        <div id="portal-root" />
      </body>
    </html>
  );
}
