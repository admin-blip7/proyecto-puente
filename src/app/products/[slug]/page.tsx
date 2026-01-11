

import Link from 'next/link';
import Image from 'next/image';
import {
    SearchMagnifyingGlass,
    Heart01,
    ShoppingBag01,
    User01,
    ChevronLeft,
    ChevronRight,
    Star,
    Camera,
    Data,
    Cylinder,
    Mobile,
    ArrowLeftRight,
    CarAuto,
    ShieldCheck,
    ArrowsReload01
} from 'react-coolicons';
import { getProductById } from '@/lib/services/productService';
import { notFound } from 'next/navigation';
import ProductGallery from '@/components/products/ProductGallery';

export default async function ProductDetailPage(props: { params: Promise<{ slug: string }> }) {
    const params = await props.params;
    const { slug } = params;
    const product = await getProductById(slug);

    if (!product) {
        notFound();
    }

    return (
        <div className="bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100 font-body antialiased min-h-screen flex flex-col">
            <nav className="sticky top-0 z-50 bg-surface-light dark:bg-surface-dark border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <Link href="/" className="text-2xl font-bold tracking-tight">22 Electronic <span className="text-gray-500 dark:text-gray-400">Group</span></Link>
                            </div>
                            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                                <a className="border-transparent text-gray-500 dark:text-gray-300 hover:border-gray-300 hover:text-gray-700 dark:hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium" href="#">New Arrivals</a>
                                <a className="border-primary dark:border-white text-gray-900 dark:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium" href="#">Smartphones</a>
                                <a className="border-transparent text-gray-500 dark:text-gray-300 hover:border-gray-300 hover:text-gray-700 dark:hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium" href="#">Laptops</a>
                                <a className="border-transparent text-gray-500 dark:text-gray-300 hover:border-gray-300 hover:text-gray-700 dark:hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium" href="#">Accessories</a>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="hidden lg:flex relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <SearchMagnifyingGlass className="text-gray-400 text-xl w-5 h-5" />
                                </div>
                                <input className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-gray-50 dark:bg-gray-700 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm" placeholder="Search devices" type="text" />
                            </div>
                            <button className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                                <Heart01 className="w-6 h-6" />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 relative">
                                <ShoppingBag01 className="w-6 h-6" />
                                <span className="absolute top-1 right-1 h-4 w-4 bg-accent-red text-white text-[10px] font-bold flex items-center justify-center rounded-full">2</span>
                            </button>
                            <Link href="/pos">
                                <button className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                                    <User01 className="w-6 h-6" />
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <nav className="flex text-sm font-medium text-gray-500 dark:text-gray-400">
                    <Link href="/" className="hover:text-gray-900 dark:hover:text-white">Home</Link>
                    <span className="mx-2">/</span>
                    <a className="hover:text-gray-900 dark:hover:text-white" href="#">Products</a>
                    <span className="mx-2">/</span>
                    <span className="text-gray-900 dark:text-white">{product.name}</span>
                </nav>
            </div>
            <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 lg:items-start">
                    {/* Gallery Component */}
                    <ProductGallery images={product.imageUrls || []} productName={product.name} />

                    <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-sm font-medium text-primary dark:text-blue-400 mb-1">{product.category || 'Product'}</h2>
                                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{product.name}</h1>
                            </div>
                            <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                                <Heart01 className="text-2xl text-gray-400 hover:text-red-500 transition w-6 h-6" />
                            </button>
                        </div>
                        <div className="mt-3 flex items-center">
                            <div className="flex items-center text-yellow-400">
                                <Star className="text-sm fill-current w-4 h-4" />
                                <Star className="text-sm fill-current w-4 h-4" />
                                <Star className="text-sm fill-current w-4 h-4" />
                                <Star className="text-sm fill-current w-4 h-4" />
                                <Star className="text-sm fill-current w-4 h-4" />
                            </div>
                            <p className="ml-2 text-sm text-gray-500 dark:text-gray-400">5.0 (New)</p>
                        </div>
                        <div className="mt-4 flex items-end">
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">${product.price}</p>
                            {/* <p className="ml-3 text-lg text-gray-400 line-through">$999.00</p> */}
                        </div>

                        <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-8">
                            {/* Description */}
                            <div className="mt-4">
                                <h3 className="sr-only">Description</h3>
                                <div className="text-base text-gray-600 dark:text-gray-300 space-y-4">
                                    <p>{product.description || 'No description available for this product.'}</p>
                                </div>
                            </div>

                            {/* Technical Specs / Attributes */}
                            <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Technical Specifications</h3>
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    {product.sku && (
                                        <div className="grid grid-cols-2 p-3 border-b border-gray-200 dark:border-gray-700">
                                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center"><Data className="mr-2 text-base w-5 h-5" /> SKU</div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-white text-right">{product.sku}</div>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 p-3 border-b border-gray-200 dark:border-gray-700">
                                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center"><Cylinder className="mr-2 text-base w-5 h-5" /> Stock</div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white text-right">{product.stock > 0 ? 'In Stock' : 'Out of Stock'}</div>
                                    </div>
                                    {/* Map attributes if any */}
                                    {product.attributes && Object.entries(product.attributes).slice(0, 4).map(([key, value]) => (
                                        <div key={key} className="grid grid-cols-2 p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-transparent">
                                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center capitalize">{key}</div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-white text-right">{String(value)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-10 flex flex-col gap-3">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button className="flex-1 flex items-center justify-center px-8 py-3 border border-primary dark:border-blue-500 text-base font-medium rounded-md text-primary dark:text-blue-400 bg-transparent hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors" type="button">
                                        <ShoppingBag01 className="mr-2 w-5 h-5" />
                                        ADD TO CART
                                    </button>
                                    <button className="flex-1 flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors shadow-lg shadow-blue-200 dark:shadow-none" type="button">
                                        BUY NOW
                                    </button>
                                </div>
                            </div>
                            <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6 grid grid-cols-2 gap-4 text-sm text-gray-500 dark:text-gray-400">
                                <div className="flex items-center">
                                    <CarAuto className="mr-2 text-gray-400 w-5 h-5" />
                                    Free Next-Day Delivery
                                </div>
                                <div className="flex items-center">
                                    <ShieldCheck className="mr-2 text-gray-400 w-5 h-5" />
                                    2 Year Warranty
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-16 border-t border-gray-200 dark:border-gray-700 pt-16">
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Related Accessories</h2>
                    <div className="mt-6 grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
                        {/* Related Products Items */}
                        <div className="group relative">
                            <div className="aspect-[1/1] w-full overflow-hidden rounded-md bg-gray-200 dark:bg-gray-800 lg:aspect-none lg:h-80 relative">
                                <img alt="Related Product" className="h-full w-full object-cover object-center lg:h-full lg:w-full group-hover:opacity-75" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCyxVujrjTtICSceU-AwUd9AGQLvR26jGyCwuFvYcyjmI7xVjjd11PrM8idwfTCvSuB6NyEGbp5xauVm0xJVpqBfEmUP8dp4cvWOsSXeo_MeoMFUeKM-uS0qRTiSA5ssEbwOnZDV_Q6wzXnkpLIia6nM1DnjVhcYTX3Lo9APP9plHDQIrqHB_fXeW1gocL0ROMlJZ2lfgyFcmyVY48fXEb2bV0FZULRCOA1LdPqKS4mxsvsDpH2CmdcZJfytm9Ik38JunOIAO2tjgc" />
                                <button className="absolute top-2 right-2 p-1.5 bg-white/90 dark:bg-black/60 rounded-full text-gray-600 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Heart01 className="text-sm w-4 h-4" />
                                </button>
                            </div>
                            <div className="mt-4 flex justify-between">
                                <div>
                                    <h3 className="text-sm text-gray-700 dark:text-gray-200">
                                        <a href="#">
                                            <span aria-hidden="true" className="absolute inset-0"></span>
                                            Apex Buds Pro
                                        </a>
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Wireless Audio</p>
                                </div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">$149.00</p>
                            </div>
                        </div>
                        <div className="group relative">
                            <div className="aspect-[1/1] w-full overflow-hidden rounded-md bg-gray-200 dark:bg-gray-800 lg:aspect-none lg:h-80 relative">
                                <img alt="Related Product" className="h-full w-full object-cover object-center lg:h-full lg:w-full group-hover:opacity-75" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-08ntKkIf2yxwjzyc2C_ttkTnz2CiHq-s4FWKWIbH4cKR2DGNkdhZGa0Yc9m3J27slw2aoWnXdYvna7C7iFDJBizXNdv-3YymBSTshPcwPrgmLOkbMTZU464RbZYQnBnNO53zQnY1hT_BtB6gDnyRkl97vc6D4QT7Ov90mdeVvIVtEfxPAQ1JPiQzPC9WtLzQt0vMBdL2CwoFLsu5V3g7E8sKdWZvEAfTajdX5E6BkPvrqipIT6WlebaTyOmWLlc8iNuhAhromM4" />
                                <button className="absolute top-2 right-2 p-1.5 bg-white/90 dark:bg-black/60 rounded-full text-gray-600 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Heart01 className="text-sm w-4 h-4" />
                                </button>
                            </div>
                            <div className="mt-4 flex justify-between">
                                <div>
                                    <h3 className="text-sm text-gray-700 dark:text-gray-200">
                                        <a href="#">
                                            <span aria-hidden="true" className="absolute inset-0"></span>
                                            Fast Charger 45W
                                        </a>
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Power</p>
                                </div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">$39.99</p>
                            </div>
                        </div>
                        <div className="group relative">
                            <div className="aspect-[1/1] w-full overflow-hidden rounded-md bg-gray-200 dark:bg-gray-800 lg:aspect-none lg:h-80 relative">
                                <img alt="Related Product" className="h-full w-full object-cover object-center lg:h-full lg:w-full group-hover:opacity-75" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDURUwehd3Raw92U5m-Nf8nSXrpZPe03egHpythVBh18xOxz_yOWdITeayk2O8cnNYXCXN5D4T2u_bgxrKuJSIwfcF4fsfvtKwW5OPQh6JbRt97pBoxfhBERKqsjxU2_LVyLaXpl4pzOfiu2bD6g6VuKIpDfMIoiV49txZ6rPOZ_NYHOYrgi-V3T_jl63QAsUAVFDqjK-TAt4XlTohLxaTjRMNEAXEVe-uM0937R3otxYcYNA-3nDV6-thgQqMQ54REiVYH9FNTNRE" />
                                <button className="absolute top-2 right-2 p-1.5 bg-white/90 dark:bg-black/60 rounded-full text-gray-600 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Heart01 className="text-sm w-4 h-4" />
                                </button>
                            </div>
                            <div className="mt-4 flex justify-between">
                                <div>
                                    <h3 className="text-sm text-gray-700 dark:text-gray-200">
                                        <a href="#">
                                            <span aria-hidden="true" className="absolute inset-0"></span>
                                            Titan Protective Case
                                        </a>
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Protection</p>
                                </div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">$29.99</p>
                            </div>
                        </div>
                        <div className="group relative">
                            <div className="aspect-[1/1] w-full overflow-hidden rounded-md bg-gray-200 dark:bg-gray-800 lg:aspect-none lg:h-80 relative">
                                <img alt="Related Product" className="h-full w-full object-cover object-center lg:h-full lg:w-full group-hover:opacity-75" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAJmlKv5zBB5YsxrQ7oHDMqlkGeudOsKdOudnkmj92P-XsPJlBOUcJgKzqVwHals-C4QnOUN-V1iNb4gj3LOBDqUqb1T-VMp8M2JZCvqhs3kAwAgeUkj4qjq83SCHkeHFMyIYDYN739iAZrSyTFTecFuSc0MBAt2UlPnRmSKCKAri8ZUqJuZLO-v4EsL4sfEA_dNs1Av-nVr-jp7ni9vwQUcfnSR8bSJ_dLkid2zsOonii-xEPYSopddFZt5UEsXOxvyctS7Ub4UXs" />
                                <button className="absolute top-2 right-2 p-1.5 bg-white/90 dark:bg-black/60 rounded-full text-gray-600 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Heart01 className="text-sm w-4 h-4" />
                                </button>
                            </div>
                            <div className="mt-4 flex justify-between">
                                <div>
                                    <h3 className="text-sm text-gray-700 dark:text-gray-200">
                                        <a href="#">
                                            <span aria-hidden="true" className="absolute inset-0"></span>
                                            Apex Watch 5
                                        </a>
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Wearables</p>
                                </div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">$299.00</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <footer className="bg-surface-light dark:bg-surface-dark border-t border-gray-200 dark:border-gray-700 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="mb-4 md:mb-0">
                            <span className="font-bold text-xl tracking-tighter text-primary dark:text-white">22 Electronic Group</span>
                            <p className="text-sm text-gray-500 dark:text-gray-400">© 2023 22 Electronic Group. All rights reserved.</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                <a href="mailto:admin@22electronicgroup.com" className="hover:text-accent-blue transition-colors">admin@22electronicgroup.com</a>
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                <a href="tel:7411114200" className="hover:text-accent-blue transition-colors">7411114200</a>
                            </p>
                        </div>
                        <div className="flex space-x-6">
                            <a className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300" href="#">
                                <span className="sr-only">Instagram</span>
                                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path clipRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 014.121 3.3c.636-.247 1.363-.416 2.427-.465C7.573 2.013 7.926 2 10.375 2h1.94zm0 1.838h-1.94c-2.33 0-2.668.01-3.708.058-.957.044-1.478.204-1.823.339-.455.176-.78.384-1.123.726-.342.343-.55.668-.727 1.123-.135.345-.294.866-.339 1.823-.047 1.04-.058 1.378-.058 3.708v1.94c0 2.33.01 2.668.058 3.708.044.957.204 1.478.339 1.823.176.455.384.78.726 1.123.343.342.668.55 1.123.727.345.135.866.294 1.823.339 1.04.047 1.378.058 3.708.058h1.94c2.33 0 2.668-.01 3.708-.058.957-.044 1.478-.204 1.823-.339.455-.176.78-.384 1.123-.726.342-.343.55-.668.727-1.123.135-.345.294-.866.339-1.823.047-1.04.058-1.378.058-3.708v-1.94c0-2.33-.01-2.668-.058-3.708-.044-.957-.204-1.478-.339-1.823-.176-.455-.384-.78-.726-1.123-.343-.342-.668-.55-1.123-.727-.345-.135-.866-.294-1.823-.339-1.04-.047-1.378-.058-3.708-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.838a3.297 3.297 0 100 6.594 3.297 3.297 0 000-6.594zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" fillRule="evenodd"></path></svg>
                            </a>
                            <a className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300" href="#">
                                <span className="sr-only">Facebook</span>
                                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path clipRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" fillRule="evenodd"></path></svg>
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
