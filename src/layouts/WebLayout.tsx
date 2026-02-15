import Navbar from '@/components/web/Navbar';
import Footer from '@/components/web/Footer';
import type { CSSProperties } from 'react';

const webPaletteVars = {
    '--lp-bg': '#E8EAEE',
    '--lp-surface': '#F4F6F8',
    '--lp-card': '#FFFFFF',
    '--lp-card-soft': '#F8FAFC',
    '--lp-border': '#D8DEE6',
    '--lp-text': '#111827',
    '--lp-muted': '#637086',
    '--lp-accent': '#12B76A',
    '--lp-accent-soft': '#DCF6E8',
    '--lp-lime': '#9afa4b',
    '--lp-navy': '#162447',
    '--lp-navy-soft': '#203A71',
    '--lp-warning': '#F97316',
    '--lp-danger': '#EF4444',
    '--lp-star': '#F5B301',
} as CSSProperties;

export default function WebLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="web-layout flex min-h-screen flex-col bg-[var(--lp-bg)] text-[var(--lp-text)]" style={webPaletteVars}>
            <Navbar />

            <main className="content flex-1">
                {children}
            </main>

            <Footer />
        </div>
    );
}
