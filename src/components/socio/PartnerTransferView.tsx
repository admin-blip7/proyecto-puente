"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ArrowRightLeft, Plus, CheckCircle, XCircle, Package, Store } from "lucide-react"
import {
  getTransfers,
  createTransfer,
  approveTransfer,
  receiveTransfer
} from "@/lib/services/branchTransferService"
import { getPartnerStock } from "@/lib/services/branchService"
import { BranchTransfer, Branch, ProductStock } from "@/types"

interface PartnerTransferViewProps {
  partnerId: string
  branches: Branch[]
  onRefresh: () => void
}

export default function PartnerTransferView({
  partnerId,
  branches,
  onRefresh
}: PartnerTransferViewProps) {
  const [transfers, setTransfers] = useState<BranchTransfer[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // New transfer form
  const [fromBranchId, setFromBranchId] = useState<string>("")
  const [toBranchId, setToBranchId] = useState<string>("")
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [quantity, setQuantity] = useState<number>(1)
  const [notes, setNotes] = useState<string>("")
  const [availableStock, setAvailableStock] = useState<ProductStock[]>([])

  useEffect(() => {
    loadTransfers()
  }, [partnerId])

  const loadTransfers = async () => {
    setLoading(true)
    try {
      const { transfers: data } = await getTransfers({ partnerId })
      setTransfers(data)
    } catch (error) {
      console.error("Error loading transfers:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleBranchFromChange = async (branchId: string) => {
    setFromBranchId(branchId)
    if (branchId) {
      try {
        const stock = await getPartnerStock(partnerId)
        // Filter to only show stock from this branch
        const branchStock = stock.filter(s =>
          s.branchId === branchId || s.branches?.some(b => b.branchId === branchId)
        )
        setAvailableStock(branchStock)
      } catch (error) {
        console.error("Error loading stock:", error)
      }
    }
  }

  const handleCreateTransfer = async () => {
    if (!fromBranchId || !toBranchId || !selectedProductId || quantity <= 0) {
      return
    }

    if (fromBranchId === toBranchId) {
      alert("La sucursal origen y destino no pueden ser la misma")
      return
    }

    setCreating(true)
    try {
      await createTransfer({
        partnerId,
        fromBranchId,
        toBranchId,
        items: [
          {
            productId: selectedProductId,
            quantity,
          },
        ],
        notes,
      })

      setShowCreateDialog(false)
      // Reset form
      setFromBranchId("")
      setToBranchId("")
      setSelectedProductId("")
      setQuantity(1)
      setNotes("")
      setAvailableStock([])

      onRefresh()
      await loadTransfers()
    } catch (error) {
      console.error("Error creating transfer:", error)
      alert("Error al crear la transferencia")
    } finally {
      setCreating(false)
    }
  }

  const handleApprove = async (transferId: string) => {
    try {
      await approveTransfer(transferId, "current-user") // TODO: use actual user ID
      onRefresh()
      await loadTransfers()
    } catch (error) {
      console.error("Error approving transfer:", error)
    }
  }

  const handleReceive = async (transferId: string) => {
    try {
      await receiveTransfer(transferId, "current-user") // TODO: use actual user ID
      onRefresh()
      await loadTransfers()
    } catch (error) {
      console.error("Error receiving transfer:", error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pendiente</Badge>
      case "approved":
        return <Badge variant="default">Aprobada</Badge>
      case "in_transit":
        return <Badge className="bg-blue-100 text-blue-800">En tránsito</Badge>
      case "received":
        return <Badge className="bg-green-100 text-green-800">Recibida</Badge>
      case "cancelled":
        return <Badge variant="destructive">Cancelada</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getBranchName = (branchId?: string) => {
    return branches.find(b => b.id === branchId)?.name || branchId || "-"
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                Transferencias entre Sucursales
              </CardTitle>
              <CardDescription>
                Mueve mercancía entre tus sucursales
              </CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Transferencia
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Transferencia</DialogTitle>
                  <DialogDescription>
                    Selecciona las sucursales y los productos a transferir
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Origen</Label>
                      <Select value={fromBranchId} onValueChange={handleBranchFromChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona origen" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map(branch => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name} {branch.isMain && "(Principal)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Destino</Label>
                      <Select value={toBranchId} onValueChange={setToBranchId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona destino" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map(branch => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name} {branch.isMain && "(Principal)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {fromBranchId && (
                    <div className="space-y-2">
                      <Label>Producto</Label>
                      <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStock
                            .filter(s => (s.available || 0) > 0)
                            .map(item => (
                              <SelectItem key={item.productId} value={item.productId}>
                                {item.product?.name || "Producto"} - {item.available} disponibles
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Cantidad</Label>
                    <Input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notas (opcional)</Label>
                    <Input
                      placeholder="Motivo de la transferencia..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateTransfer}
                    disabled={creating || !fromBranchId || !toBranchId || !selectedProductId}
                  >
                    {creating ? "Creando..." : "Crear Transferencia"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Transfers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transferencias</CardTitle>
          <CardDescription>
            Historial de transferencias entre tus sucursales
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay transferencias registradas
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-medium">
                      {transfer.transferNumber}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Store className="h-3 w-3 text-muted-foreground" />
                        {getBranchName(transfer.fromBranchId)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Store className="h-3 w-3 text-muted-foreground" />
                        {getBranchName(transfer.toBranchId)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3 text-muted-foreground" />
                        {transfer.items.length} productos
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(transfer.status)}
                    </TableCell>
                    <TableCell>
                      {new Date(transfer.requestedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {transfer.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApprove(transfer.id)}
                        >
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      {transfer.status === "approved" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReceive(transfer.id)}
                        >
                          <Package className="h-4 w-4 text-blue-600" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
