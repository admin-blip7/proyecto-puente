"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Eye,
  ArrowLeft,
  Search,
  Download,
  Calendar,
  User,
  Building2,
  Filter,
  RefreshCw,
  ChevronRight,
  Package
} from "lucide-react"
import {
  getPartnerProductAuditLogs,
  exportProductAuditToCSV
} from "@/lib/services/productAuditService"
import { getProductsByCreator } from "@/lib/services/globalInventoryService"
import { getPartners } from "@/lib/services/partnerService"
import { ProductAuditLogWithDetails, ProductAuditAction } from "@/types"
import { formatDate } from "@/lib/utils"

const auditActionLabels: Record<ProductAuditAction, string> = {
  created: 'Creado',
  updated: 'Actualizado',
  deleted: 'Eliminado',
  price_changed: 'Cambio de Precio',
  cost_changed: 'Cambio de Costo',
  stock_changed: 'Cambio de Stock',
  ownership_transferred: 'Transferencia de Ownership',
}

const auditActionColors: Record<ProductAuditAction, string> = {
  created: 'bg-green-100 text-green-800',
  updated: 'bg-blue-100 text-blue-800',
  deleted: 'bg-red-100 text-red-800',
  price_changed: 'bg-yellow-100 text-yellow-800',
  cost_changed: 'bg-orange-100 text-orange-800',
  stock_changed: 'bg-purple-100 text-purple-800',
  ownership_transferred: 'bg-pink-100 text-pink-800',
}

