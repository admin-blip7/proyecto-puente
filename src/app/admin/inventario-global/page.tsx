"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Package,
  TrendingUp,
  DollarSign,
  Building2,
  Users,
  BarChart3,
  ArrowLeft,
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw
} from "lucide-react"
import { getGlobalInventoryStats, getProductsByCreator, getPartnerCreationStats } from "@/lib/services/globalInventoryService"
import { GlobalInventoryStats, ProductAuditLog } from "@/types"
import { getPartners } from "@/lib/services/partnerService"
import { getProductAuditHistory } from "@/lib/services/productAuditService"
import { getPartnerStats } from "@/lib/services/branchService"

export default function GlobalInventoryPage() {
  const { userProfile, loading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedPartner, setSelectedPartner] = useState<string>("all")

  // Datos
  const [stats, setStats] = useState<GlobalInventoryStats | null>(null)
  const [partners, setPartners] = useState<Array<{ id: string; name: string }>>([])
  const [partnerStats, setPartnerStats] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Búsqueda
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (!loading && userProfile) {
      // Verificar si es Master Admin
      const isMasterAdmin = userProfile.role === "Admin" && !userProfile.partnerId
      if (!isMasterAdmin) {
        router.push("/admin")
        return
      }
      loadData()
    }
  }, [loading, userProfile, router])

  const loadData = async () => {
    setLoadingData(true)
    try {
      const [statsData, partnersData, partnerStatsData] = await Promise.all([
        getGlobalInventoryStats(),
        getPartners(true),
        getPartnerCreationStats(),
      ])

      setStats(statsData)
      setPartners([{ id: "master", name: "Master Admin" }, ...partnersData.map(p => ({ id: p.id, name: p.name }))])
      setPartnerStats(partnerStatsData)
    } catch (error) {
      console.error("Error loading global inventory:", error)
    } finally {
      setLoadingData(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const filteredPartnerStats = partnerStats.filter(ps =>
    selectedPartner === "all" || ps.partnerId === selectedPartner
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
          <div className="p-3 rounded-full bg-purple-100 text-purple-600">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Inventario Global</h1>
            <p className="text-muted-foreground">
              Vista maestra de todos los productos y socios
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar producto, SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedPartner} onValueChange={setSelectedPartner}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por socio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los socios</SelectItem>
                <SelectItem value="master">Solo Master Admin</SelectItem>
                {partners.filter(p => p.id !== "master").map(partner => (
                  <SelectItem key={partner.id} value={partner.id}>
                    {partner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Productos Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProducts.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Únicos en el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Stock Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalStock.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Unidades disponibles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Valor Inventario</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats?.totalValue.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">Valor total aproximado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Socios Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.byPartner.length || 0}</div>
            <p className="text-xs text-muted-foreground">Con inventario</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Categorías</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.byCategory.length || 0}</div>
            <p className="text-xs text-muted-foreground">Diferentes categorías</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="partners">Por Socio</TabsTrigger>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="audit">Auditoría</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Top Socios por Valor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Inventario por Socio
              </CardTitle>
              <CardDescription>Valor de inventario por socio (Top 10)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.byPartner.slice(0, 10).map((partnerStat, index) => {
                  const maxStock = Math.max(...stats.byPartner.map(s => s.value))
                  const percentage = (partnerStat.value / maxStock) * 100

                  return (
                    <div key={partnerStat.partnerId} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{index + 1}. {partnerStat.partnerName}</span>
                          <Badge variant="outline" className="text-xs">
                            {partnerStat.productCount} productos
                          </Badge>
                        </div>
                        <div className="text-right">
                          <span className="font-bold">${partnerStat.value.toLocaleString()}</span>
                          <span className="text-muted-foreground ml-2">
                            ({partnerStat.stockCount} unidades)
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Master vs Socios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Inventario Master Admin</CardTitle>
                <CardDescription>Productos propios del sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Productos:</span>
                    <span className="font-bold">{stats?.masterProducts || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Stock:</span>
                    <span className="font-bold">{stats?.masterStock || 0} unidades</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Valor:</span>
                    <span className="font-bold text-green-600">
                      ${stats?.masterValue?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventario de Socios</CardTitle>
                <CardDescription>Consolidado de todos los socios</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Productos:</span>
                    <span className="font-bold">
                      {(stats?.totalProducts || 0) - (stats?.masterProducts || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Stock:</span>
                    <span className="font-bold">
                      {(stats?.totalStock || 0) - (stats?.masterStock || 0)} unidades
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Valor:</span>
                    <span className="font-bold text-blue-600">
                      ${((stats?.totalValue || 0) - (stats?.masterValue || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Por Categoría */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Distribución por Categoría
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats?.byCategory.map(cat => (
                  <div key={cat.category} className="p-4 border rounded-lg">
                    <div className="font-medium">{cat.category}</div>
                    <div className="text-sm text-muted-foreground">
                      {cat.productCount} productos
                    </div>
                    <div className="text-sm font-bold text-green-600">
                      ${cat.value.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="partners" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas de Creación por Socio</CardTitle>
              <CardDescription>Productos creados por cada socio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredPartnerStats.map((stat, index) => (
                  <div key={stat.partnerId} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{stat.partnerName}</div>
                        <div className="text-xs text-muted-foreground">
                          Último producto: {stat.lastProductCreatedAt?.toLocaleDateString() || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {stat.productCount}
                    </Badge>
                  </div>
                ))}
                {filteredPartnerStats.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay datos disponibles
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Listado de Productos</CardTitle>
              <CardDescription>Vista detallada de todos los productos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>El listado completo de productos estará disponible en la próxima actualización.</p>
                <p className="text-sm mt-2">Por ahora, utiliza el filtro de búsqueda en la página principal de inventario.</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push("/admin")}
                >
                  Ir a Inventario Principal
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Auditoría de Productos
              </CardTitle>
              <CardDescription>Rastrea creadores y cambios de productos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  <p>Selecciona un socio para ver los productos creados por sus usuarios.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {partners.filter(p => p.id !== "master").map(partner => (
                    <Button
                      key={partner.id}
                      variant="outline"
                      className="h-20 flex-col"
                      onClick={() => router.push(`/admin/auditoria-productos?partnerId=${partner.id}`)}
                    >
                      <Building2 className="h-5 w-5 mb-1" />
                      <span className="font-medium">{partner.name}</span>
                      <span className="text-xs text-muted-foreground">Ver auditoría</span>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
