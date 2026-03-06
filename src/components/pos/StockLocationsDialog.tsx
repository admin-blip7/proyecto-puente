"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Building2, Globe, Package, Store } from "lucide-react"
import { getStockAcrossBranches } from "@/lib/services/branchService"
import { getGlobalCommunityStock } from "@/lib/services/communityService"
import { useAuth } from "@/lib/hooks"
import { formatCurrency } from "@/lib/utils"

interface StockLocationsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string
  productName: string
}

interface BranchStockItem {
  branchId: string
  branchName: string
  available: number
  price: number
  isCurrentBranch?: boolean
}

interface CommunityStockItem {
  branchId: string
  branchName: string
  partnerId: string
  partnerName: string
  productId: string
  price: number
  available: number
  shareType: 'price_only' | 'full'
}

export function StockLocationsDialog({
  open,
  onOpenChange,
  productId,
  productName,
}: StockLocationsDialogProps) {
  const { userProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [branchStock, setBranchStock] = useState<BranchStockItem[]>([])
  const [communityStock, setCommunityStock] = useState<CommunityStockItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && productId) {
      loadStockData()
    }
  }, [open, productId])

  const loadStockData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Load stock from partner's other branches
      if (userProfile?.partnerId) {
        const branchesData = await getStockAcrossBranches(userProfile.partnerId, productId)

        // Get current branch from context
        const currentBranchId = userProfile.selectedBranchId

        // Format data and mark current branch
        const formattedBranchStock: BranchStockItem[] = branchesData.map(item => {
          const product = item as any
          return {
            branchId: item.branchId,
            branchName: item.branch?.name || item.branchId,
            available: item.available,
            price: item.priceOverride || product?.product?.price || 0,
            isCurrentBranch: item.branchId === currentBranchId,
          }
        })

        setBranchStock(formattedBranchStock)
      }

      // Load GLOBAL community stock from all enabled partners
      const globalStock = await getGlobalCommunityStock(productId)

      // Filter out current partner's stock
      const formattedCommunityStock: CommunityStockItem[] = globalStock
        .filter(item => item.partnerId !== userProfile?.partnerId)
        .map(item => ({
          branchId: item.branchId,
          branchName: item.branchName,
          partnerId: item.partnerId,
          partnerName: item.partnerName,
          productId: item.productId,
          price: item.price,
          available: item.available,
          shareType: item.shareType,
        }))

      setCommunityStock(formattedCommunityStock)
    } catch (err) {
      console.error("Error loading stock data:", err)
      setError("Error al cargar las existencias")
    } finally {
      setLoading(false)
    }
  }

  const totalBranchStock = branchStock.reduce((sum, item) => sum + item.available, 0)
  const totalCommunityStock = communityStock.reduce((sum, item) => sum + item.available, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Existencias: {productName}
          </DialogTitle>
          <DialogDescription>
            Stock disponible en otras sucursales y mercado interno de socios
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 space-y-4 p-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <div className="p-4 text-center text-muted-foreground">
            {error}
          </div>
        ) : (
          <Tabs defaultValue="branches" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="branches" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Mis Sucursales
                {totalBranchStock > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {totalBranchStock}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="community" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Mercado Interno
                {totalCommunityStock > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {totalCommunityStock}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto mt-4">
              {/* Mis Sucursales Tab */}
              <TabsContent value="branches" className="mt-0 m-0">
                {branchStock.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay stock disponible en otras sucursales
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sucursal</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-right">Disponible</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branchStock.map((item) => (
                        <TableRow key={item.branchId}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Store className="w-4 h-4 text-muted-foreground" />
                              {item.branchName}
                              {item.isCurrentBranch && (
                                <Badge variant="outline" className="text-xs">
                                  Actual
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              {formatCurrency(item.price)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={item.available > 5 ? "default" : item.available > 0 ? "secondary" : "outline"}
                              className={item.available === 0 ? "opacity-50" : ""}
                            >
                              {item.available} unidades
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              {/* Mercado Interno Tab */}
              <TabsContent value="community" className="mt-0 m-0">
                {communityStock.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Store className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="mb-1">No hay stock disponible en el mercado interno</p>
                    <p className="text-xs">Los socios pueden habilitar compartir su inventario</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Socio / Tienda</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-right">Disponible</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {communityStock.map((item, idx) => (
                        <TableRow key={`${item.partnerId}-${item.branchId}-${idx}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                <Store className="w-4 h-4 text-blue-500" />
                                {item.partnerName}
                              </div>
                              <div className="text-xs text-muted-foreground ml-6">
                                {item.branchName}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              {formatCurrency(item.price)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={item.available > 5 ? "default" : "secondary"}
                              className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            >
                              {item.available} unidades
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
