'use client'

import Link from 'next/link'
import { ArrowRight, ShoppingBag, Truck, Shield, Headphones, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface HeroBannerProps {
  heroTitle?: string
  heroSubtitle?: string
}

export function HeroBanner({ heroTitle, heroSubtitle }: HeroBannerProps) {
  const title = heroTitle || 'Tecnologia Premium'
  const subtitle = heroSubtitle || 'Descubre nuestra seleccion curada de los mejores dispositivos electronicos con garantia de calidad.'

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut" as const
      }
    }
  }

  const floatingVariants = {
    initial: { y: 0 },
    animate: {
      y: [-10, 10, -10],
      transition: {
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    }
  }

  return (
    <section className="relative min-h-[85vh] lg:min-h-[90vh] flex items-center overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/30" />
      
      {/* Animated Background Orbs */}
      <motion.div 
        className="absolute top-20 right-[10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div 
        className="absolute bottom-20 left-[5%] w-[400px] h-[400px] bg-accent/5 rounded-full blur-[80px]"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />

      <div className="container mx-auto px-4 lg:px-8 py-12 lg:py-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Text Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold uppercase tracking-wider">
                <Sparkles className="h-3 w-3" />
                Nueva Colección 2025
              </span>
            </motion.div>

            <motion.h1 
              variants={itemVariants}
              className="font-editors-note text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-thin leading-[0.9] mb-8"
            >
              <span className="block">Tecnologia</span>
              <span className="block italic text-muted-foreground">Premium</span>
              <span className="block text-accent">Sin Limites.</span>
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="text-lg text-muted-foreground mb-10 max-w-lg leading-relaxed text-balance"
            >
              {subtitle}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
              <Button 
                size="lg" 
                className="h-14 px-8 bg-accent text-black hover:bg-accent/90 rounded-full text-sm font-bold uppercase tracking-wider shadow-xl shadow-accent/20 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-accent/30" 
                asChild
              >
                <Link href="/tienda/categorias" className="flex items-center gap-2">
                  Explorar Productos
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="h-14 px-8 rounded-full text-sm font-bold uppercase tracking-wider border-2 hover:bg-primary hover:text-background transition-all" 
                asChild
              >
                <Link href="/tienda/ofertas">Ver Ofertas</Link>
              </Button>
            </motion.div>

            {/* Trust Badges */}
            <motion.div 
              variants={itemVariants}
              className="flex flex-wrap items-center gap-6 mt-12 pt-8 border-t border-border/50"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div 
                      key={i} 
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/30 to-primary/30 border-2 border-background flex items-center justify-center text-xs font-bold"
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <span>+10,000 clientes</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} className="w-4 h-4 text-accent fill-accent" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span>4.9/5 rating</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Visual Element */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="relative hidden lg:flex items-center justify-center"
          >
            {/* Main Product Circle */}
            <motion.div 
              className="relative w-[450px] h-[450px] xl:w-[520px] xl:h-[520px]"
              variants={floatingVariants}
              initial="initial"
              animate="animate"
            >
              {/* Outer Ring */}
              <div className="absolute inset-0 rounded-full border border-border/30" />
              <div className="absolute inset-4 rounded-full border border-border/20" />
              <div className="absolute inset-8 rounded-full border border-border/10" />
              
              {/* Main Circle */}
              <div className="absolute inset-12 rounded-full bg-gradient-to-br from-secondary via-background to-secondary flex items-center justify-center border border-border/50 shadow-2xl">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-[160px] xl:text-[200px] drop-shadow-2xl"
                >
                  🎧
                </motion.div>
              </div>

              {/* Decorative Dots */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
                <motion.div
                  key={deg}
                  className="absolute w-2 h-2 rounded-full bg-accent"
                  style={{
                    top: `${50 + 48 * Math.sin((deg * Math.PI) / 180)}%`,
                    left: `${50 + 48 * Math.cos((deg * Math.PI) / 180)}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.25
                  }}
                />
              ))}
            </motion.div>

            {/* Floating Cards */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="absolute -top-4 -right-4 xl:right-0"
            >
              <motion.div 
                className="bg-background/80 backdrop-blur-xl rounded-2xl p-5 border border-border shadow-xl"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20">
                    <ShoppingBag className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Envíos</p>
                    <p className="text-sm font-bold">A todo México</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="absolute -bottom-4 -left-4 xl:left-0"
            >
              <motion.div 
                className="bg-background/80 backdrop-blur-xl rounded-2xl p-5 border border-border shadow-xl"
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/20">
                    <Shield className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Garantía</p>
                    <p className="text-sm font-bold">12 meses</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1 }}
              className="absolute bottom-20 -right-8 xl:right-4"
            >
              <motion.div 
                className="bg-accent text-black rounded-2xl p-4 shadow-xl"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <p className="text-xs font-bold uppercase tracking-wider">Descuento</p>
                <p className="text-2xl font-bold">20% OFF</p>
                <p className="text-xs opacity-70">En tu primera compra</p>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {/* Features Bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 lg:mt-16 pt-8 border-t border-border/50"
        >
          {[
            { icon: Truck, title: 'Envío Gratis', desc: 'En pedidos +$15,000', color: 'bg-blue-500/20 text-blue-500' },
            { icon: Shield, title: 'Garantía', desc: '12 meses cubiertos', color: 'bg-green-500/20 text-green-500' },
            { icon: Headphones, title: 'Soporte', desc: 'Atención personalizada', color: 'bg-purple-500/20 text-purple-500' },
            { icon: ShoppingBag, title: 'Pago Seguro', desc: '100% protegido', color: 'bg-accent/20 text-accent' },
          ].map((feature, index) => (
            <motion.div 
              key={index}
              className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/30 border border-border/50 hover:border-accent/50 hover:bg-secondary/50 transition-all group"
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${feature.color} transition-transform group-hover:scale-110`}>
                <feature.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold">{feature.title}</p>
                <p className="text-xs text-muted-foreground">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
