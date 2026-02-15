import { redirect } from 'next/navigation'
import { CuentaDashboard } from '@/components/tienda/cuenta/CuentaDashboard'

export default function CuentaPage() {
  // TODO: Implementar autenticacion real
  // Por ahora redirigimos al login o mostramos un formulario
  
  return (
    <main>
      <div className="container mx-auto px-4 lg:px-8 py-8">
        <CuentaDashboard />
      </div>
    </main>
  )
}
