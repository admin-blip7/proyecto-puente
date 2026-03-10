"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Store, Package, Edit } from "lucide-react"
import { getPartnerStock, getBranchStock } from "@/lib/services/branchService"
import { ProductStock, Branch } from "@/types"

interface PartnerStockViewProps {
  partnerId: string
  selectedBranch: string | null
  branches: Branch[]
  onRefresh: () => void
}

export default function PartnerStockView({
  partnerId,
  selectedBranch,
  branches,
  onRefresh
}: PartnerStockViewProps) {
  const [stock, setStock] = useState<ProductStock[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    loadStock()
  }, [partnerId, selectedBranch])

  const loadStock = async () => {
    setLoading(true)
    try {
      let data: ProductStock[]
      if (selectedBranch) {
        // Stock de sucursal específica
        data = await getBranchStock(selectedBranch)
      } else {
        // Stock consolidado agrupado por producto (incluye desglose por sucursales)
        data = await getPartnerStock(partnerId)
      }
      setStock(data)
    } catch (error) {
      console.error("Error loading stock:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredStock = stock.filter(item => {
    const matchesSearch =
      !searchTerm ||
      item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product?.sku?.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  const getBranchName = (branchId: string) => {
    return branches.find(b => b.id === branchId)?.name || "Desconocida"
  }

  const totalValue = filteredStock.reduce((sum, item) => {
    return sum + (item.available || 0) * (item.product?.price || 0)
  }, 0)

  return (
    <div className="space-y-6">
      {/* Search and Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Valor total: <span className="font-bold text-foreground">${totalValue.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {selectedBranch ? `Stock: ${getBranchName(selectedBranch)}` : "Stock Consolidado"}
          </CardTitle>
          <CardDescription>
            {selectedBranch
              ? "Inventario de esta sucursal"
              : "Sumatoria de todas tus sucursales"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : filteredStock.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No hay resultados" : "No hay productos en inventario"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  {!selectedBranch && <TableHead>Sucursales</TableHead>}
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStock.map((item) => {
                  const value = (item.available || 0) * (item.product?.price || 0)

                  return (
                    <TableRow key={item.id || `${item.productId}-${item.branchId}`}>
                      <TableCell className="font-medium">
                        {item.product?.name || "Producto sin nombre"}
                      </TableCell>
                      <TableCell>{item.product?.sku || "-"}</TableCell>
                      {!selectedBranch && (
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {item.branches?.map((b) => (
                              <Badge key={b.branchId} variant="outline" className="text-xs">
                                <Store className="mr-1 h-3 w-3" />
                                {b.branchName || b.branchId}: {b.available}
                              </Badge>
                            )) || (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <Badge variant={item.available > 10 ? "default" : "secondary"}>
                          {item.available} unidades
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        ${(item.product?.price || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${value.toLocaleString()}
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
