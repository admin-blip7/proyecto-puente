import { Shield, Lock, CreditCard, Building2, Check, Clock, AlertCircle, Smartphone } from 'lucide-react'
import { TIENDA_SUPPORT_WHATSAPP_URL } from '@/lib/tiendaContact'

export const metadata = {
  title: 'Pagos Seguros - 22 Electronic',
  description: 'Metodos de pago seguros: PayPal, Stripe y OXXO. Paga con tarjeta de credito, debito o en efectivo.',
}

export default function PagosPage() {
  return (
    <main>
      <div className="container mx-auto px-4 lg:px-8 py-8 max-w-5xl">
        <span className="text-accent text-xs font-mono font-bold block mb-4">/// PAGOS SEGUROS</span>
        <h1 className="font-editors-note text-4xl lg:text-5xl font-thin mb-4">
          Metodos de Pago
        </h1>
        <p className="text-muted-foreground mb-10 max-w-2xl">
          En 22 Electronic ofrecemos multiples opciones de pago para tu comodidad y seguridad. 
          Todas las transacciones estan protegidas con encriptacion de ultima generacion.
        </p>

        <div className="bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/20 rounded-2xl p-6 lg:p-8 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                Compras 100% Seguras
                <span className="text-[10px] font-bold uppercase tracking-widest bg-green-500 text-white px-2 py-1 rounded">Garantizado</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Todos los pagos son procesados a traves de conexiones SSL cifradas. 
                Nunca almacenamos los datos completos de tu tarjeta en nuestros servidores.
              </p>
            </div>
          </div>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-accent" />
            Metodos de Pago Disponibles
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-secondary/30 rounded-2xl p-6 border border-border hover:border-[#635BFF] transition-all hover:shadow-lg hover:shadow-[#635BFF]/10 group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-16 h-10 bg-[#635BFF] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">Stripe</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#635BFF] bg-[#635BFF]/10 px-2 py-1 rounded">Recomendado</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Tarjeta de Credito/Debito</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Paga con Visa, Mastercard, American Express o cualquier tarjeta de debito bancaria.
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Pago instantaneo</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Proteccion contra fraudes</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Cifrado de extremo a extremo</span>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t border-border">
                <div className="w-10 h-6 bg-[#1A1F71] rounded flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold">VISA</span>
                </div>
                <div className="w-10 h-6 bg-[#EB001B] rounded flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold">MC</span>
                </div>
                <div className="w-10 h-6 bg-[#006FCF] rounded flex items-center justify-center">
                  <span className="text-white text-[6px] font-bold">AMEX</span>
                </div>
              </div>
            </div>

            <div className="bg-secondary/30 rounded-2xl p-6 border border-border hover:border-[#003087] transition-all hover:shadow-lg hover:shadow-[#003087]/10 group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-16 h-10 bg-[#003087] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">Pay<span className="text-[#009CDE]">Pal</span></span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 bg-blue-500/10 px-2 py-1 rounded">Popular</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">PayPal</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Paga de forma segura sin compartir tus datos financieros con el vendedor.
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Pago con saldo PayPal</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Proteccion al comprador</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Devoluciones faciles</span>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-4 border-t border-border">
                <div className="w-6 h-6 bg-[#003087] rounded-full flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">P</span>
                </div>
                <span className="text-xs text-muted-foreground">Mas de 400 millones de usuarios</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#E31837]/10 to-[#E31837]/5 rounded-2xl p-6 border border-[#E31837]/30 hover:border-[#E31837] transition-all hover:shadow-lg hover:shadow-[#E31837]/10 group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-16 h-10 bg-[#E31837] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">OXXO</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#E31837] bg-[#E31837]/10 px-2 py-1 rounded">Efectivo</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Pago en OXXO</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Genera un codigo de barras y paga en efectivo en cualquier tienda OXXO del pais.
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Sin tarjeta bancaria</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>+18,000 tiendas en Mexico</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Confirmacion en 24-48 hrs</span>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-4 border-t border-[#E31837]/30">
                <Clock className="h-4 w-4 text-[#E31837]" />
                <span className="text-xs text-muted-foreground">Valido por 3 dias</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
            <Building2 className="h-6 w-6 text-accent" />
            Como Funciona el Pago en OXXO
          </h2>
          
          <div className="bg-secondary/30 rounded-2xl p-6 lg:p-8 border border-border">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-accent font-bold text-lg">1</span>
                </div>
                <h4 className="font-semibold mb-2">Selecciona OXXO</h4>
                <p className="text-sm text-muted-foreground">
                  Elige OXXO como metodo de pago al finalizar tu compra.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-accent font-bold text-lg">2</span>
                </div>
                <h4 className="font-semibold mb-2">Genera tu Codigo</h4>
                <p className="text-sm text-muted-foreground">
                  Recibiras un codigo de barras unico por correo electronico.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-accent font-bold text-lg">3</span>
                </div>
                <h4 className="font-semibold mb-2">Paga en Tienda</h4>
                <p className="text-sm text-muted-foreground">
                  Acude a cualquier OXXO y presenta tu codigo de barras.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-accent font-bold text-lg">4</span>
                </div>
                <h4 className="font-semibold mb-2">Pedido Confirmado</h4>
                <p className="text-sm text-muted-foreground">
                  En 24-48 hrs confirmamos tu pago y enviamos tu pedido.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
            <Lock className="h-6 w-6 text-accent" />
            Seguridad Garantizada
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-secondary/30 rounded-xl p-6 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Shield className="h-5 w-5 text-green-500" />
                </div>
                <h3 className="font-semibold">Cifrado SSL</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Toda la informacion de tu pago viaja encriptada con tecnologia SSL de 256 bits, 
                el mismo estandar que usan los bancos.
              </p>
            </div>
            
            <div className="bg-secondary/30 rounded-xl p-6 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-blue-500" />
                </div>
                <h3 className="font-semibold">Datos Protegidos</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Nunca almacenamos los datos completos de tu tarjeta. Toda la informacion sensible 
                es manejada directamente por Stripe y PayPal.
              </p>
            </div>
            
            <div className="bg-secondary/30 rounded-xl p-6 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-purple-500" />
                </div>
                <h3 className="font-semibold">Deteccion de Fraude</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Sistemas de inteligencia artificial monitorean cada transaccion 24/7 para 
                detectar y prevenir actividades sospechosas.
              </p>
            </div>
            
            <div className="bg-secondary/30 rounded-xl p-6 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                  <Check className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-semibold">Reembolso Garantizado</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Si hay algun problema con tu pedido, procesamos tu reembolso de inmediato. 
                Tienes hasta 30 dias para solicitarlo.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-accent/10 border border-accent/20 rounded-2xl p-6 lg:p-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="w-16 h-16 bg-accent rounded-xl flex items-center justify-center flex-shrink-0">
              <Smartphone className="h-8 w-8 text-black" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Preguntas sobre pagos?</h3>
              <p className="text-muted-foreground mb-4">
                Si tienes dudas sobre los metodos de pago o necesitas ayuda con tu compra, 
                nuestro equipo de soporte esta disponible para asistirte.
              </p>
              <div className="flex flex-wrap gap-4">
                <a 
                  href={TIENDA_SUPPORT_WHATSAPP_URL}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-green-600 transition-colors"
                >
                  WhatsApp
                </a>
                <a 
                  href="mailto:pagos@22electronic.com" 
                  className="inline-flex items-center gap-2 border border-border px-6 py-3 rounded-full text-sm font-bold uppercase tracking-widest hover:border-accent hover:text-accent transition-colors"
                >
                  Correo Electronico
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
