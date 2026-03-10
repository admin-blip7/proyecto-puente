"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { getBranches, getBranchStock, createBranch, updateBranch, deleteBranch, getPartnerStock } from "@/lib/services/branchService"
import { Branch, CreateBranchDTO, Partner } from "@/types"
import { Loader2, Plus, Pencil, Trash2, MapPin } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface PartnerBranchesManagerProps {
  partner: Partner
  onBranchesUpdated?: () => void
}

export default function PartnerBranchesManager({ partner, onBranchesUpdated }: PartnerBranchesManagerProps) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [stockByBranch, setStockByBranch] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [zipCode, setZipCode] = useState("")
  const [managerName, setManagerName] = useState("")
  const [managerPhone, setManagerPhone] = useState("")
  const [isMain, setIsMain] = useState(false)

  useEffect(() => {
    loadBranches()
  }, [partner.id])

  const loadBranches = async () => {
    setLoading(true)
    try {
      const [branchesData, stockData] = await Promise.all([
        getBranches(partner.id),
        getPartnerStock(partner.id),
      ])

      setBranches(branchesData)

      // Agrupar stock por sucursal
      const stockMap: Record<string, number> = {}
      for (const stockItem of stockData) {
        if (!stockMap[stockItem.branchId]) {
          stockMap[stockItem.branchId] = 0
        }
        stockMap[stockItem.branchId] += stockItem.available
      }
      setStockByBranch(stockMap)
    } catch (error) {
      console.error("Error loading branches:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setName("")
    setCode("")
    setAddress("")
    setCity("")
    setState("")
    setZipCode("")
    setManagerName("")
    setManagerPhone("")
    setIsMain(false)
    setEditingBranch(null)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const dto: CreateBranchDTO = {
        name: name.trim(),
        code: code.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        zipCode: zipCode.trim() || undefined,
        managerName: managerName.trim() || undefined,
        managerPhone: managerPhone.trim() || undefined,
        isMain,
      }

      await createBranch(partner.id, dto)
      resetForm()
      setShowCreateDialog(false)
      loadBranches()
      onBranchesUpdated?.()
    } catch (error: any) {
      console.error("Error creating branch:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch)
    setName(branch.name)
    setCode(branch.code || "")
    setAddress(branch.address || "")
    setCity(branch.city || "")
    setState(branch.state || "")
    setZipCode(branch.zipCode || "")
    setManagerName(branch.managerName || "")
    setManagerPhone(branch.managerPhone || "")
    setIsMain(branch.isMain)
    setShowCreateDialog(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBranch) return

    setSaving(true)

    try {
      const dto: CreateBranchDTO = {
        name: name.trim(),
        code: code.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        zipCode: zipCode.trim() || undefined,
        managerName: managerName.trim() || undefined,
        managerPhone: managerPhone.trim() || undefined,
        isMain,
      }

      await updateBranch(editingBranch.id, dto)
      resetForm()
      setShowCreateDialog(false)
      loadBranches()
      onBranchesUpdated?.()
    } catch (error: any) {
      console.error("Error updating branch:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (branchId: string) => {
    if (!confirm("¿Estás seguro de desactivar esta sucursal?")) return

    try {
      await deleteBranch(branchId)
      loadBranches()
      onBranchesUpdated?.()
    } catch (error: any) {
      console.error("Error deleting branch:", error)
    }
  }

  const totalStock = Object.values(stockByBranch).reduce((sum, val) => sum + val, 0)

  return (
    <div className="space-y-6">
      {/* Header con stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Sucursales de {partner.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {branches.length} sucursales · {totalStock.toLocaleString()} unidades totales
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateDialog(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Sucursal
        </Button>
      </div>

      {/* Tabla de sucursales */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : branches.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Sin sucursales</h3>
          <p className="text-muted-foreground mt-2 mb-4">
            Este socio aún no tiene sucursales configuradas
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Crear Primera Sucursal
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Gerente</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches.map((branch) => (
              <TableRow key={branch.id}>
                <TableCell className="font-medium">{branch.name}</TableCell>
                <TableCell>
                  {branch.code ? (
                    <Badge variant="secondary">{branch.code}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {branch.city && branch.state ? (
                    <span className="text-sm">
                      {branch.city}, {branch.state}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {branch.managerName ? (
                    <div className="text-sm">
                      <div>{branch.managerName}</div>
                      {branch.managerPhone && (
                        <div className="text-muted-foreground text-xs">{branch.managerPhone}</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={stockByBranch[branch.id] > 0 ? "default" : "secondary"}>
                    {stockByBranch[branch.id]?.toLocaleString() || 0} unidades
                  </Badge>
                </TableCell>
                <TableCell>
                  {branch.isMain ? (
                    <Badge variant="default">Principal</Badge>
                  ) : (
                    <Badge variant="outline">Regular</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(branch)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(branch.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Dialog para crear/editar */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) resetForm() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBranch ? "Editar Sucursal" : "Nueva Sucursal"}
            </DialogTitle>
            <DialogDescription>
              {editingBranch ? "Modifica los datos de la sucursal" : "Agrega una nueva sucursal para este socio"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={editingBranch ? handleUpdate : handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="branchName">Nombre de la Sucursal *</Label>
              <Input
                id="branchName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Sucursal Puebla"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branchCode">Código Corto</Label>
                <Input
                  id="branchCode"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Ej: PUE"
                  maxLength={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="branchCity">Ciudad</Label>
                <Input
                  id="branchCity"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ej: Puebla"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branchState">Estado</Label>
                <Input
                  id="branchState"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Ej: Puebla"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="branchZip">Código Postal</Label>
                <Input
                  id="branchZip"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="72000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="branchAddress">Dirección Completa</Label>
              <Textarea
                id="branchAddress"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Calle, número, colonia"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="managerName">Nombre del Gerente</Label>
                <Input
                  id="managerName"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="Nombre del gerente"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="managerPhone">Teléfono del Gerente</Label>
                <Input
                  id="managerPhone"
                  value={managerPhone}
                  onChange={(e) => setManagerPhone(e.target.value)}
                  placeholder="+52 55 1234 5678"
                />
              </div>
            </div>

            {!editingBranch && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isMain"
                  checked={isMain}
                  onCheckedChange={(checked) => setIsMain(checked === true)}
                />
                <Label htmlFor="isMain" className="cursor-pointer">
                  Establecer como sucursal principal
                </Label>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm()
                  setShowCreateDialog(false)
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={!name.trim() || saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingBranch ? "Guardar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
