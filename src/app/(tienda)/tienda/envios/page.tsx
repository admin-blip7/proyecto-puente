import { Truck, Package, Clock, Check, Shield, Crown, MapPin, Box } from 'lucide-react'
import {
  TIENDA_FREE_SHIPPING_THRESHOLD,
  TIENDA_SOCIO_PACKAGE_QTY,
} from '@/lib/tiendaPricing'

export const metadata = {
  title: 'Politica de Envios - 22 Electronic',
  description: 'Informacion sobre envios y entregas en toda la Republica Mexicana',
}

export default function EnviosPage() {
  return (
    <main>
      <div className="container mx-auto px-4 lg:px-8 py-8 max-w-4xl">
        <span className="text-accent text-xs font-mono font-bold block mb-4">/// ENVIOS</span>
        <h1 className="font-editors-note text-4xl lg:text-5xl font-thin mb-8">
          Politica de Envios
        </h1>

        <div className="space-y-10">
          <section className="bg-accent/10 border border-accent/20 rounded-2xl p-6 lg:p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Envio al Dia Siguiente</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Realizamos envios al dia siguiente de tu compra en toda la Republica Mexicana. 
                  Los pedidos realizados antes de las 2:00 PM se procesan el mismo dia.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
              <MapPin className="h-6 w-6 text-accent" />
              Cobertura Nacional
            </h2>
            <div className="bg-secondary/30 rounded-xl p-6">
              <p className="text-muted-foreground mb-4">
                Enviamos a <span className="font-bold text-primary">toda la Republica Mexicana</span>, incluyendo:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {['Ciudad de Mexico', 'Jalisco', 'Nuevo Leon', 'Estado de Mexico', 'Puebla', 'Guanajuato', 'Chihuahua', 'Veracruz', 'Baja California', 'Yucatan', 'Queretaro', 'Sonora'].map((estado) => (
                  <div key={estado} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>{estado}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Y todos los demas estados de la Republica Mexicana.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
              <Truck className="h-6 w-6 text-accent" />
              Metodos de Envio
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-secondary/30 rounded-xl p-6 border border-border hover:border-accent transition-colors">
                <h3 className="font-semibold mb-2">Envio Estandar</h3>
                <p className="text-2xl font-bold text-accent mb-2">1-3 dias habiles</p>
                <p className="text-sm text-muted-foreground">$150 MXN</p>
                <p className="text-xs text-muted-foreground mt-3 bg-base p-2 rounded">
                  GRATIS solo en pedidos que superen ${TIENDA_FREE_SHIPPING_THRESHOLD.toLocaleString('es-MX')} MXN
                </p>
              </div>
              <div className="bg-accent/10 rounded-xl p-6 border border-accent/30 hover:border-accent transition-colors">
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent">Recomendado</span>
                <h3 className="font-semibold mb-2">Envio Express</h3>
                <p className="text-2xl font-bold text-accent mb-2">Al dia siguiente</p>
                <p className="text-sm text-muted-foreground">$250 MXN</p>
                <p className="text-xs text-muted-foreground mt-3 bg-base p-2 rounded">
                  GRATIS solo en pedidos que superen ${TIENDA_FREE_SHIPPING_THRESHOLD.toLocaleString('es-MX')} MXN
                </p>
              </div>
            </div>
          </section>

          <section className="bg-gradient-to-br from-[#FFD600]/10 to-[#FFD600]/5 border border-[#FFD600]/20 rounded-2xl p-6 lg:p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-3">Seguro de Mercancia</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Protege tu pedido contra perdidas, danos o robos durante el transporte. 
                  El seguro es <span className="font-bold text-primary">opcional</span> y tiene un costo adicional.
                </p>
                <div className="bg-base rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Costo del seguro:</span>
                    <span className="font-bold text-accent">3% del valor del pedido</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>* Cubre perdida total o parcial del envio</p>
                    <p>* Cubre danos durante el transporte</p>
                    <p>* Reembolso completo en caso de siniestro</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4 italic">
                  Para asegurar tu mercancia, selecciona la opcion de seguro al momento de realizar tu compra.
                </p>
              </div>
            </div>
          </section>

          <section className="border border-border rounded-2xl p-6 lg:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-[#FFD600] rounded-lg flex items-center justify-center flex-shrink-0">
                <Crown className="h-6 w-6 text-black" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent">Programa Mayorista</span>
                <h2 className="text-2xl font-semibold">Socio 22+</h2>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Si compras multiples piezas regularmente, unite a nuestro programa <span className="font-bold">Socio 22+</span> 
              y accede a precios especiales exclusivos para mayoristas.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-secondary/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Box className="h-5 w-5 text-accent" />
                  <span className="font-semibold text-sm">Paquete exacto de {TIENDA_SOCIO_PACKAGE_QTY}</span>
                </div>
                <p className="text-2xl font-bold text-accent">Precio Socio</p>
                <p className="text-xs text-muted-foreground">Solo aplica cuando la cantidad por producto es exactamente {TIENDA_SOCIO_PACKAGE_QTY}</p>
              </div>
              <div className="bg-accent/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-5 w-5 text-accent" />
                  <span className="font-semibold text-sm">Precio mayoreo</span>
                </div>
                <p className="text-2xl font-bold text-accent">Calculado por categoria</p>
                <p className="text-xs text-muted-foreground">
                  El precio socio de tienda se determina automaticamente por categoria y se aplica solo en paquetes exactos.
                </p>
              </div>
            </div>

            <div className="bg-base rounded-lg p-4">
              <h4 className="font-semibold mb-2">Beneficios del Socio 22+</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Precios especiales en todas las categorias</span>
                </li>
                <li className="flex gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Envio gratis solo en pedidos que superen ${TIENDA_FREE_SHIPPING_THRESHOLD.toLocaleString('es-MX')} MXN</span>
                </li>
                <li className="flex gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Atencion prioritaria y linea directa</span>
                </li>
                <li className="flex gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Acceso anticipado a nuevos productos</span>
                </li>
              </ul>
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              Para unirte al programa <span className="font-bold">Socio 22+</span>, contactanos por WhatsApp o envia un correo a{' '}
              <a href="mailto:mayoristas@22electronic.com" className="text-accent hover:underline">
                mayoristas@22electronic.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
              <Package className="h-6 w-6 text-accent" />
              Consideraciones Importantes
            </h2>
            <ul className="space-y-3 text-sm text-muted-foreground bg-secondary/30 rounded-xl p-6">
              <li className="flex gap-2">
                <Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                <span>Los tiempos de envio comienzan a contar desde la confirmacion del pago.</span>
              </li>
              <li className="flex gap-2">
                <Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                <span>Recibiras un numero de guia para rastrear tu paquete en todo momento.</span>
              </li>
              <li className="flex gap-2">
                <Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                <span>Las zonas remotas pueden tener tiempos de entrega adicionales (1-2 dias extra).</span>
              </li>
              <li className="flex gap-2">
                <Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                <span>El seguro de mercancia debe contratarse al momento de la compra.</span>
              </li>
              <li className="flex gap-2">
                <Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                <span>Verifica que tu direccion este completa y correcta para evitar retrasos.</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  )
}
