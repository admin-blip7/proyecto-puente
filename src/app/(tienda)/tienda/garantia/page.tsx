import { ShieldCheck, AlertTriangle, Check, Wrench, X } from 'lucide-react'

export const metadata = {
  title: 'Garantia - 22 Electronic',
  description: 'Informacion sobre nuestra garantia de 12 meses',
}

export default function GarantiaPage() {
  return (
    <main>
      <div className="container mx-auto px-4 lg:px-8 py-8 max-w-4xl">
        <h1 className="font-editors-note text-4xl font-thin mb-8">
          Garantia de 12 Meses
        </h1>

        <div className="space-y-8">
          <section className="bg-accent/10 rounded-xl p-6 text-center">
            <ShieldCheck className="h-12 w-12 text-accent mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Garantia Extendida</h2>
            <p className="text-sm text-muted-foreground">
              Todos nuestros productos incluyen <span className="font-bold"> 12 meses de garantia </span> 
              contra defectos de fabricacion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Que esta Cubierto</h2>
            <ul className="space-y-3">
              <li className="flex gap-3">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                <div>
                  <p className="font-medium">Defectos de fabricacion</p>
                  <p className="text-xs text-muted-foreground">Fallas en componentes internos o electronicos</p>
                </div>
              </li>
              <li className="flex gap-3">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                <div>
                  <p className="font-medium">Problemas de funcionamiento</p>
                  <p className="text-xs text-muted-foreground">Dispositivo que no enciende o funciona mal</p>
                </div>
              </li>
              <li className="flex gap-3">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                <div>
                  <p className="font-medium">Componentes internos</p>
                  <p className="text-xs text-muted-foreground">Bateria, placa madre, circuitos, etc.</p>
                </div>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Que NO esta Cubierto</h2>
            <ul className="space-y-3">
              <li className="flex gap-3">
                <X className="h-5 w-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="font-medium">Danos por mal uso</p>
                  <p className="text-xs text-muted-foreground">Caidas, contacto con liquidos, uso inadecuado</p>
                </div>
              </li>
              <li className="flex gap-3">
                <X className="h-5 w-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="font-medium">Desgaste normal</p>
                  <p className="text-xs text-muted-foreground">Bateria, cables, accesorios consumibles</p>
                </div>
              </li>
              <li className="flex gap-3">
                <X className="h-5 w-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="font-medium">Modificaciones no autorizadas</p>
                  <p className="text-xs text-muted-foreground">Abertura, reparacion por terceros</p>
                </div>
              </li>
            </ul>
          </section>

          <section className="bg-secondary/30 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Como Solicitar Garantia</h2>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-black text-xs font-bold flex-shrink-0">1</span>
                <p>Contactanos a traves de WhatsApp, email o telefono</p>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-black text-xs font-bold flex-shrink-0">2</span>
                <p>Describe el problema y adjunta fotos si es posible</p>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-black text-xs font-bold flex-shrink-0">3</span>
                <p>Recibe numero de autorizacion (RMA)</p>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-black text-xs font-bold flex-shrink-0">4</span>
                <p>Envia el producto a nuestro centro de servicio</p>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-black text-xs font-bold flex-shrink-0">5</span>
                <p>Recibe tu producto reparado o reemplazado en 5-7 dias</p>
              </li>
            </ol>
          </section>
        </div>
      </div>
    </main>
  )
}
