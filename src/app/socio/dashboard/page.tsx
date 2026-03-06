"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/hooks"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Building2,
  Package,
  ArrowRightLeft,
  Users,
  TrendingUp,
  DollarSign,
  Store,
  ArrowLeft
} from "lucide-react"
import {
  getPartnerBranches,
  getPartnerStock,
  getPartnerStats,
} from "@/lib/services/branchService"
import { getPartnerById } from "@/lib/services/partnerService"
import { getPendingTransfers } from "@/lib/services/branchTransferService"
import { Branch, ProductStock, BranchTransfer, PartnerStats, Partner } from "@/types"
import PartnerStockView from "@/components/socio/PartnerStockView"
import PartnerTransferView from "@/components/socio/PartnerTransferView"
import CommunityView from "@/components/socio/CommunityView"
import PartnerBranchesManager from "@/components/admin/partners/PartnerBranchesManager"

export default function SocioDashboardPage() {
  const { userProfile, loading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null)
  const [deliveryRouteId, setDeliveryRouteId] = useState("")

  // Datos
  const [branches, setBranches] = useState<Branch[]>([])
  const [stock, setStock] = useState<ProductStock[]>([])
  const [transfers, setTransfers] = useState<BranchTransfer[]>([])
  const [stats, setStats] = useState<PartnerStats | null>(null)
  const [partner, setPartner] = useState<Partner | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!loading && userProfile) {
      if (userProfile.role !== "Socio") {
        router.push("/login")
        return
      }
      if (!userProfile.partnerId) {
        console.error("Socio sin partner_id")
        return
      }
      loadData()
    }
  }, [loading, userProfile, router])

  const loadData = async () => {
    if (!userProfile?.partnerId) return

    setLoadingData(true)
    try {
      const [branchesData, stockData, transfersData, statsData, partnerData] = await Promise.all([
        getPartnerBranches(userProfile.partnerId),
        getPartnerStock(userProfile.partnerId),
        getPendingTransfers(userProfile.partnerId),
        getPartnerStats(userProfile.partnerId),
        getPartnerById(userProfile.partnerId),
      ])

      setBranches(branchesData)
      setStock(stockData)
      setTransfers(transfersData.transfers)
      setStats(statsData)
      setPartner(partnerData)

      // Consolidado por defecto para visibilidad global; la selección manual filtra por sucursal
      setSelectedBranch(null)
    } catch (error) {
      const errorData =
        error && typeof error === "object"
          ? {
            message: (error as any).message ?? "Error desconocido",
            code: (error as any).code ?? null,
            details: (error as any).details ?? null,
            hint: (error as any).hint ?? null,
            status: (error as any).status ?? null,
          }
          : { message: String(error) }

      console.error("Error loading data (socio dashboard):", errorData)
    } finally {
      setLoadingData(false)
    }
  }

  const handleBranchChange = (branchId: string) => {
    setSelectedBranch(branchId)
  }

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
          <div className="p-3 rounded-full bg-blue-100 text-blue-600">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Dashboard de Socio</h1>
            <p className="text-muted-foreground">
              Gestiona tu inventario y transferencias
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm">
          {stats?.partnerName || "Socio"}
        </Badge>
      </div>

      {/* Accesos rápidos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Accesos rápidos</CardTitle>
          <CardDescription>Entra rápido a las acciones más usadas del socio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {branches.length > 1 && (
              <Button onClick={() => router.push("/socio/seleccionar-sucursal")}>
                <Building2 className="mr-2 h-4 w-4" />
                Cambiar sucursal
              </Button>
            )}
            <Button variant="outline" onClick={() => setActiveTab("stock")}>
              <Package className="mr-2 h-4 w-4" />
              Ver inventario
            </Button>
            <Button variant="outline" onClick={() => setActiveTab("transfers")}>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Ver transferencias
            </Button>
            <Button variant="outline" onClick={() => setActiveTab("branches")}>
              <Building2 className="mr-2 h-4 w-4" />
              Gestionar sucursales
            </Button>
            <Button variant="outline" onClick={() => router.push("/pos")}>
              <Store className="mr-2 h-4 w-4" />
              Abrir POS
            </Button>
            <Button variant="outline" onClick={() => router.push("/admin/delivery/routes")}>
              <Package className="mr-2 h-4 w-4" />
              Rutas y entregas
            </Button>
            <Button variant="outline" onClick={() => router.push("/admin/delivery/reports")}>
              <TrendingUp className="mr-2 h-4 w-4" />
              Reportes de entregas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logística de entregas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Logística de entregas</CardTitle>
          <CardDescription>
            Accede a todas las páginas de rutas desde este dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => router.push("/admin/delivery/routes")}>
              <Package className="mr-2 h-4 w-4" />
              Dashboard de rutas
            </Button>
            <Button variant="outline" onClick={() => router.push("/admin/delivery/reports")}>
              <TrendingUp className="mr-2 h-4 w-4" />
              Reportes
            </Button>
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            <input
              value={deliveryRouteId}
              onChange={(e) => setDeliveryRouteId(e.target.value)}
              placeholder="Pega aquí el routeId (UUID) para ir directo"
              className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Button
              variant="outline"
              onClick={() => {
                if (!deliveryRouteId.trim()) return
                router.push(`/admin/delivery/route/${deliveryRouteId.trim()}`)
              }}
            >
              Ir a detalle de ruta
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!deliveryRouteId.trim()) return
                router.push(`/mobile/delivery/${deliveryRouteId.trim()}`)
              }}
            >
              Ir a vista móvil
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Flujo recomendado: primero entra a “Dashboard de rutas”, copia el ID de ruta y usa estos accesos directos para detalle o móvil.
          </p>
        </CardContent>
      </Card>

      {/* Branch Selector */}
      {branches.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Selecciona Sucursal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {branches.map(branch => (
                <Button
                  key={branch.id}
                  variant={selectedBranch === branch.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleBranchChange(branch.id)}
                >
                  <Store className="mr-2 h-4 w-4" />
                  {branch.name}
                  {branch.isMain && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Principal
                    </Badge>
                  )}
                </Button>
              ))}
              <Button
                variant={selectedBranch === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedBranch(null)}
              >
                <Package className="mr-2 h-4 w-4" />
                Consolidado
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sucursales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{branches.length}</div>
            <p className="text-xs text-muted-foreground">Activas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stock.length}</div>
            <p className="text-xs text-muted-foreground">En inventario</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Stock Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stock.reduce((sum, s) => sum + (s.available || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Unidades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Transferencias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transfers.length}</div>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-xl grid-cols-5">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="stock">Inventario</TabsTrigger>
          <TabsTrigger value="transfers">Transferencias</TabsTrigger>
          <TabsTrigger value="community">Comunidad</TabsTrigger>
          <TabsTrigger value="branches">Sucursales</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stock por Sucursal */}
            <Card>
              <CardHeader>
                <CardTitle>Stock por Sucursal</CardTitle>
                <CardDescription>Distribución de tu inventario</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {branches.map(branch => {
                    const branchStockCount = stock.filter((s) =>
                      (s.branches || []).some((b) => b.branchId === branch.id && b.available > 0)
                    ).length

                    return (
                      <div key={branch.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{branch.name}</span>
                          {branch.isMain && (
                            <Badge variant="secondary" className="text-xs">
                              Principal
                            </Badge>
                          )}
                        </div>
                        <span className="text-muted-foreground">
                          {branchStockCount} productos
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Transferencias Recientes */}
            <Card>
              <CardHeader>
                <CardTitle>Transferencias Pendientes</CardTitle>
                <CardDescription>Solicitudes que requieren atención</CardDescription>
              </CardHeader>
              <CardContent>
                {transfers.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4">
                    No hay transferencias pendientes
                  </p>
                ) : (
                  <div className="space-y-3">
                    {transfers.slice(0, 5).map(transfer => (
                      <div key={transfer.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">{transfer.transferNumber}</span>
                          <p className="text-muted-foreground">
                            {transfer.items.length} productos
                          </p>
                        </div>
                        <Badge variant={
                          transfer.status === "pending" ? "secondary" :
                            transfer.status === "approved" ? "default" :
                              "outline"
                        }>
                          {transfer.status === "pending" ? "Pendiente" :
                            transfer.status === "approved" ? "Aprobada" :
                              transfer.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stock" className="mt-6">
          <PartnerStockView
            partnerId={userProfile?.partnerId || ""}
            selectedBranch={selectedBranch}
            branches={branches}
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="transfers" className="mt-6">
          <PartnerTransferView
            partnerId={userProfile?.partnerId || ""}
            branches={branches}
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="community" className="mt-6">
          <CommunityView
            partnerId={userProfile?.partnerId || ""}
            selectedBranch={selectedBranch}
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="branches" className="mt-6">
          {partner ? (
            <PartnerBranchesManager
              partner={partner}
              onBranchesUpdated={loadData}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Sucursales</CardTitle>
                <CardDescription>No se pudo cargar la información del socio.</CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
