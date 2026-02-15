import { Shield, Lock, Eye, Database, UserCheck, Mail, AlertCircle } from 'lucide-react'

export const metadata = {
  title: 'Aviso de Privacidad - 22 Electronic',
  description: 'Aviso de privacidad y proteccion de datos personales en 22 Electronic.',
}

export default function PrivacidadPage() {
  return (
    <main>
      <div className="container mx-auto px-4 lg:px-8 py-8 max-w-4xl">
        <span className="text-accent text-xs font-mono font-bold block mb-4">/// LEGAL</span>
        <h1 className="font-editors-note text-4xl lg:text-5xl font-thin mb-4">
          Aviso de Privacidad
        </h1>
        <p className="text-muted-foreground mb-10">
          Ultima actualizacion: Febrero 2026
        </p>

        <div className="space-y-10">
          <section className="bg-secondary/30 rounded-2xl p-6 lg:p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-3">Tu Privacidad es Importante</h2>
                <p className="text-muted-foreground leading-relaxed">
                  En 22 Electronic nos comprometemos a proteger tu informacion personal. 
                  Este aviso describe que datos recopilamos, como los usamos y tus derechos respecto a ellos.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
              <Database className="h-6 w-6 text-accent" />
              Datos que Recopilamos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-secondary/30 rounded-xl p-5">
                <h3 className="font-semibold mb-2">Datos de Identificacion</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Nombre completo</li>
                  <li>Correo electronico</li>
                  <li>Telefono</li>
                  <li>Direccion de envio</li>
                </ul>
              </div>
              <div className="bg-secondary/30 rounded-xl p-5">
                <h3 className="font-semibold mb-2">Datos de Compra</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Historial de pedidos</li>
                  <li>Metodos de pago usados</li>
                  <li>Preferencias de compra</li>
                  <li>Lista de deseos</li>
                </ul>
              </div>
              <div className="bg-secondary/30 rounded-xl p-5">
                <h3 className="font-semibold mb-2">Datos de Navegacion</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Direccion IP</li>
                  <li>Tipo de navegador</li>
                  <li>Paginas visitadas</li>
                  <li>Cookies y tecnologias similares</li>
                </ul>
              </div>
              <div className="bg-secondary/30 rounded-xl p-5">
                <h3 className="font-semibold mb-2">Datos de Comunicacion</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Mensajes por WhatsApp</li>
                  <li>Correos enviados</li>
                  <li>Consultas de soporte</li>
                  <li>Resenas y comentarios</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
              <Eye className="h-6 w-6 text-accent" />
              Como Usamos tus Datos
            </h2>
            <div className="space-y-3">
              <div className="flex gap-3 items-start bg-secondary/30 rounded-lg p-4">
                <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Procesar tus pedidos</p>
                  <p className="text-sm text-muted-foreground">Gestionar compras, envios y devoluciones.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start bg-secondary/30 rounded-lg p-4">
                <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Comunicarnos contigo</p>
                  <p className="text-sm text-muted-foreground">Enviar actualizaciones de pedidos, promociones y soporte.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start bg-secondary/30 rounded-lg p-4">
                <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Mejorar nuestros servicios</p>
                  <p className="text-sm text-muted-foreground">Analizar comportamiento para optimizar la experiencia.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start bg-secondary/30 rounded-lg p-4">
                <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Prevenir fraudes</p>
                  <p className="text-sm text-muted-foreground">Detectar y prevenir transacciones sospechosas.</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
              <Lock className="h-6 w-6 text-accent" />
              Proteccion de Datos
            </h2>
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6">
              <p className="text-muted-foreground leading-relaxed mb-4">
                Implementamos medidas de seguridad tecnicas y organizativas para proteger tu informacion:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Cifrado SSL/TLS en todas las conexiones</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Almacenamiento seguro en servidores dedicados</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Acceso restringido a personal autorizado</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Backups y recuperacion de datos</span>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
              <UserCheck className="h-6 w-6 text-accent" />
              Tus Derechos
            </h2>
            <div className="bg-secondary/30 rounded-2xl p-6">
              <p className="text-muted-foreground mb-4">
                Como titular de tus datos personales, tienes derecho a:
              </p>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="text-accent font-bold">ACCEDER</span>
                  <span className="text-muted-foreground">Saber que datos tenemos sobre ti</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-accent font-bold">RECTIFICAR</span>
                  <span className="text-muted-foreground">Corregir datos inexactos o incompletos</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-accent font-bold">CANCELAR</span>
                  <span className="text-muted-foreground">Solicitar la eliminacion de tus datos</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-accent font-bold">OPONERTE</span>
                  <span className="text-muted-foreground">Rechazar el uso de tus datos para ciertos fines</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-accent font-bold">PORTABILIDAD</span>
                  <span className="text-muted-foreground">Recibir tus datos en formato digital</span>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
              <Mail className="h-6 w-6 text-accent" />
              Contacto para Privacidad
            </h2>
            <div className="bg-accent/10 border border-accent/20 rounded-2xl p-6">
              <p className="text-muted-foreground mb-4">
                Para ejercer tus derechos o resolver dudas sobre el tratamiento de tus datos:
              </p>
              <div className="space-y-2">
                <p className="font-semibold">Email: <a href="mailto:privacidad@22electronic.com" className="text-accent hover:underline">privacidad@22electronic.com</a></p>
                <p className="text-sm text-muted-foreground">Responderemos en un plazo maximo de 20 dias habiles.</p>
              </div>
            </div>
          </section>

          <section className="bg-secondary/30 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Este aviso de privacidad puede ser actualizado periodicamente. Te recomendamos revisarlo 
                regularmente para estar informado sobre como protegemos tu informacion.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
