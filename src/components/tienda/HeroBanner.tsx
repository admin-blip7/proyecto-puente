'use client'

import Link from 'next/link'
import { ArrowRight, ShoppingBag, Truck, Shield, Headphones } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface HeroBannerProps {
  heroTitle?: string
  heroSubtitle?: string
}

export function HeroBanner({ heroTitle, heroSubtitle }: HeroBannerProps) {
  const title = heroTitle || 'Tecnologia premium para tu dia a dia'
  const subtitle = heroSubtitle || 'Descubre nuestra seleccion premium de electronica.'

  return (
    <section className="relative min-h-[70vh] lg:min-h-[80vh] flex items-center overflow-hidden bg-transparent">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[560px] h-[560px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[420px] h-[420px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 py-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="tienda-section-label block mb-6">
              /// BIENVENIDO A 22 ELECTRONIC
            </span>
            <h1 className="font-editors-note text-5xl lg:text-7xl xl:text-8xl font-thin leading-[0.95] mb-8">
              {title}
            </h1>
            <p className="text-lg text-muted-foreground mb-10 max-w-lg leading-relaxed">
              {subtitle}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="tienda-cta h-12 px-8" asChild>
                <Link href="/tienda/categorias" className="flex items-center gap-2">
                  Explorar Productos
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="tienda-cta-outline h-12 px-8" asChild>
                <Link href="/tienda/ofertas">Ver Ofertas</Link>
              </Button>
            </div>
          </motion.div>

          {/* Visual Element */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative hidden lg:flex items-center justify-center"
          >
            <div className="relative tienda-panel rounded-[2rem] p-8">
              {/* Main Product Visual */}
              <div className="w-80 h-80 xl:w-96 xl:h-96 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center border border-border/70">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-[180px] xl:text-[220px]"
                >
                  🎧
                </motion.div>
              </div>

              {/* Floating Badges */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-4 -right-4 tienda-panel rounded-2xl p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/25">
                    <ShoppingBag className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Envíos</p>
                    <p className="text-sm font-bold">A todo México</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -bottom-4 -left-4 tienda-panel rounded-2xl p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20">
                    <Shield className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Garantía</p>
                    <p className="text-sm font-bold">12 meses</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Features Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 pt-12 border-t border-border"
        >
          <div className="tienda-panel rounded-xl p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
              <Truck className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-bold">Envío Gratis</p>
              <p className="text-xs text-muted-foreground">En compras +$2,500</p>
            </div>
          </div>

          <div className="tienda-panel rounded-xl p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
              <Shield className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-bold">Garantía</p>
              <p className="text-xs text-muted-foreground">12 meses cubiertos</p>
            </div>
          </div>

          <div className="tienda-panel rounded-xl p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
              <Headphones className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-bold">Soporte</p>
              <p className="text-xs text-muted-foreground">Atención personalizada</p>
            </div>
          </div>

          <div className="tienda-panel rounded-xl p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
              <ShoppingBag className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-bold">Pago Seguro</p>
              <p className="text-xs text-muted-foreground">100% protegido</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
