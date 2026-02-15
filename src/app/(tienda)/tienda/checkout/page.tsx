import { redirect } from 'next/navigation'
import { CheckoutForm } from '@/components/tienda/checkout/CheckoutForm'

export default function CheckoutPage() {
  // This is a basic checkout page - in production, this would integrate with Stripe
  // For now, redirecting to a simple form

  return (
    <main>
      <div className="container mx-auto px-4 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-editors-note text-3xl lg:text-4xl font-thin mb-2">
            Finalizar Compra
          </h1>
          <p className="text-muted-foreground">
            Completa tus datos de envío y pago para completar el pedido.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <CheckoutForm />
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-secondary/30 rounded-2xl p-6 border border-border sticky top-24">
              <h2 className="font-semibold text-lg mb-4">Resumen del Pedido</h2>
              {/* Order summary will be handled by CheckoutForm */}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
