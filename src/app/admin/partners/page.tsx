"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/hooks"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Users, Building2, Package, DollarSign, TrendingUp, CheckCircle, XCircle, Store } from "lucide-react"
import { getPartners, getAllPartnersStats } from "@/lib/services/partnerService"
import { Partner, PartnerStats } from "@/types"
import CreatePartnerDialog from "@/components/admin/partners/CreatePartnerDialog"
import PartnerDetailPanel from "@/components/admin/partners/PartnerDetailPanel"

export default function PartnersPage() {
  const { userProfile, loading } = useAuth()
  const router = useRouter()
  const [partners, setPartners] = useState<Partner[]>([])
  const [stats, setStats] = useState<PartnerStats[]>([])
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!loading && userProfile) {
      loadData()
    }
  }, [loading, userProfile])

  const loadData = async () => {
    setLoadingData(true)
    try {
      const [partnersData, statsData] = await Promise.all([
        getPartners(false),
        getAllPartnersStats(),
      ])
      setPartners(partnersData)
      setStats(statsData)
    } catch (error) {
      console.error("Error loading partners:", error)
    } finally {
      setLoadingData(false)
    }
  }

  const handlePartnerCreated = (newPartner: Partner) => {
    setPartners([...partners, newPartner])
    setShowCreateDialog(false)
    loadData() // Reload stats
  }

  const handlePartnerUpdated = () => {
    loadData()
  }

  // Calcular totales
  const totalPartners = partners.length
  const activePartners = partners.filter(p => p.isActive).length
  const communityEnabled = partners.filter(p => p.communityEnabled).length
  const totalStock = stats.reduce((sum, s) => sum + s.totalStock, 0)
  const totalSales = stats.reduce((sum, s) => sum + (s.totalSales ?? 0), 0)

  if (loading || loadingData) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (selectedPartner) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => setSelectedPartner(null)}
          className="mb-4"
        >
          ← Volver a Socios
        </Button>
        <PartnerDetailPanel
          partner={selectedPartner}
          onPartnerUpdated={handlePartnerUpdated}
          onClose={() => setSelectedPartner(null)}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Socios</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los socios del sistema, sus sucursales y stock
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Socio
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Socios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPartners}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {activePartners} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sucursales</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.reduce((sum, s) => sum + s.branchesCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total sucursales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stock Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStock.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Unidades disponibles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ventas del Mes</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalSales.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Acumulado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Comunidad</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{communityEnabled}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Socios activos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => router.push("/admin/partners/aprobar-tienda")}
        >
          <Store className="mr-2 h-4 w-4" />
          Aprobar Stock para Tienda Online
          {stats.filter(s => s.totalProducts > 0).length > 0 && (
            <span className="ml-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
              Pendiente
            </span>
          )}
        </Button>
      </div>

      {/* Partners List */}
      <Card>
        <CardHeader>
          <CardTitle>Socios del Sistema</CardTitle>
          <CardDescription>
            Administra los socios, sus sucursales y configuraciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          {partners.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No hay socios aún</h3>
              <p className="text-muted-foreground mt-2 mb-4">
                Crea el primer socio para empezar a gestionar sucursales y stock
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Primer Socio
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {partners.map((partner) => {
                const partnerStats = stats.find(s => s.partnerId === partner.id)
                return (
                  <div
                    key={partner.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedPartner(partner)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${
                        partner.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{partner.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {partner.email || 'Sin email'}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {partnerStats?.branchesCount || 0} sucursales
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {partnerStats?.totalStock || 0} unidades
                          </span>
                          {partner.communityEnabled && (
                            <span className="flex items-center gap-1 text-blue-600">
                              <TrendingUp className="h-3 w-3" />
                              Comunidad activa
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {partnerStats?.totalSales ? `$${partnerStats.totalSales.toLocaleString()}` : '$0'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Comisión: {(partner.commissionRate * 100).toFixed(0)}%
                        </p>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${
                        partner.isActive ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      {showCreateDialog && (
        <CreatePartnerDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onPartnerCreated={handlePartnerCreated}
        />
      )}
    </div>
  )
}
