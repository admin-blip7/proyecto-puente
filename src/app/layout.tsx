import '@/lib/polyfill-storage';
import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from '@/components/ui/toaster';
import { Public_Sans } from 'next/font/google'
import ErrorSuppressionScript from '@/components/shared/ErrorSuppressionScript';

export const metadata: Metadata = {
  title: '22 Electronic Group',
  description: 'Modern Point of Sale System',
};

const publicSans = Public_Sans({ subsets: ['latin'], variable: '--font-sans' })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${publicSans.variable} antialiased`} suppressHydrationWarning>
        <ErrorSuppressionScript />
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
        <div id="portal-root" />
      </body>
    </html>
  );
}
