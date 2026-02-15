import '@/lib/polyfill-storage';
import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from '@/components/ui/toaster';
import { Inter } from 'next/font/google'
import ErrorSuppressionScript from '@/components/shared/ErrorSuppressionScript';
import { getAppPreferences } from "@/lib/services/settingsService";
import { AppPreferencesProvider } from "@/components/preferences/AppPreferencesProvider";

export const metadata: Metadata = {
  title: '22 Electronic Group',
  description: 'Modern Point of Sale System',
};

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const appPreferences = await getAppPreferences();

  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`font-sans ${inter.variable} antialiased`} suppressHydrationWarning>
        <ErrorSuppressionScript />
        <AuthProvider>
          <AppPreferencesProvider initialPreferences={appPreferences}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster />
            </ThemeProvider>
          </AppPreferencesProvider>
        </AuthProvider>
        <div id="portal-root" />
      </body>
    </html>
  );
}