export default function ProductAuditPage() {
  const { userProfile, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const partnerIdParam = searchParams.get('partnerId')

  const [activeView, setActiveView] = useState<'products' | 'logs'>('products')
  const [selectedPartner, setSelectedPartner] = useState<string>(partnerIdParam || 'all')
  const [selectedAction, setSelectedAction] = useState<string>('all')

  // Datos
  const [partners, setPartners] = useState<Array<{ id: string; name: string }>>([])
  const [productsByCreator, setProductsByCreator] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<ProductAuditLogWithDetails[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Búsqueda
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProductId, setSelectedProductId] = useState<string>("")

  useEffect(() => {
    if (!loading && userProfile) {
      const isMasterAdmin = userProfile.role === "Admin" && !userProfile.partnerId
      if (!isMasterAdmin) {
        router.push("/admin")
        return
      }
      loadPartners()
    }
  }, [loading, userProfile, router])

  useEffect(() => {
    if (partners.length > 0) {
      loadData()
    }
  }, [selectedPartner, selectedAction, activeView])

  const loadPartners = async () => {
    try {
      const data = await getPartners(true)
      setPartners(data.map(p => ({ id: p.id, name: p.name })))
    } catch (error) {
      console.error("Error loading partners:", error)
    }
  }

  const loadData = async () => {
    setLoadingData(true)
    try {
      if (activeView === 'products') {
        const data = await getProductsByCreator({
          partnerId: selectedPartner === 'all' ? undefined : selectedPartner,
        })
        setProductsByCreator(data)
      } else {
        const data = await getPartnerProductAuditLogs(
          selectedPartner === 'all' ? '' : selectedPartner,
          {
            limit: 100,
            actions: selectedAction === 'all' ? undefined : [selectedAction as ProductAuditAction],
            productId: selectedProductId || undefined,
          }
        )
        setAuditLogs(data)
      }
    } catch (error) {
      console.error("Error loading audit data:", error)
    } finally {
      setLoadingData(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const handleExportAudit = async (productId: string, productName: string) => {
    try {
      const csv = await exportProductAuditToCSV(productId)
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `auditoria_${productName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error exporting audit:", error)
    }
  }

  const handleViewProductAudit = (productId: string, productName: string) => {
    setActiveView('logs')
    setSelectedProductId(productId)
    setSelectedPartner('all')
  }

  const filteredProducts = productsByCreator.filter(p =>
    !searchTerm ||
    p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.creatorName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredLogs = auditLogs.filter(log =>
    !searchTerm ||
    log.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.product?.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.userName?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading || loadingData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="p-3 rounded-full bg-orange-100 text-orange-600">
            <Eye className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Auditoría de Productos</h1>
            <p className="text-muted-foreground">
              Rastreo de creadores y cambios de productos
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={activeView === 'products' ? "Buscar producto, SKU, creador..." : "Buscar acción, usuario, producto..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedPartner} onValueChange={(value) => {
              setSelectedPartner(value)
              if (activeView === 'logs') setSelectedProductId('')
            }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todos los socios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los socios</SelectItem>
                {partners.map(partner => (
                  <SelectItem key={partner.id} value={partner.id}>
                    {partner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeView === 'logs' && (
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todas las acciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las acciones</SelectItem>
                  {Object.entries(auditActionLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedProductId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedProductId('')
                  setActiveView('products')
                }}
              >
                Ver todos los productos
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vista Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={activeView === 'products' ? 'default' : 'outline'}
          onClick={() => setActiveView('products')}
        >
          <Package className="mr-2 h-4 w-4" />
          Por Creador
        </Button>
        <Button
          variant={activeView === 'logs' ? 'default' : 'outline'}
          onClick={() => setActiveView('logs')}
        >
          <Calendar className="mr-2 h-4 w-4" />
          Historial de Cambios
        </Button>
      </div>

      {/* Vista de Productos por Creador */}
      {activeView === 'products' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Productos por Creador
            </CardTitle>
            <CardDescription>
              Productos creados por usuarios, agrupados por socio
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No se encontraron productos
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Creador</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Socio</TableHead>
                    <TableHead>Fecha de Creación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product, index) => (
                    <TableRow key={`${product.productId}-${index}`}>
                      <TableCell className="font-medium">{product.productName}</TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>{product.creatorName}</TableCell>
                      <TableCell>{product.creatorEmail}</TableCell>
                      <TableCell>
                        {product.partnerName ? (
                          <Badge variant="outline">{product.partnerName}</Badge>
                        ) : (
                          <Badge variant="secondary">Master Admin</Badge>
                        )}
                      </TableCell>
                      <TableCell>{product.createdAt.toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewProductAudit(product.productId, product.productName)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver historial
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vista de Historial de Cambios */}
      {activeView === 'logs' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Historial de Cambios
              {selectedProductId && (
                <Badge variant="outline" className="ml-2">
                  Producto seleccionado
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {selectedProductId
                ? "Historial completo de cambios del producto seleccionado"
                : "Últimos cambios en productos del socio seleccionado"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No se encontraron registros de auditoría
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={auditActionColors[log.action]}>
                            {auditActionLabels[log.action]}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {log.createdAt.toLocaleString()}
                          </span>
                        </div>

                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="font-medium">Producto: </span>
                            <span>{log.product?.name} ({log.product?.sku})</span>
                          </div>
                          <div>
                            <span className="font-medium">Usuario: </span>
                            <span>{log.userName || 'Sistema'} ({log.userEmail || 'N/A'})</span>
                          </div>
                          {log.partner && (
                            <div>
                              <span className="font-medium">Socio: </span>
                              <span>{log.partner.name}</span>
                            </div>
                          )}
                          {log.branch && (
                            <div>
                              <span className="font-medium">Sucursal: </span>
                              <span>{log.branch.name}</span>
                            </div>
                          )}
                          {log.reason && (
                            <div>
                              <span className="font-medium">Razón: </span>
                              <span className="text-muted-foreground">{log.reason}</span>
                            </div>
                          )}
                          {log.changes && Object.keys(log.changes).length > 0 && (
                            <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs">
                              <div className="font-medium mb-1">Cambios:</div>
                              {Object.entries(log.changes).map(([field, change]: [string, any]) => (
                                <div key={field} className="grid grid-cols-3 gap-2">
                                  <span className="font-medium">{field}:</span>
                                  <span className="text-red-600 line-through">{change.from}</span>
                                  <span className="text-green-600">{change.to}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin?search=${log.product?.sku}`)}
                        >
                          Ver producto
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
