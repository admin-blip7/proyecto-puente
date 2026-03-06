"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Users, Search, Store, Package, Hand } from "lucide-react"
import {
  getCommunities,
  getCommunityStock,
  reserveFromCommunity
} from "@/lib/services/communityService"
import { Community } from "@/types"

interface CommunityViewProps {
  partnerId: string
  selectedBranch: string | null
  onRefresh: () => void
}

interface CommunityStockItem {
  branchId: string
  branchName: string
  partnerId: string
  partnerName: string
  productId: string
  productName: string
  available: number
}

export default function CommunityView({
  partnerId,
  selectedBranch,
  onRefresh
}: CommunityViewProps) {
  const [communities, setCommunities] = useState<Community[]>([])
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null)
  const [communityStock, setCommunityStock] = useState<CommunityStockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [reserving, setReserving] = useState(false)

  // Reserve dialog
  const [showReserveDialog, setShowReserveDialog] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<CommunityStockItem | null>(null)
  const [reserveQuantity, setReserveQuantity] = useState<number>(1)

  useEffect(() => {
    loadCommunities()
  }, [])

  useEffect(() => {
    if (selectedCommunity) {
      loadCommunityStock()
    }
  }, [selectedCommunity])

  const loadCommunities = async () => {
    setLoading(true)
    try {
      const data = await getCommunities()
      // Filter to communities where this partner participates
      const partnerCommunities = data.filter(c =>
        !c.partners || c.partners.length === 0 || c.partners.includes(partnerId)
      )
      setCommunities(partnerCommunities)
      if (partnerCommunities.length > 0) {
        setSelectedCommunity(partnerCommunities[0].id)
      }
    } catch (error) {
      console.error("Error loading communities:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadCommunityStock = async () => {
    if (!selectedCommunity) return

    try {
      const data = await getCommunityStock(selectedCommunity)
      // Filter out stock from current partner (show only others)
      const otherStock = data.filter(item => item.partnerId !== partnerId)
      setCommunityStock(otherStock)
    } catch (error) {
      console.error("Error loading community stock:", error)
    }
  }

  const handleReserve = async () => {
    if (!selectedProduct || !selectedBranch || reserveQuantity <= 0) {
      return
    }

    if (reserveQuantity > selectedProduct.available) {
      alert("Cantidad no disponible")
      return
    }

    setReserving(true)
    try {
      const result = await reserveFromCommunity(
        selectedCommunity!,
        selectedProduct.productId,
        reserveQuantity,
        selectedBranch
      )

      if (result.success) {
        alert(result.message || "Reserva creada exitosamente")
        setShowReserveDialog(false)
        onRefresh()
        await loadCommunityStock()
      } else {
        alert(result.message || "Error al crear reserva")
      }
    } catch (error) {
      console.error("Error reserving from community:", error)
      alert("Error al crear reserva")
    } finally {
      setReserving(false)
    }
  }

  const openReserveDialog = (item: CommunityStockItem) => {
    if (!selectedBranch) {
      alert("Selecciona una sucursal destino primero")
      return
    }
    setSelectedProduct(item)
    setReserveQuantity(1)
    setShowReserveDialog(true)
  }

  const selectedCommunityData = communities.find(c => c.id === selectedCommunity)

  const filteredStock = communityStock.filter(item => {
    const matchesSearch =
      !searchTerm ||
      item.productName?.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Community Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Comunidad de Stock
          </CardTitle>
          <CardDescription>
            Visualiza y reserva stock de otros socios de la comunidad
          </CardDescription>
        </CardHeader>
        <CardContent>
          {communities.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No participas en ninguna comunidad activa.
            </p>
          ) : (
            <div className="flex items-center gap-4">
              <Label>Comunidad:</Label>
              <Select value={selectedCommunity || ""} onValueChange={setSelectedCommunity}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Selecciona comunidad" />
                </SelectTrigger>
                <SelectContent>
                  {communities.map(community => (
                    <SelectItem key={community.id} value={community.id}>
                      {community.name}
                      {community.description && ` - ${community.description}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCommunityData && (
                <div className="flex gap-2">
                  {selectedCommunityData.allowView && (
                    <Badge variant="outline">Ver</Badge>
                  )}
                  {selectedCommunityData.allowReserve && (
                    <Badge variant="outline">Reservar</Badge>
                  )}
                  {selectedCommunityData.allowSell && (
                    <Badge variant="outline">Vender</Badge>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Table */}
      {selectedCommunity && (
        <Card>
          <CardHeader>
            <CardTitle>Stock Disponible en Comunidad</CardTitle>
            <CardDescription>
              Productos disponibles de otros socios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar producto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : !selectedCommunityData?.allowReserve ? (
              <div className="text-center py-8 text-muted-foreground">
                Esta comunidad no permite reservas de stock.
              </div>
            ) : filteredStock.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No hay resultados" : "No hay stock disponible en la comunidad"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Socio</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead className="text-right">Disponible</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStock.map((item, idx) => (
                    <TableRow key={`${item.branchId}-${item.productId}-${idx}`}>
                      <TableCell className="font-medium">
                        {item.productName}
                      </TableCell>
                      <TableCell>{item.partnerName || "Socio"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Store className="h-3 w-3 text-muted-foreground" />
                          {item.branchName}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={item.available > 10 ? "default" : "secondary"}>
                          {item.available} unidades
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {selectedCommunityData?.allowReserve && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openReserveDialog(item)}
                          >
                            <Hand className="mr-2 h-4 w-4" />
                            Reservar
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
      )}

      {/* Reserve Dialog */}
      <Dialog open={showReserveDialog} onOpenChange={setShowReserveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reservar de Comunidad</DialogTitle>
            <DialogDescription>
              Reserva stock de otro socio para tu sucursal
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Producto</p>
                <p className="font-medium">{selectedProduct.productName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Socio</p>
                  <p>{selectedProduct.partnerName || "Socio"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sucursal</p>
                  <p>{selectedProduct.branchName}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Disponible</p>
                <p className="font-medium">{selectedProduct.available} unidades</p>
              </div>
              <div>
                <Label>Cantidad a reservar</Label>
                <Input
                  type="number"
                  min={1}
                  max={selectedProduct.available}
                  value={reserveQuantity}
                  onChange={(e) => setReserveQuantity(Number(e.target.value))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReserveDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReserve}
              disabled={reserving || !selectedProduct || reserveQuantity <= 0}
            >
              {reserving ? "Reservando..." : "Confirmar Reserva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
