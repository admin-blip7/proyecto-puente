import Link from 'next/link';
import Image from 'next/image';
import {
    SearchMagnifyingGlass,
    BellNotification,
    Heart01,
    ShoppingCart01,
    ChevronRight,
    Star
} from 'react-coolicons';

import { getProducts } from '@/lib/services/productService';
import ProductCard from '@/components/products/ProductCard';

export default async function LandingPage() {
    const allProducts = await getProducts();
    const products = allProducts
        .filter(p => p.stock > 0)
        .slice(0, 8);

    return (
        <div className="bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark font-body antialiased transition-colors duration-200">
            <nav className="bg-surface-light dark:bg-surface-dark border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex-shrink-0 flex items-center">
                            <span className="font-bold text-2xl tracking-tighter text-primary dark:text-white">22 Electronic Group</span>
                        </div>
                        <div className="flex-1 max-w-2xl mx-8 hidden md:block">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <SearchMagnifyingGlass className="text-gray-400 w-5 h-5" />
                                </div>
                                <input
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-gray-50 dark:bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-accent-blue focus:border-accent-blue sm:text-sm text-gray-900 dark:text-gray-100 transition duration-150 ease-in-out"
                                    placeholder="Search for smartphones, laptops and accessories..."
                                    type="text"
                                />
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link href="/pos">
                                <button className="p-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-accent-blue transition-colors">
                                    Login / POS
                                </button>
                            </Link>
                            <button className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none">
                                <BellNotification className="w-6 h-6" />
                            </button>
                            <button className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none">
                                <Heart01 className="w-6 h-6" />
                            </button>
                            <button className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none relative">
                                <ShoppingCart01 className="w-6 h-6" />
                                <span className="absolute top-1 right-1 block h-4 w-4 rounded-full bg-accent-blue ring-2 ring-white dark:ring-surface-dark text-white text-[10px] font-bold text-center leading-4">2</span>
                            </button>
                        </div>
                    </div>
                </div>
                <div className="md:hidden px-4 pb-3">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchMagnifyingGlass className="text-gray-400 w-5 h-5" />
                        </div>
                        <input
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-gray-50 dark:bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-accent-blue focus:border-accent-blue sm:text-sm text-gray-900 dark:text-gray-100"
                            placeholder="Search..."
                            type="text"
                        />
                    </div>
                </div>
            </nav>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
                <div className="relative bg-surface-light dark:bg-surface-dark rounded-2xl overflow-hidden shadow-sm">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-slate-900 opacity-80"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-8 md:p-12 lg:p-16">
                        <div className="flex-1 space-y-6 text-center md:text-left">
                            <div className="inline-flex items-center space-x-2 bg-white dark:bg-gray-700 rounded-full px-3 py-1 shadow-sm mb-4">
                                <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse"></span>
                                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Pre-order ends in 14h : 22m</span>
                            </div>
                            <div className="flex items-center justify-center md:justify-start space-x-4 opacity-80 mb-2">
                                <span className="font-display font-bold text-xl tracking-tight dark:text-white">SAMSUNG</span>
                                <span className="font-display font-bold text-xl tracking-tight dark:text-white">APPLE</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-primary dark:text-white tracking-tight leading-tight">
                                NEW GALAXY RELEASE<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-indigo-600 dark:from-blue-400 dark:to-indigo-300">EXPERIENCE THE FUTURE</span>
                            </h1>
                            <p className="text-gray-600 dark:text-gray-300 max-w-lg mx-auto md:mx-0 text-lg">
                                Upgrade to the ultimate performance with the latest Snapdragon processors and AI integration.
                            </p>
                            <div className="pt-4">
                                <button className="bg-primary hover:bg-slate-800 text-white font-semibold py-3 px-8 rounded-full shadow-lg transform transition hover:-translate-y-1 inline-flex items-center group">
                                    SHOP PRE-ORDER
                                    <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 mt-8 md:mt-0 flex justify-center relative">
                            <div className="relative w-full max-w-md h-64 md:h-96">
                                <img
                                    alt="Flagship Smartphone"
                                    className="absolute right-0 top-0 w-48 h-64 object-cover rounded-xl shadow-lg z-10 transform translate-x-4 -translate-y-4 md:translate-x-8 md:-translate-y-8 border-4 border-white dark:border-gray-800"
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDqHbqu1HTzLOiBVV1egAXbJCD5tL5uNEzCD9qSiJpIgKvZx8_RtZeZvufe8_d4xKr5zRu1okGU6nZb3unCL05REgd0HdqMa3Q7wSa5Uk5IVl8cJk4LhhD37jT6dDZcjDhD-1x3VXWjZgRRNncibeElDBd2jL883CEwF3J8kpTjoUt0d_knw_tiP0xNnwllbI5i3Vz_MxdbPPDvvFv8ihqb4Gx0CodYzg9uumZ9TCo3sOlUevNHsMjQV2WhG_Sv7FeZQDewxyf1vx0"
                                />
                                <img
                                    alt="Smartwatch"
                                    className="absolute left-0 bottom-0 w-40 h-56 object-cover rounded-xl shadow-lg z-20 transform -translate-x-2 translate-y-2 border-4 border-white dark:border-gray-800"
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAK9he3m5b2-if0jioDutZg8CoHZ-kg-Jj5GVI6vt4EucJFdUXLCZfqPphBU0oTo8qx7SeHGmqFpS9062_0fYZQpU_j3Ifjf8_5nvt5yJ6LVgUO5sR0DD49nIptlRbBBdZHcLzlQAvH0ltVljpioSReHkglnJP6On2ukgwp3zz5IcATUDHakU4JziMDxLvPUkH9cuJ00arRkXv4b137a39XGAHZZeA1v8Vwo_DEHeAWx0H7F4AqNYU9WaGFFEQBKX4gVsRF-zBOGLg"
                                />
                                <img
                                    alt="Wireless Earbuds"
                                    className="absolute left-1/2 top-1/2 w-48 h-48 object-cover rounded-full shadow-2xl z-30 transform -translate-x-1/2 -translate-y-1/2 border-4 border-white dark:border-gray-800"
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBhjhkM6knE8ZEbyv0NH7iTTagrZ-i3TAcY1hYVLG5PWYK-ptLLkd-Y4GBhiXK88qq0-DgvVJjsIHTVCr_H3XqmZhUV5quvhS9u5xrqcopqkve6H-HAb49n3Wy9CGhLc2rWN2boJoFuePTttUqjiaki3Krtn05kxiVmQ7rMmrmnsI1nrsjoPSs91QoBx4-jZxf1qzT-nAdU6lPZRdwta_IlgxmWMEHYcReRsXQlntMXRub4V2Sat59gepIQ9xIoH2vzyg_2Z2pp44U"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Shop by Category</h2>
                        <a className="text-sm font-medium text-accent-blue hover:text-blue-500" href="#">See All</a>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 text-center">
                        <div className="group cursor-pointer">
                            <div className="relative w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden shadow-md ring-2 ring-transparent group-hover:ring-accent-blue dark:group-hover:ring-white transition-all bg-white">
                                <img
                                    alt="Smartphones"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBSaZ5G7hBtiu4SlOGb-5TkC0d9fozxRhm-dvQviQB5BtvPOz8nyb6zy2b-16-EaEgbe7SR7MnAvK0LN6lnqMRKWFqfKVgtlhjCu2hBU6HzBTCqOJstWTMRYeoJ_CXdgkBIu2NHFnyBXnTI7yeK2-Oy2yDzIoi54k7yP60JfYHmGtJZHZfo96ovxRzTh1_Rwwame0KghaazEQTHRTtQGtU0sV-JaT_QiYB1drdgbuZiQ1Mw9dGS7DybIWzf5kxP9pucoshxyWMOt9E"
                                />
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-accent-blue dark:group-hover:text-white">Smartphones</span>
                        </div>
                        <div className="group cursor-pointer">
                            <div className="relative w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden shadow-md ring-2 ring-transparent group-hover:ring-accent-blue dark:group-hover:ring-white transition-all bg-white">
                                <img
                                    alt="Laptops"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBNBjiI5MdebL8q0lvLH_9_muhq6nTa8oV5tYjG1K5lER8rUYbgA56dWxqXFRSG1ha1Uxopf24B_gHXXYzx_90kD6ttBQ5-5rNUbEyIeI995tZpYHS25Y7pW1WkQRK69VS4A4ks68-1sZBTgtd-SFv3999mvA2-JLQt0mUrFLcEBsxu4gBIQ0oese_318WlxR3MhFpD3GYCZdFjs4yFigP_iDP_4q0hA-fjLQ3gjH2xELk2zewQcP6gYdlz1nsP6jAfCIK7GIoyDPk"
                                />
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-accent-blue dark:group-hover:text-white">Laptops</span>
                        </div>
                        <div className="group cursor-pointer">
                            <div className="relative w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden shadow-md ring-2 ring-transparent group-hover:ring-accent-blue dark:group-hover:ring-white transition-all bg-white">
                                <img
                                    alt="Audio"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuChwAQRF8FqcHFO37VSbU6nD62gn_NEh_SHk8G3MNLSKgxDgJy-6xNT9FUApcSi8jp-o49PCy0J3Dh43dc78ffFjzEM6_7aPkzAmRSyHJleigDh9Xq1G_E8j4kH_t9ctUaE5isG31tdg5vStm_BxM46SL3fxlnrnAAdM3TgNlD9FasXUyfvcm4eoDZv3reMtiLUwzR5tuoWCZKPUQ0d8UWpZvujfRWMjcLqsNg5R8wQxrqh7iSWhGZ0VUQMvteWa1YwyaHYroXNaIs"
                                />
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-accent-blue dark:group-hover:text-white">Audio</span>
                        </div>
                        <div className="group cursor-pointer">
                            <div className="relative w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden shadow-md ring-2 ring-transparent group-hover:ring-accent-blue dark:group-hover:ring-white transition-all bg-white">
                                <img
                                    alt="Smartwatches"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCKmKXHedFK26IFGvkUeThpvMtCDtdV2xS9khhb6t2MnFtXRxsb47i9X3MQXKlwj6qE3uQ5QO3Hff3_73kbX5RzffMmbdVj03I1H7Bt9Jwra7-Zop9SGA_VFcxTGQWxuPm5gxjAAYgCqAduOogx1XT2l-P5cCHcxC3Ns577xRPerYT0G0q7ylAUu7NYWonKMh2XBYzsgsiay4QsdD5aZF9ipyCAxHdP0jFe454vWfDxvYrdV2ag462J78G49CmiPKT-hS4Uel-gLg8"
                                />
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-accent-blue dark:group-hover:text-white">Smartwatches</span>
                        </div>
                        <div className="group cursor-pointer">
                            <div className="relative w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden shadow-md ring-2 ring-transparent group-hover:ring-accent-blue dark:group-hover:ring-white transition-all bg-white">
                                <img
                                    alt="Accessories"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBxcn5XU80YO6A6e8lEhvMfZuCScLZd-Cy0DH_dLoset5j1k9ozgJOllPS7TLTCdcQwSEHdInK-nAa6hBiaPTQatNk9MIcfPRcmQvqGTVtnZpeF-zu68yxPyqILQBGpz11l21OhrgRsRdc3G-ojA4RccVQ4mlCwMI-nyW7BNZAkrs9EkD9LRmK-mh9DhrCoHbwBcWm5Hrimo7pI4oqz9-PXAKGlb72wVrPW9Uik3S4RdShadklNcbPZPmEiro0o7eJDVJ1Sf5u_doU"
                                />
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-accent-blue dark:group-hover:text-white">Accessories</span>
                        </div>
                    </div>
                </section>
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Latest Tech & Gadgets</h2>
                        <Link href="/products" className="text-sm font-medium text-accent-blue hover:text-blue-500">See All</Link>
                    </div>
                    {products.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {products.map((product, index) => (
                                <ProductCard key={product.id} product={product} index={index} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-gray-500 dark:text-gray-400">No products available at the moment.</p>
                        </div>
                    )}
                </section>
            </main>
            <footer className="bg-surface-light dark:bg-surface-dark border-t border-gray-200 dark:border-gray-700 mt-12">
                <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
                    <div className="mb-4 md:mb-0">
                        <span className="font-bold text-xl tracking-tighter text-primary dark:text-white">22 Electronic Group</span>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">© 2023 22 Electronic Group. All rights reserved.</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            <a href="mailto:admin@22electronicgroup.com" className="hover:text-accent-blue transition-colors">admin@22electronicgroup.com</a>
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            <a href="tel:7411114200" className="hover:text-accent-blue transition-colors">7411114200</a>
                        </p>
                    </div>
                    <div className="flex space-x-6">
                        <a className="text-gray-400 hover:text-gray-500" href="#">
                            <span className="sr-only">Facebook</span>
                            <svg aria-hidden="true" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                <path clipRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" fillRule="evenodd"></path>
                            </svg>
                        </a>
                        <a className="text-gray-400 hover:text-gray-500" href="#">
                            <span className="sr-only">Instagram</span>
                            <svg aria-hidden="true" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                <path fillRule="evenodd" d="M12.017 2c2.716 0 3.056.012 4.123.06 1.064.049 1.791.218 2.427.465.657.256 1.216.598 1.772 1.154a4.9 4.9 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.122s-.012 3.056-.06 4.122c-.049 1.064-.218 1.791-.465 2.427a4.9 4.9 0 01-1.153 1.772 4.9 4.9 0 01-1.772 1.154c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06s-3.056-.012-4.123-.06c-1.064-.049-1.791-.218-2.427-.465a4.9 4.9 0 01-1.772-1.154 4.9 4.9 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.048-1.066-.06-1.406-.06-4.122s.012-3.055.06-4.122c.049-1.064.218-1.791.465-2.427A4.9 4.9 0 013.695 3.68a4.9 4.9 0 011.772-1.154c.636-.247 1.363-.416 2.427-.465C8.961 2.012 9.301 2 12.017 2zm0 1.802c-2.67 0-2.986.01-4.04.058-.975.045-1.504.207-1.857.344-.466.182-.8.398-1.15.748-.35.35-.566.684-.748 1.15-.137.353-.3.882-.344 1.857-.048 1.054-.058 1.37-.058 4.04 0 2.67.01 2.986.058 4.04.044.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.684.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.04.058 2.67 0 2.987-.01 4.04-.058.976-.044 1.505-.207 1.858-.344.466-.182.8-.399 1.15-.748.35-.35.566-.684.748-1.15.137-.353.3-.882.344-1.857.048-1.054.058-1.37.058-4.04 0-2.67-.01-2.986-.058-4.04-.044-.975-.207-1.504-.344-1.857a3.1 3.1 0 00-.748-1.15 3.1 3.1 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.054-.048-1.37-.058-4.041-.058zm0 3.063a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 8.468a3.333 3.333 0 100-6.666 3.333 3.333 0 000 6.666zm6.538-8.671a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z" clipRule="evenodd" />
                            </svg>
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
