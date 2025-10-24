import { Suspense } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign, Activity, Phone, Mail, Calendar, UserPlus } from "lucide-react";
import CRMClientList from "@/components/admin/crm/CRMClientList";
import CRMClientForm from "@/components/admin/crm/CRMClientForm";
import { getCRMStats } from "@/lib/services/crmClientService";
import { formatCurrency } from "@/lib/utils";

// Client component to handle async data
async function CRMStats() {
    const stats = await getCRMStats();

    const statCards = [
        {
            title: "Total Clientes",
            value: stats.totalClients.toString(),
            icon: Users,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
        },
        {
            title: "Clientes Activos",
            value: stats.activeClients.toString(),
            icon: Activity,
            color: "text-green-600",
            bgColor: "bg-green-50",
        },
        {
            title: "Nuevos este Mes",
            value: stats.newClientsThisMonth.toString(),
            icon: UserPlus,
            color: "text-purple-600",
            bgColor: "bg-purple-50",
        },
        {
            title: "Compras Totales",
            value: formatCurrency(stats.totalPurchases),
            icon: DollarSign,
            color: "text-yellow-600",
            bgColor: "bg-yellow-50",
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map((stat) => (
                <Card key={stat.title}>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    {stat.title}
                                </p>
                                <p className="text-2xl font-bold">{stat.value}</p>
                            </div>
                            <div className={`p-3 rounded-full ${stat.bgColor}`}>
                                <stat.icon className={`h-6 w-6 ${stat.color}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export default function CRMPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">CRM - Gestión de Clientes</h1>
                <p className="text-muted-foreground">
                    Administra toda la información de tus clientes y su historial de servicios
                </p>
            </div>

            {/* Statistics */}
            <Suspense fallback={
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <div className="animate-pulse">
                                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            }>
                <CRMStats />
            </Suspense>

            {/* Client List */}
            <CRMClientList />
        </div>
    );
}