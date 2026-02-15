"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Star, TrendingUp, Zap, ShieldCheck, Smartphone, Battery, Headphones } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white selection:bg-brand-blue selection:text-slate-900 transition-colors duration-300">

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden px-4 md:px-8">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-blue/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="md:w-1/2 space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-primary">New Arrivals</span>
              </div>

              <h1 className="text-6xl md:text-8xl font-bold tracking-tighter leading-[0.9]">
                Refurbished <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-slate-400 font-black">
                  Premium Tech
                </span>
              </h1>

              <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed">
                Experience the latest in mobile technology. From flagship smartphones to premium accessories, we have everything to keep you connected.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link href="/products" className="group relative px-8 py-4 bg-slate-900 dark:bg-primary text-white dark:text-slate-900 font-bold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95">
                  <span className="relative z-10 flex items-center gap-2">
                    Shop Devices <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                </Link>
                <Link href="/products?category=accessories" className="px-8 py-4 bg-transparent border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  View Accessories
                </Link>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <div className="flex -space-x-3">
                  <img src="https://i.pravatar.cc/100?img=1" alt="User" className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900" />
                  <img src="https://i.pravatar.cc/100?img=2" alt="User" className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900" />
                  <img src="https://i.pravatar.cc/100?img=3" alt="User" className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900" />
                  <div className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                    +5k
                  </div>
                </div>
                <div className="text-sm">
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">Trusted By 5,000+ Tech Lovers</p>
                </div>
              </div>
            </div>

            <div className="md:w-1/2 relative h-[500px] w-full">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-brand-blue/20 to-primary/20 rounded-full blur-3xl animate-pulse-slow"></div>
              <div className="relative z-10 w-full h-full bg-slate-200 dark:bg-slate-800 rounded-3xl overflow-hidden shadow-2xl rotate-3 transition-transform hover:rotate-0 duration-500 border border-white/20 dark:border-slate-700/50 group">
                <Image
                  src="https://images.unsplash.com/photo-1512424263321-df62885994f0?q=80&w=1740&auto=format&fit=crop"
                  alt="Gamer playing on phone"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />

                <div className="absolute bottom-6 left-6 right-6 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                  <h3 className="font-bold text-lg">iPhone 15 Pro Max</h3>
                  <p className="text-sm opacity-90">Titanium design. A17 Pro chip.</p>
                  <div className="mt-2 flex justify-between items-center">
                    <span className="font-bold text-primary">From $1199</span>
                    <button className="p-2 bg-white text-black rounded-full hover:bg-primary transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-12 -right-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl animate-bounce duration-[3000ms]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Best Seller</p>
                    <p className="font-bold text-slate-900 dark:text-white">iPhone 15 Cases</p>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-8 -left-8 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl animate-bounce delay-700 duration-[4000ms]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-blue/20 rounded-full text-brand-blue">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">New Stock</p>
                    <p className="font-bold text-slate-900 dark:text-white">Fast Chargers</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ticker */}
      <div className="bg-primary text-secondary py-3 overflow-hidden whitespace-nowrap border-y border-black">
        <div className="inline-flex items-center gap-12 animate-marquee font-bold uppercase tracking-widest text-lg md:text-xl">
          <span>LATEST IPHONE MODELS</span>
          <span>•</span>
          <span>PREMIUM AUDIO</span>
          <span>•</span>
          <span>FAST CHARGING ACCESSORIES</span>
          <span>•</span>
          <span>LATEST IPHONE MODELS</span>
          <span>•</span>
          <span>PREMIUM AUDIO</span>
          <span>•</span>
          <span>FAST CHARGING ACCESSORIES</span>
          <span>•</span>
          <span>LATEST IPHONE MODELS</span>
          <span>•</span>
          <span>PREMIUM AUDIO</span>
          <span>•</span>
          <span>FAST CHARGING ACCESSORIES</span>
        </div>
      </div>

      {/* Bento Grid */}
      <section className="py-24 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="mb-12 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Ecosystem Essentials</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">Explore our wide range of products to enhance your digital life.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4 h-auto md:h-[600px]">
          {/* Large Item - Smartphones */}
          <div className="md:col-span-2 md:row-span-2 relative rounded-3xl overflow-hidden group">
            <Image
              src="https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=1740&auto=format&fit=crop"
              alt="Friends using smartphones"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-8 flex flex-col justify-end">
              <span className="text-primary font-bold text-sm uppercase tracking-wider mb-2">Flagship Devices</span>
              <h3 className="text-3xl font-bold text-white mb-4">Latest Smartphones</h3>
              <Link href="/products?category=smartphones" className="inline-flex items-center gap-2 text-white font-semibold hover:text-primary transition-colors">
                View All Models <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Medium Item 1 - Audio */}
          <div className="md:col-span-2 relative rounded-3xl overflow-hidden group">
            <Image
              src="https://images.unsplash.com/photo-1593121925328-369cc8459c08?q=80&w=1740&auto=format&fit=crop"
              alt="Person using headphones"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors p-8 flex flex-col justify-center items-start">
              <h3 className="text-2xl font-bold text-white mb-2">Premium Audio</h3>
              <p className="text-white/80 mb-4 text-sm">Headphones & Earbuds.</p>
              <button className="px-4 py-2 bg-white text-black rounded-full text-sm font-bold hover:bg-primary transition-colors">Shop Audio</button>
            </div>
          </div>

          {/* Small Item 1 - Protection */}
          <div className="relative rounded-3xl overflow-hidden group bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <div className="p-6 text-center z-10">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-secondary">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-lg mb-1">Protection</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Cases & Screen Guards</p>
            </div>
            <div className="absolute inset-0 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl m-2 pointer-events-none"></div>
          </div>

          {/* Small Item 2 - Charging */}
          <div className="relative rounded-3xl overflow-hidden group">
            <Image
              src="https://images.unsplash.com/photo-1600985834898-d890633b497b?q=80&w=1740&auto=format&fit=crop"
              alt="Charging on the go"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/30 flex items-end p-4">
              <h3 className="text-xl font-bold text-white">Power</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-slate-100 dark:bg-slate-900 py-24 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Customer Reviews</h2>
              <p className="text-slate-600 dark:text-slate-400">See what our community says about their new tech.</p>
            </div>
            <div className="flex gap-2">
              <button className="p-3 rounded-full border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>
              <button className="p-3 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity">
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Sarah M.", text: "The iPhone 15 Pro Max is a beast! Shipping was fast and the phone arrived in perfect condition." },
              { name: "James L.", text: "Best place to buy accessories. Their cases are durable and look amazing." },
              { name: "Emily R.", text: "Love my new AirPods. Great price and excellent customer service." }
            ].map((review, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                <div className="flex gap-1 text-primary mb-4">
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                </div>
                <p className="text-slate-700 dark:text-slate-300 italic mb-6">
                  "{review.text}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full bg-cover" style={{ backgroundImage: `url(https://i.pravatar.cc/100?img=${i + 15})` }}></div>
                  <div>
                    <p className="font-bold text-sm">{review.name}</p>
                    <p className="text-xs text-slate-500">Verified Buyer</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Last Chance Bar */}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-40 max-w-sm w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 animate-slide-up">
        <div>
          <p className="font-bold text-sm">Last Chance!</p>
          <p className="text-xs opacity-80">Flash Sale Ends In 02:45:10</p>
        </div>
        <Link href="/products" className="px-4 py-2 bg-primary text-secondary rounded-lg text-xs font-bold hover:brightness-110 transition-all">
          Shop Now
        </Link>
        <button className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:scale-110 transition-transform">
          <span className="sr-only">Close</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
      </div>

    </div>
  );
}
