"use client";

import Link from 'next/link';
import {
    Menu,
    Search,
    ShoppingBag,
    User,
    X
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import LocalizedCurrencyText from '@/components/preferences/LocalizedCurrencyText';

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <>
            {/* Top Bar */}
            <div className="bg-secondary text-white dark:bg-primary dark:text-secondary py-2 px-6 text-xs md:text-sm font-medium sticky top-0 z-50 transition-colors">
                <div className="max-w-[1600px] mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="opacity-90">347 People Viewing Wholesale Deals Now</span>
                    </div>
                    <div className="hidden sm:block opacity-90">
                        <span className="mr-2">🚚</span>
                        Free Expedited Shipping On Orders Over <LocalizedCurrencyText amount={500} />
                    </div>
                </div>
            </div>

            {/* Main Navbar */}
            <nav className="bg-brand-blue/30 backdrop-blur-md border-b border-white/20 dark:border-slate-700/50 sticky top-[36px] z-40 transition-colors">
                <div className="max-w-[1600px] mx-auto px-6">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/" className="text-xl md:text-2xl font-black tracking-tighter text-secondary dark:text-white flex items-center gap-2">
                                Refurbished <span className="text-brand-blue">Premium</span> Tech
                            </Link>
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex space-x-8">
                            <Link className="text-slate-700 dark:text-slate-300 hover:text-secondary dark:hover:text-white font-medium transition-colors" href="/products">
                                Deals
                            </Link>
                            <Link className="text-slate-700 dark:text-slate-300 hover:text-secondary dark:hover:text-white font-medium transition-colors" href="/products">
                                Bulk Orders
                            </Link>
                            <Link className="text-slate-700 dark:text-slate-300 hover:text-secondary dark:hover:text-white font-medium transition-colors" href="/products">
                                New Arrivals
                            </Link>
                            <Link className="text-slate-700 dark:text-slate-300 hover:text-secondary dark:hover:text-white font-medium transition-colors" href="/products">
                                Brands
                            </Link>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-4">
                            <div className="relative hidden sm:block">
                                <input
                                    className="pl-4 pr-10 py-2 rounded-full border-none bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary text-sm w-64 placeholder-slate-500 dark:text-white transition-all outline-none"
                                    placeholder="Searching..."
                                    type="text"
                                />
                                <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                            </div>

                            <button className="text-slate-700 dark:text-slate-300 hover:text-secondary dark:hover:text-white">
                                <User className="w-6 h-6" />
                            </button>

                            <Link href="/checkout" className="relative text-slate-700 dark:text-slate-300 hover:text-secondary dark:hover:text-white">
                                <ShoppingBag className="w-6 h-6" />
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">2</span>
                            </Link>

                            {/* Mobile Menu Button */}
                            <button
                                className="md:hidden text-slate-700 dark:text-slate-300"
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                            >
                                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 absolute w-full left-0 top-full p-4 flex flex-col gap-4 shadow-xl">
                        <input
                            className="w-full pl-4 pr-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary text-sm"
                            placeholder="Searching..."
                            type="text"
                        />
                        <Link className="text-lg font-medium text-secondary dark:text-white" href="/products" onClick={() => setIsMenuOpen(false)}>Deals</Link>
                        <Link className="text-lg font-medium text-secondary dark:text-white" href="/products" onClick={() => setIsMenuOpen(false)}>Bulk Orders</Link>
                        <Link className="text-lg font-medium text-secondary dark:text-white" href="/products" onClick={() => setIsMenuOpen(false)}>New Arrivals</Link>
                        <Link className="text-lg font-medium text-secondary dark:text-white" href="/products" onClick={() => setIsMenuOpen(false)}>Brands</Link>
                        <hr className="border-slate-200 dark:border-slate-700" />
                        <Link className="text-lg font-medium text-secondary dark:text-white" href="/login" onClick={() => setIsMenuOpen(false)}>Login</Link>
                    </div>
                )}
            </nav>
        </>
    );
}
