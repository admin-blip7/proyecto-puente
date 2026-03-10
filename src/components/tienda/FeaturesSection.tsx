'use client'

import { motion } from 'framer-motion'
import { Truck, ShieldCheck, Headphones, RotateCcw, CreditCard, Package, Sparkles } from 'lucide-react'
import { TIENDA_SUPPORT_WHATSAPP_URL } from '@/lib/tiendaContact'

const features = [
  {
    icon: Truck,
    title: 'Envío a todo México',
    description: 'Recibe tus productos en la puerta de tu casa, sin importar dónde estés. Envío gratis solo en pedidos mayores a $15,000.',
    color: 'from-blue-500/20 to-blue-600/10',
    iconColor: 'text-blue-500',
  },
  {
    icon: ShieldCheck,
    title: 'Garantía de 12 meses',
    description: 'Todos nuestros productos cuentan con garantía completa por defectos de fábrica. Tu compra está protegida.',
    color: 'from-green-500/20 to-green-600/10',
    iconColor: 'text-green-500',
  },
  {
    icon: RotateCcw,
    title: 'Devoluciones gratis',
    description: '30 días para devolver tu compra si no estás 100% satisfecho. Sin preguntas, sin complicaciones.',
    color: 'from-orange-500/20 to-orange-600/10',
    iconColor: 'text-orange-500',
  },
  {
    icon: Headphones,
    title: 'Soporte técnico',
    description: 'Nuestro equipo de expertos está listo para ayudarte con cualquier duda o problema que tengas.',
    color: 'from-purple-500/20 to-purple-600/10',
    iconColor: 'text-purple-500',
  },
  {
    icon: CreditCard,
    title: 'Pago seguro',
    description: 'Todas tus transacciones están protegidas con encriptación de nivel bancario. Compra con confianza.',
    color: 'from-pink-500/20 to-pink-600/10',
    iconColor: 'text-pink-500',
  },
  {
    icon: Package,
    title: 'Productos verificados',
    description: 'Cada artículo pasa por un riguroso proceso de verificación de calidad antes de ser enviado.',
    color: 'from-cyan-500/20 to-cyan-600/10',
    iconColor: 'text-cyan-500',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
}

export function FeaturesSection() {
  return (
    <section className="py-12 lg:py-16 bg-secondary/30 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative">
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 lg:mb-12"
        >
          <motion.div 
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-bold uppercase tracking-wider mb-6"
          >
            <Sparkles className="h-3 w-3" />
            Por qué elegirnos
          </motion.div>
          
          <h2 className="font-editors-note text-4xl lg:text-5xl xl:text-6xl font-thin mb-6">
            La Mejor Experiencia
            <span className="block text-accent">de Compra</span>
          </h2>
          
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Nos comprometemos a ofrecerte no solo los mejores productos, sino también un servicio excepcional en cada paso.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              className="group relative bg-background rounded-3xl p-8 border border-border/50 hover:border-accent/30 transition-all duration-300 hover:shadow-xl hover:shadow-accent/5 overflow-hidden"
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              {/* Content */}
              <div className="relative">
                {/* Icon */}
                <motion.div 
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                  whileHover={{ rotate: 5 }}
                >
                  <feature.icon className={`h-8 w-8 ${feature.iconColor}`} />
                </motion.div>

                {/* Text */}
                <h3 className="font-editors-note text-xl font-medium mb-3 group-hover:text-accent transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>

                {/* Decorative Number */}
                <span className="absolute -top-2 -right-2 text-7xl font-bold text-foreground/5 group-hover:text-accent/10 transition-colors">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>

              {/* Hover Border Effect */}
              <div className="absolute inset-0 rounded-3xl border-2 border-transparent group-hover:border-accent/20 transition-colors duration-300 pointer-events-none" />
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-10 lg:mt-12 text-center"
        >
          <p className="text-muted-foreground mb-6">
            ¿Tienes alguna pregunta sobre nuestros servicios?
          </p>
          <a 
            href={TIENDA_SUPPORT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-black rounded-full font-bold text-sm uppercase tracking-wider hover:brightness-105 transition-all shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/30"
          >
            Contactar soporte por WhatsApp
          </a>
        </motion.div>
      </div>
    </section>
  )
}
