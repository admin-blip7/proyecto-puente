import { FileText, Check, AlertTriangle, Scale, Clock, Ban, RefreshCw } from 'lucide-react'

export const metadata = {
  title: 'Terminos y Condiciones - 22 Electronic',
  description: 'Terminos y condiciones de uso de la tienda online 22 Electronic.',
}

export default function TerminosPage() {
  return (
    <main>
      <div className="container mx-auto px-4 lg:px-8 py-8 max-w-4xl">
        <span className="text-accent text-xs font-mono font-bold block mb-4">/// LEGAL</span>
        <h1 className="font-editors-note text-4xl lg:text-5xl font-thin mb-4">
          Terminos y Condiciones
        </h1>
        <p className="text-muted-foreground mb-10">
          Ultima actualizacion: Febrero 2026
        </p>

        <div className="space-y-10">
          <section className="bg-secondary/30 rounded-2xl p-6 lg:p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-3">Aceptacion de Terminos</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Al acceder y utilizar el sitio web y servicios de 22 Electronic, aceptas estar sujeto 
                  a estos terminos y condiciones. Si no estas de acuerdo con alguna parte de estos terminos, 
                  no debes utilizar nuestros servicios.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
              <Scale className="h-6 w-6 text-accent" />
              Condiciones de Compra
            </h2>
            <div className="space-y-4">
              <div className="bg-secondary/30 rounded-xl p-5">
                <h3 className="font-semibold mb-3">Elegibilidad</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Debes tener al menos 18 anos de edad para realizar compras.</span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>La informacion proporcionada debe ser veraz y actualizada.</span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Eres responsable de mantener la confidencialidad de tu cuenta.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-secondary/30 rounded-xl p-5">
                <h3 className="font-semibold mb-3">Precios y Pagos</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full mt-1.5 flex-shrink-0" />
                    <span>Los precios se muestran en pesos mexicanos (MXN) e incluyen IVA.</span>
                  </li>
                  <li className="flex gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full mt-1.5 flex-shrink-0" />
                    <span>Nos reservamos el derecho de modificar precios sin previo aviso.</span>
                  </li>
                  <li className="flex gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full mt-1.5 flex-shrink-0" />
                    <span>El pago debe realizarse al momento de confirmar el pedido.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-secondary/30 rounded-xl p-5">
                <h3 className="font-semibold mb-3">Confirmacion de Pedido</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full mt-1.5 flex-shrink-0" />
                    <span>Recibiras un correo de confirmacion con los detalles de tu compra.</span>
                  </li>
                  <li className="flex gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full mt-1.5 flex-shrink-0" />
                    <span>Nos reservamos el derecho de cancelar pedidos por falta de inventario.</span>
                  </li>
                  <li className="flex gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full mt-1.5 flex-shrink-0" />
                    <span>En caso de cancelacion, se emitira un reembolso completo.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
              <RefreshCw className="h-6 w-6 text-accent" />
              Politica de Devoluciones
            </h2>
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
              <p className="text-muted-foreground mb-4">
                Nuestra politica de devoluciones establece los siguientes terminos:
              </p>
              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <Clock className="h-5 w-5 text-accent flex-shrink-0" />
                  <div>
                    <p className="font-medium">Plazo de 1 mes</p>
                    <p className="text-sm text-muted-foreground">Tienes 30 dias naturales desde la entrega para solicitar una devolucion.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-500">Deduccion del 20%</p>
                    <p className="text-sm text-muted-foreground">Se aplica una deduccion del 20% del valor del producto por gastos operativos.</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Para mas detalles, consulta nuestra <a href="/tienda/devoluciones" className="text-accent hover:underline">politica completa de devoluciones</a>.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
              <Ban className="h-6 w-6 text-accent" />
              Uso Prohibido
            </h2>
            <div className="bg-secondary/30 rounded-2xl p-6">
              <p className="text-muted-foreground mb-4">Esta prohibido:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span>Utilizar el sitio para fines ilegales</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span>Reproducir contenido sin autorizacion</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span>Intentar acceder a sistemas restringidos</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span>Interferir con el funcionamiento del sitio</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span>Realizar compras fraudulentas</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span>Proporcionar informacion falsa</span>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-6">Propiedad Intelectual</h2>
            <div className="bg-secondary/30 rounded-2xl p-6">
              <p className="text-muted-foreground leading-relaxed">
                Todo el contenido del sitio web, incluyendo pero no limitado a textos, graficos, logotipos, 
                imagenes, iconos y software, es propiedad de 22 Electronic o de sus proveedores de contenido 
                y esta protegido por leyes de propiedad intelectual.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                El uso no autorizado de cualquier material puede violar leyes de derechos de autor, 
                marcas registradas u otras leyes aplicables.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-6">Limitacion de Responsabilidad</h2>
            <div className="bg-secondary/30 rounded-2xl p-6">
              <p className="text-muted-foreground leading-relaxed">
                22 Electronic no sera responsable por danos directos, indirectos, incidentales, 
                consecuentes o punitivos que resulten del uso o imposibilidad de uso de nuestros 
                servicios, incluso si hemos sido advertidos de la posibilidad de tales danos.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-6">Legislacion Aplicable</h2>
            <div className="bg-accent/10 border border-accent/20 rounded-2xl p-6">
              <p className="text-muted-foreground leading-relaxed">
                Estos terminos se rigen por las leyes de los Estados Unidos Mexicanos. 
                Cualquier disputa sera sometida a la jurisdiccion de los tribunales competentes 
                de la Ciudad de Mexico.
              </p>
            </div>
          </section>

          <section className="bg-secondary/30 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Nos reservamos el derecho de modificar estos terminos en cualquier momento. 
                Las modificaciones seran efectivas inmediatamente despues de su publicacion en el sitio.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
