"use client";

import {
    LayoutGrid,
    Smartphone,
    Laptop,
    Headphones,
    Watch,
    SlidersHorizontal,
    Plus,
    Check,
    Search,
    User,
    Home,
    FileText,
    Briefcase,
    PenTool,
    TrendingUp,
    ShoppingCart,
    Bookmark,
    ShoppingBag,
    Users,
    Mail,
    Mic,
    MessageCircle,
    Twitter
} from "lucide-react";
import { useState } from "react";
import { Dancing_Script } from 'next/font/google';
import { useTheme } from "next-themes";

const dancingScript = Dancing_Script({ subsets: ['latin'] });

interface CatalogSidebarProps {
    productsCount: number;
    totalProducts: number;
}

export default function CatalogSidebar({ productsCount, totalProducts }: CatalogSidebarProps) {
    const [priceRange, setPriceRange] = useState([100, 1500]);
    const [activeCategory, setActiveCategory] = useState("All Devices");
    const { setTheme, theme } = useTheme();

    const categories = [
        { name: "All Devices", icon: LayoutGrid, shortcut: "1" },
        { name: "Smartphones", icon: Smartphone, shortcut: "2" },
        { name: "Laptops", icon: Laptop, shortcut: "3" },
        { name: "Audio", icon: Headphones, shortcut: "4" },
        { name: "Accessories", icon: Watch, shortcut: "5" },
    ];

    const brands = ["Apple", "Samsung", "Xiaomi", "Google", "Sony"];

    return (
        <aside className="w-full lg:w-64 flex-shrink-0 hidden lg:flex flex-col sticky top-[80px] h-[calc(100vh-80px)] bg-[#F9FAFB] dark:bg-slate-900 overflow-y-auto hide-scrollbar transition-colors duration-300">
            {/* Signature Header */}
            <div className="px-6 py-8">
                <h1 className={`${dancingScript.className} text-3xl text-gray-900 dark:text-white`}>
                    22 Electronic
                </h1>
            </div>

            {/* Categories Navigation */}
            <nav className="px-4 space-y-1 mb-8">
                {categories.map((cat) => (
                    <button
                        key={cat.name}
                        onClick={() => setActiveCategory(cat.name)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all group ${activeCategory === cat.name
                                ? "bg-white dark:bg-slate-800 shadow-sm text-gray-900 dark:text-white font-medium"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800/50"
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <cat.icon className={`w-4 h-4 ${activeCategory === cat.name ? "text-gray-900 dark:text-white" : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"}`} />
                            <span>{cat.name}</span>
                        </div>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${activeCategory === cat.name ? "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300" : "bg-gray-100 dark:bg-slate-800 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            }`}>
                            {cat.shortcut}
                        </span>
                    </button>
                ))}
            </nav>

            {/* Resources Section (Filters) */}
            <div className="px-6 mb-8">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                    Price Range
                </h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                        <span>${priceRange[0]}</span>
                        <span>${priceRange[1]}</span>
                    </div>
                    <input
                        type="range"
                        min="100"
                        max="1500"
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                        className="w-full h-1 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-white"
                    />
                </div>
            </div>

            <div className="px-6 mb-8">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center justify-between group">
                    Brands
                    <span className="bg-gray-100 dark:bg-slate-800 text-gray-400 text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {brands.length}
                    </span>
                </h3>
                <div className="space-y-3">
                    {brands.map((brand, index) => (
                        <label key={brand} className="flex items-center gap-3 group cursor-pointer">
                            <div className="relative flex items-center justify-center w-4 h-4 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 group-hover:border-gray-400 transition-colors">
                                <input type="checkbox" className="peer appearance-none w-full h-full absolute inset-0 cursor-pointer" />
                                <Check className="w-3 h-3 text-gray-900 dark:text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                {brand}
                            </span>
                            <span className="ml-auto text-[10px] text-gray-400 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                {String.fromCharCode(97 + index)}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Stay in Touch (Socials) */}
            <div className="px-6 mb-auto">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                    Stay in touch
                </h3>
                <div className="space-y-1">
                    <button className="w-full flex items-center justify-between py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group">
                        <div className="flex items-center gap-3">
                            <MessageCircle className="w-4 h-4" />
                            <span>Contact</span>
                        </div>
                        <span className="bg-gray-100 dark:bg-slate-800 text-gray-400 text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">/</span>
                    </button>
                    <button className="w-full flex items-center justify-between py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group">
                        <div className="flex items-center gap-3">
                            <Twitter className="w-4 h-4" />
                            <span>Twitter</span>
                        </div>
                        <span className="bg-gray-100 dark:bg-slate-800 text-gray-400 text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                    </button>
                </div>
            </div>

            {/* Theme Toggle Footer */}
            <div className="p-4 mt-8 border-t border-transparent sticky bottom-0 bg-[#F9FAFB] dark:bg-slate-900">
                <div className="bg-gray-200/50 dark:bg-slate-800 p-1 rounded-full flex items-center">
                    <button
                        onClick={() => setTheme("light")}
                        className={`flex-1 text-xs font-medium py-1.5 rounded-full transition-all ${theme === 'light' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                    >
                        Light
                    </button>
                    <button
                        onClick={() => setTheme("dark")}
                        className={`flex-1 text-xs font-medium py-1.5 rounded-full transition-all ${theme === 'dark' ? 'bg-slate-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                    >
                        Dark
                    </button>
                    <button
                        onClick={() => setTheme("system")}
                        className={`flex-1 text-xs font-medium py-1.5 rounded-full transition-all ${theme === 'system' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                    >
                        Auto
                    </button>
                </div>
            </div>
        </aside>
    );
}
