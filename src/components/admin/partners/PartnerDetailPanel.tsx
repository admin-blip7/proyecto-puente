"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Trash2, Building2, Users, Plus, Loader2, Key, Eye, EyeOff, AlertCircle } from "lucide-react"
import { Partner, PartnerUser } from "@/types"
import { deactivatePartner, deletePartner, createPartnerUser, getPartnerUsers } from "@/lib/services/partnerService"
import PartnerBranchesManager from "./PartnerBranchesManager"

interface PartnerDetailPanelProps {
  partner: Partner
  onPartnerUpdated?: () => void
  onClose?: () => void
}

export default function PartnerDetailPanel({ partner, onPartnerUpdated, onClose }: PartnerDetailPanelProps) {
  const [updating, setUpdating] = useState(false)
  const [activeTab, setActiveTab] = useState("sucursales")

  // Estado para gestión de usuarios
  const [users, setUsers] = useState<PartnerUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)
  const [showPasswordManagerDialog, setShowPasswordManagerDialog] = useState(false)
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<PartnerUser | null>(null)
  const [managedPassword, setManagedPassword] = useState("")
  const [showManagedPassword, setShowManagedPassword] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [passwordUpdateMessage, setPasswordUpdateMessage] = useState<string | null>(null)
  const [userError, setUserError] = useState<string | null>(null)
  const [userSuccess, setUserSuccess] = useState<string | null>(null)
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserName, setNewUserName] = useState("")
  const [newUserPassword, setNewUserPassword] = useState("")
  const [selectedBranchId, setSelectedBranchId] = useState("")

  // Cargar usuarios del partner cuando cambia el tab o el partner
  useEffect(() => {
    if (activeTab === "usuarios") {
      loadUsers()
    }
  }, [activeTab, partner.id])

  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const partnerUsers = await getPartnerUsers(partner.id)
      setUsers(partnerUsers)
    } catch (error) {
      console.error("Error loading users:", error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleDeactivate = async () => {
    if (!confirm(`¿Desactivar socio ${partner.name}?`)) return

    setUpdating(true)
    try {
      if (partner.isActive) {
        await deactivatePartner(partner.id)
      } else {
        await reactivatePartner()
      }
      onPartnerUpdated?.()
    } catch (error) {
      console.error("Error updating partner:", error)
    } finally {
      setUpdating(false)
    }
  }

  const reactivatePartner = async () => {
    // Necesitamos implementar esta función en el servicio
    // Por ahora es un placeholder
    alert("Función por implementar: Reactivar socio")
  }

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar socio ${partner.name} permanentemente? Esta acción no se puede deshacer.`)) return

    setUpdating(true)
    try {
      await deletePartner(partner.id)
      onClose?.()
    } catch (error) {
      console.error("Error deleting partner:", error)
    } finally {
      setUpdating(false)
    }
  }

  // Crear usuario de socio
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingUser(true)
    setUserError(null)
    setUserSuccess(null)

    try {
      if (!newUserEmail || !newUserPassword) {
        setUserError("Email y contraseña son requeridos")
        setCreatingUser(false)
        return
      }

      // Crear usuario sin envío de correo, el admin controla la contraseña directamente
      await createPartnerUser(
        partner.id,
        {
          email: newUserEmail.trim(),
          password: newUserPassword,
          name: newUserName.trim() || newUserEmail.split('@')[0],
          branchId: selectedBranchId || undefined
        },
        {
          partnerName: partner.name,
          sendEmail: false
        }
      )

      setUserSuccess(`Usuario creado exitosamente. Contraseña asignada manualmente.`)
      setNewUserEmail("")
      setNewUserName("")
      setNewUserPassword("")
      setSelectedBranchId("")
      setShowPassword(false)

      // Recargar la lista de usuarios
      await loadUsers()
    } catch (error: any) {
      // Manejar error específico de email duplicado (422)
      if (error.message?.includes("already been registered") || error.message?.includes("already registered") || error.status === 422) {
        setUserError(`El email ${newUserEmail} ya está registrado. Usa otro email o verifica si el usuario ya existe.`)
      } else {
        setUserError(error.message || "Error al crear usuario")
      }
    } finally {
      setCreatingUser(false)
    }
  }

  // Generar contraseña aleatoria
  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%"
    let password = ""
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewUserPassword(password)
  }

  const generateManagedPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%"
    let password = ""
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setManagedPassword(password)
  }

  const handleOpenPasswordManager = (user: PartnerUser) => {
    setSelectedUserForPassword(user)
    setManagedPassword("")
    setShowManagedPassword(true)
    setPasswordUpdateMessage(null)
    setUserError(null)
    setShowPasswordManagerDialog(true)
  }

  const handleUpdateUserPassword = async () => {
    if (!selectedUserForPassword) return
    if (managedPassword.trim().length < 8) {
      setUserError("La contraseña debe tener al menos 8 caracteres")
      return
    }

    setUpdatingPassword(true)
    setUserError(null)
    setPasswordUpdateMessage(null)

    try {
      const response = await fetch(`/api/admin/partners/users/${selectedUserForPassword.id}/password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: managedPassword }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || "No se pudo actualizar la contraseña")
      }

      setPasswordUpdateMessage("Contraseña actualizada correctamente")
      setShowManagedPassword(true)
    } catch (error: any) {
      setUserError(error.message || "Error al actualizar contraseña")
    } finally {
      setUpdatingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full ${
            partner.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
          }`}>
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{partner.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={partner.isActive ? "default" : "secondary"}>
                {partner.isActive ? "Activo" : "Inactivo"}
              </Badge>
              {partner.communityEnabled && (
                <Badge variant="outline" className="text-blue-600">
                  Comunidad activa
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Comisión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(partner.commissionRate * 100).toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">Por venta</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Límite Mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${partner.maxMonthlySales.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Método de Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {partner.paymentMethod === 'transfer' ? 'Transferencia' : partner.paymentMethod}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Límite de Crédito</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${partner.creditLimit.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="sucursales">Sucursales</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="config">Configuración</TabsTrigger>
          <TabsTrigger value="acciones">Acciones</TabsTrigger>
        </TabsList>

        <TabsContent value="sucursales" className="mt-6">
          <PartnerBranchesManager
            partner={partner}
            onBranchesUpdated={onPartnerUpdated}
          />
        </TabsContent>

        <TabsContent value="usuarios" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Usuarios del Socio</CardTitle>
                  <CardDescription>
                    Gestiona las cuentas de acceso para {partner.name}
                  </CardDescription>
                </div>
                <Button onClick={() => setShowCreateUserDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Usuario
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="p-8 text-center border rounded-lg border-dashed">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No hay usuarios aún</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Crea el primer usuario para este socio
                    </p>
                    <Button onClick={() => setShowCreateUserDialog(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Crear Usuario
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            user.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                          }`}>
                            <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {user.role}
                              </Badge>
                              {user.branchId && (
                                <Badge variant="secondary" className="text-xs">
                                  Sucursal asignada
                                </Badge>
                              )}
                              {!user.isActive && (
                                <Badge variant="secondary" className="text-xs">
                                  Inactivo
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenPasswordManager(user)}
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            Ver Contraseña
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Información sobre usuarios:</p>
                      <ul className="list-disc list-inside space-y-1 text-blue-700">
                        <li>El email del usuario se usa como nombre de usuario</li>
                        <li>La contraseña se define manualmente al crear o al reasignar</li>
                        <li>Por seguridad no se puede leer la contraseña anterior; debes asignar una nueva para verla</li>
                        <li>Los usuarios pueden acceder al dashboard del socio en /socio/dashboard</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración del Socio</CardTitle>
              <CardDescription>
                Ajusta las configuraciones y límites del socio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Transferencias entre Sucursales</p>
                  <Badge variant={partner.allowBranchTransfers ? "default" : "secondary"}>
                    {partner.allowBranchTransfers ? "Habilitadas" : "Deshabilitadas"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Venta Cruzada</p>
                  <Badge variant={partner.allowCrossBranchSelling ? "default" : "secondary"}>
                    {partner.allowCrossBranchSelling ? "Habilitada" : "Deshabilitada"}
                  </Badge>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Información de Contacto</p>
                <div className="space-y-1 text-sm">
                  {partner.email && <p><strong>Email:</strong> {partner.email}</p>}
                  {partner.phone && <p><strong>Teléfono:</strong> {partner.phone}</p>}
                  {partner.address && <p><strong>Dirección:</strong> {partner.address}</p>}
                  {partner.contactName && <p><strong>Contacto:</strong> {partner.contactName}</p>}
                  {!partner.email && !partner.phone && !partner.address && (
                    <p className="text-muted-foreground italic">Sin información de contacto</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="acciones" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Acciones del Socio</CardTitle>
              <CardDescription>
                Gestiona el estado y configuración del socio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleDeactivate}
                  disabled={updating}
                >
                  {partner.isActive ? "Desactivar Socio" : "Reactivar Socio"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={updating}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar Socio
                </Button>
              </div>

              {partner.isActive && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">
                    El socio tiene acceso al sistema y puede gestionar sus sucursales.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => alert("Función para resetear contraseña del socio")}
                  >
                    Resetear Contraseña
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para crear usuario */}
      <Dialog open={showCreateUserDialog} onOpenChange={setShowCreateUserDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Usuario de Socio</DialogTitle>
            <DialogDescription>
              Crea una cuenta de acceso para {partner.name}. La contraseña se asigna aquí directamente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4">
            {userError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
                {userError}
              </div>
            )}

            {userSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-600">
                {userSuccess}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="userEmail">Correo Electrónico *</Label>
              <Input
                id="userEmail"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="socio@ejemplo.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                Este será el nombre de usuario para el login
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="userName">Nombre Completo</Label>
              <Input
                id="userName"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Juan Pérez"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="userPassword">Contraseña *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={generatePassword}
                >
                  <Key className="mr-1 h-3 w-3" />
                  Generar
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="userPassword"
                  type={showPassword ? "text" : "password"}
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Ingresa o genera una contraseña"
                  className="pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-8 w-8"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres. Se recomienda usar una contraseña segura.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateUserDialog(false)
                  setUserError(null)
                  setUserSuccess(null)
                  setNewUserEmail("")
                  setNewUserName("")
                  setNewUserPassword("")
                  setShowPassword(false)
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={creatingUser || !newUserEmail || !newUserPassword}>
                {creatingUser ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Crear Usuario
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showPasswordManagerDialog} onOpenChange={setShowPasswordManagerDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ver / Asignar Contraseña</DialogTitle>
            <DialogDescription>
              {selectedUserForPassword
                ? `Usuario: ${selectedUserForPassword.email}`
                : "Selecciona un usuario"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {userError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
                {userError}
              </div>
            )}

            {passwordUpdateMessage && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-600">
                {passwordUpdateMessage}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="managedPassword">Nueva contraseña</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={generateManagedPassword}
                >
                  <Key className="mr-1 h-3 w-3" />
                  Generar
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="managedPassword"
                  type={showManagedPassword ? "text" : "password"}
                  value={managedPassword}
                  onChange={(e) => setManagedPassword(e.target.value)}
                  placeholder="Escribe o genera una contraseña"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-8 w-8"
                  onClick={() => setShowManagedPassword((prev) => !prev)}
                  aria-label={showManagedPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showManagedPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Supabase no permite ver la contraseña actual. Aquí puedes asignar una nueva y visualizarla.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowPasswordManagerDialog(false)
                setSelectedUserForPassword(null)
                setManagedPassword("")
                setPasswordUpdateMessage(null)
                setUserError(null)
              }}
              disabled={updatingPassword}
            >
              Cerrar
            </Button>
            <Button onClick={handleUpdateUserPassword} disabled={updatingPassword || !managedPassword.trim()}>
              {updatingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>Guardar Contraseña</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
