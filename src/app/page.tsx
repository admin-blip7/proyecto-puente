import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import CategoryGrid from '@/components/landing/CategoryGrid';
import PromoBanners from '@/components/landing/PromoBanners';
import DailyDeals from '@/components/landing/DailyDeals';
import ElectronicsDeals from '@/components/landing/ElectronicsDeals';
import AccessoriesGrid from '@/components/landing/AccessoriesGrid';
import Footer from '@/components/landing/Footer';

export default function LandingPage() {
    return (
        <div className="landing-theme font-sans bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark transition-colors duration-300 min-h-screen flex flex-col">
            <Header />
            <main className="container mx-auto px-4 py-6 space-y-12 flex-grow">
                <Hero />
                <CategoryGrid />
                <DailyDeals />
                <PromoBanners />
                <ElectronicsDeals />
                <AccessoriesGrid />
            </main>
            <Footer />
        </div>
    );
}
