"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createPartner, createPartnerUser, isPartnerEmailAvailable } from "@/lib/services/partnerService"
import { CreatePartnerDTO, Partner } from "@/types"
import { Loader2, Eye, EyeOff } from "lucide-react"

interface CreatePartnerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPartnerCreated: (partner: Partner) => void
}

export default function CreatePartnerDialog({ open, onOpenChange, onPartnerCreated }: CreatePartnerDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [contactName, setContactName] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [commissionRate, setCommissionRate] = useState("15") // 15% por defecto
  const [paymentMethod, setPaymentMethod] = useState<"transfer" | "cash" | "card">("transfer")
  const [communityEnabled, setCommunityEnabled] = useState(false)
  const [allowBranchTransfers, setAllowBranchTransfers] = useState(true)
  const [allowCrossBranchSelling, setAllowCrossBranchSelling] = useState(true)
  const [maxMonthlySales, setMaxMonthlySales] = useState("10000")
  const [creditLimit, setCreditLimit] = useState("0")

  // User account state
  const [createUserAccount, setCreateUserAccount] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const [userPassword, setUserPassword] = useState("")
  const [userName, setUserName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)

  const resetForm = () => {
    setName("")
    setEmail("")
    setContactName("")
    setPhone("")
    setAddress("")
    setCommissionRate("15")
    setPaymentMethod("transfer")
    setCommunityEnabled(false)
    setAllowBranchTransfers(true)
    setAllowCrossBranchSelling(true)
    setMaxMonthlySales("10000")
    setCreditLimit("0")
    setError(null)
    setSuccessMessage(null)
    // Reset user account fields
    setCreateUserAccount(false)
    setUserEmail("")
    setUserPassword("")
    setUserName("")
  }

  // Generar contraseña aleatoria
  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"
    let password = ""
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setUserPassword(password)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // Validar email si se proporciona
      if (email && email.trim()) {
        const available = await isPartnerEmailAvailable(email.trim())
        if (!available) {
          setError("Este email ya está en uso por otro socio")
          setLoading(false)
          return
        }
      }

      // Validar datos de usuario si se va a crear cuenta
      if (createUserAccount) {
        if (!userEmail.trim() || !userPassword) {
          setError("El email y contraseña del usuario son requeridos")
          setLoading(false)
          return
        }
        if (userPassword.length < 6) {
          setError("La contraseña debe tener al menos 6 caracteres")
          setLoading(false)
          return
        }
      }

      const dto: CreatePartnerDTO = {
        name: name.trim(),
        email: email.trim() || undefined,
        contactName: contactName.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        commissionRate: parseFloat(commissionRate) / 100, // Convertir 15 -> 0.15
        paymentMethod,
        communityEnabled,
        allowBranchTransfers,
        allowCrossBranchSelling,
        maxMonthlySales: parseFloat(maxMonthlySales),
        creditLimit: parseFloat(creditLimit),
      }

      const newPartner = await createPartner(dto)

      // Si se solicita crear usuario, hacerlo después de crear el socio
      if (createUserAccount && userEmail.trim()) {
        setCreatingUser(true)
        try {
          await createPartnerUser(
            newPartner.id,
            {
              email: userEmail.trim(),
              password: userPassword,
              name: userName.trim() || userEmail.split('@')[0],
            },
            {
              partnerName: newPartner.name,
              sendEmail: false
            }
          )
          setSuccessMessage("Socio creado exitosamente. Usuario creado con contraseña manual.")
        } catch (userError: any) {
          // El socio ya fue creado, el error es solo del usuario
          console.error('Error al crear usuario:', userError)
          setSuccessMessage(`Socio creado exitosamente. Error al crear usuario: ${userError.message}`)
        } finally {
          setCreatingUser(false)
        }
      } else {
        setSuccessMessage("Socio creado exitosamente")
      }

      onPartnerCreated(newPartner)
      
      // Cerrar después de 2 segundos si hay éxito
      setTimeout(() => {
        resetForm()
        onOpenChange(false)
      }, 2000)

    } catch (err: any) {
      setError(err.message || "Error al crear socio")
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = name.trim() !== "" && !loading && (!createUserAccount || (userEmail.trim() && userPassword))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Socio</DialogTitle>
          <DialogDescription>
            Crea un nuevo socio con múltiples sucursales. También puedes crear una cuenta de acceso con contraseña manual.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-600">
              {successMessage}
            </div>
          )}

          {/* Información Básica */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Información Básica</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Socio *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: TechParts MX"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (opcional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contacto@socio.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName">Nombre de Contacto</Label>
                <Input
                  id="contactName"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Nombre del gerente"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+52 55 1234 5678"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Dirección completa"
                rows={2}
              />
            </div>
          </div>

          {/* Configuración de Pagos */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Configuración de Pagos</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="commissionRate">Comisión del Socio (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  placeholder="15"
                />
                <p className="text-xs text-muted-foreground">
                  Porcentaje de cada venta que pertenece al socio
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Método de Pago</Label>
                <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer">Transferencia Bancaria</SelectItem>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Configuración de Stock */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Configuración de Stock</h3>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allowBranchTransfers"
                  checked={allowBranchTransfers}
                  onCheckedChange={(checked) => setAllowBranchTransfers(checked === true)}
                />
                <Label htmlFor="allowBranchTransfers" className="cursor-pointer">
                  Permitir transferencias entre sucursales
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allowCrossBranchSelling"
                  checked={allowCrossBranchSelling}
                  onCheckedChange={(checked) => setAllowCrossBranchSelling(checked === true)}
                />
                <Label htmlFor="allowCrossBranchSelling" className="cursor-pointer">
                  Permitir vender desde otra sucursal
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="communityEnabled"
                  checked={communityEnabled}
                  onCheckedChange={(checked) => setCommunityEnabled(checked === true)}
                />
                <Label htmlFor="communityEnabled" className="cursor-pointer">
                  Participar en comunidad de stock
                </Label>
                <p className="text-xs text-muted-foreground ml-6">
                  El socio podrá compartir su stock con otros socios
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxMonthlySales">Límite Mensual de Ventas</Label>
                <Input
                  id="maxMonthlySales"
                  type="number"
                  min="0"
                  step="0.01"
                  value={maxMonthlySales}
                  onChange={(e) => setMaxMonthlySales(e.target.value)}
                  placeholder="10000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="creditLimit">Límite de Crédito</Label>
                <Input
                  id="creditLimit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Información de Cuenta de Acceso */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold">Cuenta de Acceso</h3>
            <p className="text-xs text-muted-foreground">
              Opcional: Crea una cuenta de acceso para que el socio pueda acceder al sistema POS.
            </p>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="createUserAccount"
                checked={createUserAccount}
                onCheckedChange={(checked) => setCreateUserAccount(checked === true)}
              />
              <Label htmlFor="createUserAccount" className="cursor-pointer">
                Crear cuenta de acceso para el socio
              </Label>
            </div>

            {createUserAccount && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="userEmail">Email del Usuario *</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="usuario@ejemplo.com"
                    required={createUserAccount}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userName">Nombre del Usuario</Label>
                  <Input
                    id="userName"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Nombre completo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userPassword">Contraseña *</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="userPassword"
                        type={showPassword ? "text" : "password"}
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)}
                        placeholder="Contraseña"
                        required={createUserAccount}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generatePassword}
                      title="Generar contraseña"
                    >
                      Generar
                    </Button>
                  </div>
                </div>

                <div className="flex items-end">
                  <p className="text-xs text-muted-foreground">
                    La contraseña se asigna aquí y puede mostrarse/ocultarse con el control visual.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm()
                onOpenChange(false)
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {(loading || creatingUser) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Creando socio..." : creatingUser ? "Creando usuario..." : "Crear Socio"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
