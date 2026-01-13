import Link from 'next/link';
import { Search, ArrowRight, MapPin, ShoppingCart, User, Grid, ChevronDown, Flame, Gem } from 'lucide-react';
import Image from 'next/image';

export default function Header() {
    return (
        <header className="sticky top-0 z-50 bg-surface-light dark:bg-surface-dark border-b border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-300">
            <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-between gap-6">
                    <Link href="/" className="text-2xl font-bold tracking-tight text-primary dark:text-white flex items-center">
                        emox<span className="text-secondary text-4xl leading-none -mt-2">.</span>
                    </Link>

                    <div className="flex-1 max-w-2xl hidden md:block relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <Search className="w-5 h-5" />
                        </span>
                        <input
                            className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-full py-2.5 pl-10 pr-12 focus:ring-2 focus:ring-secondary text-sm dark:text-white placeholder-gray-500"
                            placeholder="Search for any product or brand"
                            type="text"
                        />
                        <button className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-primary text-white rounded-full hover:bg-opacity-90 transition">
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <div className="hidden lg:flex items-center gap-1 cursor-pointer hover:text-primary dark:hover:text-white">
                            <MapPin className="w-5 h-5 text-gray-500" />
                            <div className="flex flex-col leading-tight">
                                <span className="text-xs text-muted-light dark:text-muted-dark">Delivering to</span>
                                <span className="font-bold">Dubai</span>
                            </div>
                        </div>

                        <div className="hidden sm:flex items-center gap-1 border-l border-gray-300 dark:border-gray-600 pl-4">
                            <img
                                alt="UAE Flag"
                                className="w-5 h-3 object-cover rounded-sm"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCXiUfMutUCSGPDalxLE8K_qKX84juRFMFuKFYUBWcIZSlou95OToOnw_MPRD0QKpRoa1l9DbTVwhcrifbtLH0fi0Z6xKPkzJZYBL0MBD788XLbK4h3E3hZOmG2eDwBqmqegP1wklqpiD5cN3zE03vA0f4GjLxrDI6mYqNYksdnf6oh4D80BZtoIRCfZdo6EKo_bMFCGJbRekQ_mGiDQcF7iiP6g1yU9dbBTkAHoiNVgMtFqvRv-tVNtLJLyCSf293BsPJ-vCiN74c"
                            />
                            <span>AE</span>
                            <ChevronDown className="w-4 h-4" />
                        </div>

                        <Link href="/cart" className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition">
                            <ShoppingCart className="w-6 h-6" />
                            <span className="absolute top-0 right-0 w-4 h-4 bg-secondary text-white text-[10px] flex items-center justify-center rounded-full">
                                2
                            </span>
                        </Link>

                        <Link href="/login" className="flex items-center gap-1 hover:text-primary dark:hover:text-white">
                            <User className="w-6 h-6" />
                            <span className="hidden sm:inline">Sign In</span>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 mt-2">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between overflow-x-auto hide-scroll py-2.5 gap-6 text-sm whitespace-nowrap">
                        <button className="flex items-center gap-2 font-semibold text-primary dark:text-white px-2">
                            <Grid className="w-5 h-5" />
                            All Categories
                            <ChevronDown className="w-4 h-4" />
                        </button>

                        <nav className="flex items-center gap-6 text-gray-600 dark:text-gray-300 font-medium">
                            <Link href="#" className="hover:text-secondary transition">Electronics</Link>
                            <Link href="#" className="hover:text-secondary transition">Fashion</Link>
                            <Link href="#" className="hover:text-secondary transition">Home & Kitchen</Link>
                            <Link href="#" className="hover:text-secondary transition">Beauty</Link>
                            <Link href="#" className="hover:text-secondary transition">Grocery</Link>
                            <Link href="#" className="text-accent hover:text-red-600 transition flex items-center gap-1">
                                <Flame className="w-4 h-4" />
                                Hot Deals
                            </Link>
                        </nav>

                        <div className="hidden lg:flex items-center gap-4 ml-auto text-xs font-semibold uppercase tracking-wide">
                            <Link href="#" className="text-secondary flex items-center gap-1">
                                <Gem className="w-4 h-4" />
                                Best Deals
                            </Link>
                            <Link href="#" className="text-primary dark:text-white flex items-center gap-1">
                                emox<span className="bg-red-100 text-red-600 px-1 rounded text-[10px]">LIVE</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
