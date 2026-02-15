import { RotateCcw, Clock, Check, X, AlertTriangle, Percent, Calendar } from 'lucide-react'

export const metadata = {
  title: 'Politica de Devoluciones - 22 Electronic',
  description: 'Informacion sobre devoluciones y reembolsos. Tienes 1 mes para devolver tu producto.',
}

export default function DevolucionesPage() {
  return (
    <main>
      <div className="container mx-auto px-4 lg:px-8 py-8 max-w-4xl">
        <span className="text-accent text-xs font-mono font-bold block mb-4">/// DEVOLUCIONES</span>
        <h1 className="font-editors-note text-4xl lg:text-5xl font-thin mb-8">
          Politica de Devoluciones
        </h1>

        <div className="space-y-10">
          <section className="bg-gradient-to-br from-accent/20 to-accent/10 border border-accent/30 rounded-2xl p-6 lg:p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="h-6 w-6 text-black" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">1 Mes para Devolver</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Tienes <span className="font-bold text-primary">30 dias naturales</span> desde la fecha de entrega 
                  para devolver tu producto si no estas satisfecho. El producto debe estar en las mismas condiciones 
                  en que lo recibiste.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 lg:p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Percent className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-3 text-red-500">Deduccion por Gastos Operativos</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Al solicitar una devolucion, se aplicara una <span className="font-bold text-red-500">deduccion del 20%</span> del 
                  valor del producto para cubrir gastos operativos de procesamiento, inspeccion y reingreso del merchandise.
                </p>
                <div className="bg-base rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">Ejemplo:</p>
                  <p className="text-sm text-muted-foreground">
                    Si el producto cuesta <span className="font-bold">$1,000 MXN</span>, recibirás un reembolso de 
                    <span className="font-bold text-green-500"> $800 MXN</span> (menos el 20% de deduccion).
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
              <Check className="h-6 w-6 text-green-500" />
              Condiciones de Devolucion
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex gap-3 bg-green-500/10 rounded-lg p-4">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                <p className="text-sm">Producto en estado original, sin senales de uso</p>
              </div>
              <div className="flex gap-3 bg-green-500/10 rounded-lg p-4">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                <p className="text-sm">Empaque original y accesorios completos</p>
              </div>
              <div className="flex gap-3 bg-green-500/10 rounded-lg p-4">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                <p className="text-sm">Comprobante de compra o factura</p>
              </div>
              <div className="flex gap-3 bg-green-500/10 rounded-lg p-4">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                <p className="text-sm">Sin activacion de software o registros</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
              <X className="h-6 w-6 text-red-500" />
              No Aceptamos Devoluciones de:
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex gap-3 bg-red-500/10 rounded-lg p-4">
                <X className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-sm">Productos con danos por mal uso</p>
              </div>
              <div className="flex gap-3 bg-red-500/10 rounded-lg p-4">
                <X className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-sm">Productos sin empaque original</p>
              </div>
              <div className="flex gap-3 bg-red-500/10 rounded-lg p-4">
                <X className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-sm">Accesorios o partes faltantes</p>
              </div>
              <div className="flex gap-3 bg-red-500/10 rounded-lg p-4">
                <X className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-sm">Productos higienicos (audifonos intrauditivos)</p>
              </div>
            </div>
          </section>

          <section className="bg-secondary/30 rounded-2xl p-6 lg:p-8">
            <h2 className="text-xl font-semibold mb-6">Proceso de Devolucion</h2>
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-black text-sm font-bold flex-shrink-0">1</span>
                <div>
                  <p className="font-medium">Contactanos</p>
                  <p className="text-sm text-muted-foreground">Comunicate por WhatsApp o correo electronico para iniciar tu solicitud.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-black text-sm font-bold flex-shrink-0">2</span>
                <div>
                  <p className="font-medium">Autorizacion</p>
                  <p className="text-sm text-muted-foreground">Recibiras un numero de autorizacion (RMA) y las instrucciones de envio.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-black text-sm font-bold flex-shrink-0">3</span>
                <div>
                  <p className="font-medium">Inspeccion</p>
                  <p className="text-sm text-muted-foreground">Al recibir el producto, lo inspeccionaremos para verificar su estado.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-black text-sm font-bold flex-shrink-0">4</span>
                <div>
                  <p className="font-medium">Reembolso</p>
                  <p className="text-sm text-muted-foreground">Se procesara el reembolso (menos 20%) en 5-7 dias habiles.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-accent/10 border border-accent/20 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-accent flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-2">Importante</h3>
                <p className="text-sm text-muted-foreground">
                  La garantia del fabricante no se ve afectada por nuestra politica de devoluciones. 
                  Los defectos de fabricacion estan cubiertos por <span className="font-bold">12 meses de garantia</span> sin costo adicional.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
