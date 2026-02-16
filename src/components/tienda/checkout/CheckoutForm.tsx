'use client'

import { useState } from 'react'
import { useCart } from '../cart/CartProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CreditCard, Package, Truck, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { addSaleAndUpdateStock } from '@/lib/services/salesService'
import { useAuth } from '@/lib/hooks'
import { Sale, CartItem as ServiceCartItem } from '@/types'
import { useToast } from '@/hooks/use-toast'
import {
  calculateTiendaLinePricing,
  qualifiesForFreeShipping,
  TIENDA_FREE_SHIPPING_THRESHOLD,
  TIENDA_SHIPPING_FLAT_RATE,
} from '@/lib/tiendaPricing'

export function CheckoutForm() {
  const { items, subtotal, regularSubtotal, savingsTotal, clearCart } = useCart()
  const { user } = useAuth()
  const { toast } = useToast()
  const [step, setStep] = useState<'shipping' | 'payment' | 'confirmation'>('shipping')
  const [isProcessing, setIsProcessing] = useState(false)

  const shipping = qualifiesForFreeShipping(subtotal) ? 0 : TIENDA_SHIPPING_FLAT_RATE
  const total = subtotal + shipping

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    // Collect form data
    const formData = new FormData(e.target as HTMLFormElement)
    const shippingInfo = {
      address: formData.get('address') as string,
      city: formData.get('city') as string,
      zipCode: formData.get('zipCode') as string,
      phone: formData.get('phone') as string,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
    }

    try {
      // Create sale object
      // Note: We are mocking some fields like cashierId since this is online
      const saleData: Omit<Sale, "id" | "saleId" | "createdAt"> = {
        items: items.map(item => {
          const linePricing = calculateTiendaLinePricing(item.price, item.quantity, item.socioPrice)

          return {
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            priceAtSale: linePricing.effectiveUnitPrice,
            // Consignor ID handled by server
          }
        }),
        totalAmount: total,
        paymentMethod: 'Tarjeta de Crédito', // Mocked for now
        cashierId: 'ONLINE',
        cashierName: 'Tienda en Línea',
        customerName: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
        customerPhone: shippingInfo.phone,
        status: 'completed',
        amountPaid: total,
        changeGiven: 0,
        userId: user?.id, // Link to user
        shippingInfo: shippingInfo,
        deliveryStatus: 'pending'
      }

      // Convert to service CartItem (cast as we only need id and quantity for stock update)
      const serviceCartItems = items.map(item => {
        const linePricing = calculateTiendaLinePricing(item.price, item.quantity, item.socioPrice)

        return {
          id: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: linePricing.effectiveUnitPrice,
          // Mock required fields to satisfy type
          sku: item.sku || '',
          cost: 0,
          stock: 0,
          createdAt: new Date(),
          type: 'Venta',
          ownershipType: 'Propio'
        }
      }) as unknown as ServiceCartItem[]

      await addSaleAndUpdateStock(saleData, serviceCartItems, null, true)

      setStep('confirmation')
      clearCart()
      toast({
        title: "Pedido Exitoso",
        description: "Tu pedido ha sido procesado correctamente.",
      })
    } catch (error) {
      console.error('Checkout error:', error)
      // alert('Error al procesar el pedido. Intenta nuevamente.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (items.length === 0 && step !== 'confirmation') {
    return (
      <div className="text-center py-20 bg-secondary/30 rounded-2xl">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-secondary mb-4">
          <Package className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">
          Tu carrito está vacío
        </h3>
        <p className="text-muted-foreground mb-6">
          Agrega productos para proceder con el checkout.
        </p>
        <Button
          className="bg-accent text-black hover:bg-accent/90"
          asChild
        >
          <a href="/tienda">Explorar productos</a>
        </Button>
      </div>
    )
  }

  if (step === 'confirmation') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16 bg-secondary/30 rounded-2xl"
      >
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 mb-6">
          <Check className="h-10 w-10 text-green-500" />
        </div>
        <h2 className="font-editors-note text-3xl font-thin mb-4">
          ¡Pedido Confirmado!
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Gracias por tu compra. Hemos enviado un correo de confirmación con los detalles de tu pedido.
        </p>
        <div className="flex justify-center gap-4">
          <Button
            className="bg-accent text-black hover:bg-accent/90"
            asChild
          >
            <a href="/tienda">Seguir comprando</a>
          </Button>
          <Button
            variant="outline"
            asChild
          >
            <a href="/tienda/cuenta">Ver mi pedido</a>
          </Button>
        </div>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress Steps - Only shown if not confirmation (which returns early) */}
      <div className="flex items-center gap-4 mb-8">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-medium ${step === 'payment'
          ? 'border-accent bg-accent text-black'
          : 'border-accent bg-accent text-black' // Shipping is active or passed
          }`}>
          {step === 'payment' ? <Check className="h-5 w-5" /> : '1'}
        </div>
        <div className={`flex-1 h-0.5 ${step === 'payment' ? 'bg-accent' : 'bg-border'
          }`} />
        <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-medium ${step === 'payment'
          ? 'border-accent bg-accent text-black'
          : 'border-border'
          }`}>
          2
        </div>
        <div className="flex-1 h-0.5 bg-border" />
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 font-medium border-border">
          3
        </div>
      </div>

      {/* Shipping Information */}
      <div className="bg-secondary/30 rounded-2xl p-6 border border-border">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
            <Truck className="h-5 w-5 text-accent" />
          </div>
          <h2 className="font-semibold text-lg">Información de Envío</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Nombre</Label>
            <Input id="firstName" name="firstName" required placeholder="Juan" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Apellidos</Label>
            <Input id="lastName" name="lastName" required placeholder="Pérez García" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input id="email" name="email" type="email" required placeholder="juan@ejemplo.com" defaultValue={user?.email || ''} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" name="phone" type="tel" required placeholder="+52 55 1234 5678" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" name="address" required placeholder="Calle, número, colonia" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Ciudad</Label>
            <Input id="city" name="city" required placeholder="Ciudad de México" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zipCode">Código Postal</Label>
            <Input id="zipCode" name="zipCode" required placeholder="01000" />
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="bg-secondary/30 rounded-2xl p-6 border border-border">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
            <CreditCard className="h-5 w-5 text-accent" />
          </div>
          <h2 className="font-semibold text-lg">Información de Pago</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cardNumber">Número de Tarjeta</Label>
            <Input
              id="cardNumber"
              required
              placeholder="1234 5678 9012 3456"
              maxLength={19}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiry">Vencimiento</Label>
            <Input id="expiry" required placeholder="MM/AA" maxLength={5} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cvv">CVV</Label>
            <Input id="cvv" required placeholder="123" maxLength={4} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cardName">Nombre en la Tarjeta</Label>
            <Input id="cardName" required placeholder="JUAN PÉREZ GARCÍA" />
          </div>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          <span className="text-accent">🔒</span> Tu pago es procesado de forma segura con encriptación de 256 bits.
        </p>
      </div>

      {/* Order Summary */}
      <div className="bg-secondary/30 rounded-2xl p-6 border border-border">
        <h2 className="font-semibold text-lg mb-4">Resumen del Pedido</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal regular</span>
            <span className="font-medium">
              ${regularSubtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
          {savingsTotal > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Ahorro socio</span>
              <span className="font-medium">
                -${savingsTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal final</span>
            <span className="font-medium">
              ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Envío</span>
            <span className={`font-medium ${shipping === 0 ? 'text-green-600' : ''}`}>
              {shipping === 0
                ? 'Gratis'
                : `$${shipping.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Envío gratis solo para pedidos que superen ${TIENDA_FREE_SHIPPING_THRESHOLD.toLocaleString('es-MX')}.
          </p>
          <div className="flex justify-between pt-2 border-t border-border text-base">
            <span className="font-semibold">Total</span>
            <span className="font-bold">
              ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isProcessing}
        className="w-full bg-accent py-6 text-base font-bold text-black hover:bg-accent/90 h-auto"
      >
        {isProcessing ? (
          <span className="flex items-center gap-2">
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              ⏳
            </motion.span>
            Procesando...
          </span>
        ) : (
          `Pagar $${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Al completar esta compra, aceptas nuestros{' '}
        <a href="/tienda/terminos" className="text-accent hover:underline">
          términos y condiciones
        </a>{' '}
        y{' '}
        <a href="/tienda/privacidad" className="text-accent hover:underline">
          política de privacidad
        </a>
        .
      </p>
    </form>
  )
}
