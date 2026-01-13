import Link from 'next/link';
import { Store, Truck, CreditCard, Headset, ChevronDown, Facebook, Camera, Apple, Hexagon } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="bg-gray-100 dark:bg-surface-dark pt-12 pb-6 border-t border-gray-200 dark:border-gray-700 mt-12">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-white dark:bg-gray-800 rounded-lg text-primary dark:text-white">
                            <Store className="w-6 h-6" />
                        </div>
                        <div>
                            <h5 className="font-bold text-sm mb-1">Free in-store pick up</h5>
                            <p className="text-xs text-gray-500">24/7 Amazing services</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-white dark:bg-gray-800 rounded-lg text-primary dark:text-white">
                            <Truck className="w-6 h-6" />
                        </div>
                        <div>
                            <h5 className="font-bold text-sm mb-1">Free Shipping</h5>
                            <p className="text-xs text-gray-500">24/7 Amazing services</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-white dark:bg-gray-800 rounded-lg text-primary dark:text-white">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <div>
                            <h5 className="font-bold text-sm mb-1">Flexible Payment</h5>
                            <p className="text-xs text-gray-500">24/7 Amazing services</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-white dark:bg-gray-800 rounded-lg text-primary dark:text-white">
                            <Headset className="w-6 h-6" />
                        </div>
                        <div>
                            <h5 className="font-bold text-sm mb-1">Convenient help</h5>
                            <p className="text-xs text-gray-500">24/7 Amazing services</p>
                        </div>
                    </div>
                </div>
                <hr className="border-gray-200 dark:border-gray-700 mb-8" />
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-8 text-sm">
                    <div>
                        <h5 className="font-bold text-primary dark:text-white mb-4">About Emox</h5>
                        <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                            <li><Link className="hover:text-secondary" href="#">Company Info</Link></li>
                            <li><Link className="hover:text-secondary" href="#">News</Link></li>
                            <li><Link className="hover:text-secondary" href="#">Investors</Link></li>
                            <li><Link className="hover:text-secondary" href="#">Careers</Link></li>
                            <li><Link className="hover:text-secondary" href="#">Policies</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h5 className="font-bold text-primary dark:text-white mb-4">Order & Purchases</h5>
                        <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                            <li><Link className="hover:text-secondary" href="#">Check Order Status</Link></li>
                            <li><Link className="hover:text-secondary" href="#">Shipping & Delivery</Link></li>
                            <li><Link className="hover:text-secondary" href="#">Returns & Exchanges</Link></li>
                            <li><Link className="hover:text-secondary" href="#">Price Match Guarantee</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h5 className="font-bold text-primary dark:text-white mb-4">Popular Categories</h5>
                        <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                            <li><Link className="hover:text-secondary" href="#">Smartphones</Link></li>
                            <li><Link className="hover:text-secondary" href="#">Laptops</Link></li>
                            <li><Link className="hover:text-secondary" href="#">Video Games</Link></li>
                            <li><Link className="hover:text-secondary" href="#">Televisions</Link></li>
                            <li><Link className="hover:text-secondary" href="#">Cameras</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h5 className="font-bold text-primary dark:text-white mb-4">Support & Services</h5>
                        <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                            <li><Link className="hover:text-secondary" href="#">Seller Center</Link></li>
                            <li><Link className="hover:text-secondary" href="#">Contact Us</Link></li>
                            <li><Link className="hover:text-secondary" href="#">Help Center</Link></li>
                            <li><Link className="hover:text-secondary" href="#">Warranty Policy</Link></li>
                        </ul>
                    </div>
                    <div className="col-span-2 lg:col-span-1">
                        <h5 className="font-bold text-primary dark:text-white mb-4">Region Country</h5>
                        <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-md p-2 w-max mb-6">
                            <img
                                alt="UAE Flag"
                                className="w-5 h-3 object-cover rounded-sm"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB4w9y5D4Eke7Y4dLcsS30MYKy17rYx3-DtkXfl839Jl1uuaqzZjCB-1Sg4vxO2IKZfgqQ-XBeKB05eSHaPP02pvE_ZIqS4fA-2wIdrDTC3ED4FaVuDEfExhoQbZuBzqmeJcNuQosztPlmA8e7k9LM8vYPbn1E2Kqstq4SPsVbLpPla3m6rnhbuMZ7R6yol5ozZ0t_La4NnkmDXpfMTpQfeEsh7rm3DomR3cFwEXmLKOedE1YjiCfSE_Y_76femiFD12BBIel37Mjk"
                            />
                            <span className="text-xs font-semibold">United Arab Emirates</span>
                            <ChevronDown className="w-4 h-4" />
                        </div>
                        <h5 className="font-bold text-primary dark:text-white mb-2">Stay Connected</h5>
                        <div className="flex gap-3 text-gray-500">
                            <Link className="hover:text-secondary" href="#"><Facebook className="w-5 h-5" /></Link>
                            <Link className="hover:text-secondary" href="#"><Hexagon className="w-5 h-5" /></Link>
                            <Link className="hover:text-secondary" href="#"><Camera className="w-5 h-5" /></Link>
                        </div>
                    </div>
                </div>
                <hr className="border-gray-200 dark:border-gray-700 mb-6" />
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
                    <div className="flex flex-col gap-2">
                        <p className="font-semibold text-gray-700 dark:text-gray-300">Download Our App</p>
                        <div className="flex gap-2">
                            <button className="bg-black text-white px-3 py-1 rounded flex items-center gap-1 hover:opacity-80">
                                <Apple className="w-4 h-4" />
                                <div className="flex flex-col leading-none items-start">
                                    <span className="text-[8px]">Download on the</span>
                                    <span className="font-bold">App Store</span>
                                </div>
                            </button>
                            <button className="bg-black text-white px-3 py-1 rounded flex items-center gap-1 hover:opacity-80">
                                <div className="flex flex-col leading-none items-start">
                                    <span className="text-[8px]">GET IT ON</span>
                                    <span className="font-bold">Google Play</span>
                                </div>
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col items-center md:items-start gap-1">
                        <p className="font-semibold text-gray-700 dark:text-gray-300">Payment Method</p>
                        <div className="flex gap-2 opacity-70 grayscale hover:grayscale-0 transition">
                            <div className="w-8 h-5 bg-blue-600 rounded"></div>
                            <div className="w-8 h-5 bg-red-600 rounded"></div>
                            <div className="w-8 h-5 bg-blue-400 rounded"></div>
                            <div className="w-8 h-5 bg-black rounded"></div>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <Link className="hover:underline" href="#">Privacy Policy</Link>
                        <Link className="hover:underline" href="#">Terms of Use</Link>
                        <Link className="hover:underline" href="#">Warranty Policy</Link>
                    </div>
                    <p>© Emox All Rights Reserved.</p>
                </div>
            </div>
        </footer>
    );
}
