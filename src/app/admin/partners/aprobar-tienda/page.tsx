"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/hooks"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { ArrowLeft, CheckCircle, XCircle, Store, Search, Filter } from "lucide-react"
import {
  getPendingStoreApproval,
  getApprovedStoreStock,
  bulkApproveStoreStock,
  bulkDisapproveStoreStock
} from "@/lib/services/branchService"
import { BranchStockWithProduct } from "@/types"

export default function StoreApprovalPage() {
  const { userProfile, loading } = useAuth()
  const router = useRouter()
  const [pendingStock, setPendingStock] = useState<BranchStockWithProduct[]>([])
  const [approvedStock, setApprovedStock] = useState<BranchStockWithProduct[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [showApproved, setShowApproved] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [partnerFilter, setPartnerFilter] = useState<string>("")

  useEffect(() => {
    if (!loading && userProfile) {
      loadData()
    }
  }, [loading, userProfile, showApproved])

  const loadData = async () => {
    setLoadingData(true)
    try {
      if (showApproved) {
        const data = await getApprovedStoreStock()
        setApprovedStock(data)
      } else {
        const data = await getPendingStoreApproval()
        setPendingStock(data)
      }
    } catch (error) {
      console.error("Error loading stock:", error)
    } finally {
      setLoadingData(false)
    }
  }

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleSelectAll = () => {
    const currentList = showApproved ? approvedStock : pendingStock
    const allIds = new Set(currentList.map(item => item.id))
    setSelectedIds(allIds)
  }

  const handleClearSelection = () => {
    setSelectedIds(new Set())
  }

  const handleApproveSelected = async () => {
    if (selectedIds.size === 0) return

    setProcessing(true)
    try {
      const items = Array.from(selectedIds).map(id => {
        const item = [...pendingStock, ...approvedStock].find(s => s.id === id)
        return {
          branchId: item!.branchId,
          productId: item!.productId,
        }
      })

      const adminId = userProfile?.uid || ""
      await bulkApproveStoreStock(items, adminId)

      setSelectedIds(new Set())
      loadData()
    } catch (error) {
      console.error("Error approving stock:", error)
    } finally {
      setProcessing(false)
    }
  }

  const handleDisapproveSelected = async () => {
    if (selectedIds.size === 0) return

    if (!confirm("¿Desaprobar el stock seleccionado? Ya no aparecerá en la tienda online.")) return

    setProcessing(true)
    try {
      const items = Array.from(selectedIds).map(id => {
        const item = [...pendingStock, ...approvedStock].find(s => s.id === id)
        return {
          branchId: item!.branchId,
          productId: item!.productId,
        }
      })

      await bulkDisapproveStoreStock(items)

      setSelectedIds(new Set())
      loadData()
    } catch (error) {
      console.error("Error disapproving stock:", error)
    } finally {
      setProcessing(false)
    }
  }

  const handleApprove = async (branchId: string, productId: string) => {
    setProcessing(true)
    try {
      const adminId = userProfile?.uid || ""
      await bulkApproveStoreStock([{ branchId, productId }], adminId)
      loadData()
    } catch (error) {
      console.error("Error approving stock:", error)
    } finally {
      setProcessing(false)
    }
  }

  const handleDisapprove = async (branchId: string, productId: string) => {
    setProcessing(true)
    try {
      await bulkDisapproveStoreStock([{ branchId, productId }])
      loadData()
    } catch (error) {
      console.error("Error disapproving stock:", error)
    } finally {
      setProcessing(false)
    }
  }

  // Filtrar datos
  const currentList = showApproved ? approvedStock : pendingStock
  const filteredList = currentList.filter(item => {
    const matchesSearch =
      !searchTerm ||
      item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product?.sku?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesPartner = !partnerFilter || item.partner?.id === partnerFilter

    return matchesSearch && matchesPartner
  })

  // Obtener partners únicos para filtro
  const partners = currentList.reduce<Array<NonNullable<BranchStockWithProduct['partner']>>>((acc, item) => {
    const partner = item.partner
    if (!partner) return acc
    if (!acc.some((existing) => existing.id === partner.id)) {
      acc.push(partner)
    }
    return acc
  }, [])

  const allSelected = filteredList.length > 0 && filteredList.every(item => selectedIds.has(item.id))

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/admin/partners")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Socios
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {showApproved ? "Stock Aprobado para Tienda Online" : "Stock Pendiente de Aprobación"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {showApproved
                ? "Productos de socios que actualmente se muestran en /tienda"
                : "Productos de socios esperando tu aprobación para aparecer en la tienda online"}
            </p>
          </div>
        </div>
      </div>

      {/* Toggle Tabs */}
      <div className="flex items-center gap-2">
        <Button
          variant={!showApproved ? "default" : "outline"}
          onClick={() => { setShowApproved(false); setSelectedIds(new Set()) }}
        >
          Pendientes ({pendingStock.length})
        </Button>
        <Button
          variant={showApproved ? "default" : "outline"}
          onClick={() => { setShowApproved(true); setSelectedIds(new Set()) }}
        >
          Aprobados ({approvedStock.length})
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <select
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={partnerFilter}
              onChange={(e) => setPartnerFilter(e.target.value)}
            >
              <option value="">Todos los socios</option>
              {partners.map(partner => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Actions Bar */}
      {selectedIds.size > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {selectedIds.size} productos seleccionados
              </p>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleApproveSelected}
                  disabled={processing}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Aprobar Seleccionados
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDisapproveSelected}
                  disabled={processing}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Rechazar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearSelection}
                  disabled={processing}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {showApproved ? "Stock Aprobado" : "Stock Pendiente"}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                disabled={filteredList.length === 0}
              />
              <span className="text-sm text-muted-foreground">
                Seleccionar todos
              </span>
            </div>
          </div>
          <CardDescription>
            {showApproved
              ? "Estos productos actualmente aparecen en la tienda online (/tienda)"
              : "Estos productos NO aparecen en la tienda online hasta que los aprobés"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingData ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-12">
              <Store className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">
                {showApproved ? "No hay stock aprobado" : "No hay stock pendiente de aprobación"}
              </h3>
              <p className="text-muted-foreground mt-2">
                {showApproved
                  ? "Aproveba el stock de los socios para que aparezca en la tienda"
                  : "Todos los productos pendientes han sido procesados"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Sel</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Socio</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredList.map((item) => {
                  const isSelected = selectedIds.has(item.id)
                  return (
                    <TableRow
                      key={item.id}
                      className={isSelected ? "bg-muted/50" : undefined}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleSelect(item.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.product?.name || "Producto sin nombre"}
                      </TableCell>
                      <TableCell>{item.product?.sku || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.partner?.name || "Socio"}</Badge>
                      </TableCell>
                      <TableCell>{item.branch?.name || "Sucursal"}</TableCell>
                      <TableCell>
                        <Badge variant={item.available > 10 ? "default" : "secondary"}>
                          {item.available} unidades
                        </Badge>
                      </TableCell>
                      <TableCell>
                        ${item.product?.price?.toFixed(2) || item.priceOverride?.toFixed(2) || "-"}
                      </TableCell>
                      <TableCell>
                        {showApproved ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                            <CheckCircle className="inline h-3 w-3 mr-1" />
                            Aprobado
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Pendiente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {showApproved ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDisapprove(item.branchId, item.productId)}
                            disabled={processing}
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApprove(item.branchId, item.productId)}
                            disabled={processing}
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
