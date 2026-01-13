import Link from 'next/link';
import {
    SearchMagnifyingGlass,
    BellNotification,
    Heart01,
    ShoppingCart01,
    ChevronLeft,
    ChevronRight,
    MoreHorizontal,
} from 'react-coolicons';
import { getProducts } from '@/lib/services/productService';
import ProductCard from '@/components/products/ProductCard';

export default async function CatalogPage(props: { searchParams: Promise<{ q?: string, category?: string, page?: string }> }) {
    const searchParams = await props.searchParams;
    const allProducts = await getProducts();

    const query = searchParams.q?.toLowerCase() || '';
    const category = searchParams.category || '';
    const currentPage = Number(searchParams.page) || 1;
    const itemsPerPage = 8;

    // Filter products
    let filteredProducts = allProducts.filter(p => p.stock > 0);

    if (query) {
        filteredProducts = filteredProducts.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.description?.toLowerCase().includes(query) ||
            p.category?.toLowerCase().includes(query)
        );
    }

    if (category) {
        filteredProducts = filteredProducts.filter(p => p.category === category);
    }

    // Pagination
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

    // Get unique categories for filter
    const categories = Array.from(new Set(allProducts.map(p => p.category).filter(Boolean))) as string[];

    return (
        <div className="bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark font-body antialiased transition-colors duration-200 min-h-screen flex flex-col">
            <nav className="bg-surface-light dark:bg-surface-dark border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/" className="font-bold text-2xl tracking-tighter text-primary dark:text-white">22 Electronic Group</Link>
                        </div>
                        <div className="flex-1 max-w-2xl mx-8 hidden md:block">
                            <form action="/products" method="get" className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <SearchMagnifyingGlass className="text-gray-400 w-5 h-5" />
                                </div>
                                <input
                                    name="q"
                                    defaultValue={query}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-gray-50 dark:bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-accent-blue focus:border-accent-blue sm:text-sm text-gray-900 dark:text-gray-100 transition duration-150 ease-in-out"
                                    placeholder="Search products..."
                                    type="text"
                                />
                            </form>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link href="/pos">
                                <button className="p-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-accent-blue transition-colors">
                                    Login / POS
                                </button>
                            </Link>
                            <button className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none relative">
                                <ShoppingCart01 className="w-6 h-6" />
                                <span className="absolute top-1 right-1 block h-4 w-4 rounded-full bg-accent-blue ring-2 ring-white dark:ring-surface-dark text-white text-[10px] font-bold text-center leading-4">0</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar Filters */}
                    <div className="w-full md:w-64 flex-shrink-0 space-y-8">
                        <div>
                            <div className="flex items-center space-x-2 mb-4">
                                <MoreHorizontal className="w-5 h-5 text-gray-500" />
                                <h3 className="font-bold text-gray-900 dark:text-white">Categories</h3>
                            </div>
                            <div className="space-y-2">
                                <Link
                                    href="/products"
                                    className={`block text-sm ${!category ? 'font-bold text-accent-blue' : 'text-gray-600 dark:text-gray-400 hover:text-accent-blue'}`}
                                >
                                    All Products
                                </Link>
                                {categories.map(cat => (
                                    <Link
                                        key={cat}
                                        href={`/products?category=${encodeURIComponent(cat)}`}
                                        className={`block text-sm ${category === cat ? 'font-bold text-accent-blue' : 'text-gray-600 dark:text-gray-400 hover:text-accent-blue'}`}
                                    >
                                        {cat}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {category || (query ? `Results for "${query}"` : 'All Products')}
                            </h1>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                Showing {paginatedProducts.length} of {filteredProducts.length} products
                            </span>
                        </div>

                        {paginatedProducts.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {paginatedProducts.map((product, index) => (
                                    <ProductCard key={product.id} product={product} index={index} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                <p className="text-gray-500 dark:text-gray-400 text-lg">No products found matching your criteria.</p>
                                <Link href="/products" className="mt-4 inline-block text-accent-blue hover:underline">Clear filters</Link>
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-12 flex justify-center items-center space-x-4">
                                {currentPage > 1 ? (
                                    <Link
                                        href={`/products?page=${currentPage - 1}${query ? `&q=${query}` : ''}${category ? `&category=${category}` : ''}`}
                                        className="p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </Link>
                                ) : (
                                    <button disabled className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed">
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                )}

                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Page {currentPage} of {totalPages}
                                </span>

                                {currentPage < totalPages ? (
                                    <Link
                                        href={`/products?page=${currentPage + 1}${query ? `&q=${query}` : ''}${category ? `&category=${category}` : ''}`}
                                        className="p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </Link>
                                ) : (
                                    <button disabled className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed">
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <footer className="bg-surface-light dark:bg-surface-dark border-t border-gray-200 dark:border-gray-700 mt-auto">
                <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
                    <div className="mb-4 md:mb-0">
                        <span className="font-bold text-xl tracking-tighter text-primary dark:text-white">22 Electronic Group</span>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">© 2023 22 Electronic Group. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
