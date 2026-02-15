'use client'

import { Truck, ShieldCheck, Headphones, RotateCcw, CreditCard, Package } from 'lucide-react'

const features = [
  {
    icon: Truck,
    title: 'Envío a todo México',
    description: 'Recibe tus productos en la puerta de tu casa, sin importar dónde estés.',
  },
  {
    icon: ShieldCheck,
    title: 'Garantía de 12 meses',
    description: 'Todos nuestros productos cuentan con garantía por defectos de fábrica.',
  },
  {
    icon: RotateCcw,
    title: 'Devoluciones gratis',
    description: '30 días para devolver tu dinero si no estás satisfecho.',
  },
  {
    icon: Headphones,
    title: 'Soporte técnico',
    description: 'Nuestro equipo está listo para ayudarte con cualquier duda.',
  },
  {
    icon: CreditCard,
    title: 'Pago seguro',
    description: 'Transacciones protegidas con encriptación de banco.',
  },
  {
    icon: Package,
    title: 'Productos verificados',
    description: 'Cada artículo pasa por un riguroso proceso de verificación.',
  },
]

export function FeaturesSection() {
  return (
    <section className="py-16 lg:py-24 bg-secondary/40 border-t border-border">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-12">
          <span className="tienda-section-label block mb-2">
            /// POR QUÉ ELEGIRNOS
          </span>
          <h2 className="font-editors-note text-3xl lg:text-4xl font-thin">
            La Mejor Experiencia de Compra
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex gap-4 p-6 rounded-xl tienda-panel hover:border-accent transition-colors group"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-white transition-colors border border-border/70">
                <feature.icon className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
