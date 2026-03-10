import Link from "next/link"
import { getWholesaleSuppliers } from "@/lib/services/wholesaleService"
import { Header } from "@/components/shared/Header"
import LeftSidebar from "@/components/shared/LeftSidebar"
import { Button } from "@/components/ui/button"
import { Users, Plus, Edit, Trash2, MessageCircle, Phone, Mail } from "lucide-react"

export default async function WholesaleSuppliersPage() {
  const suppliers = await getWholesaleSuppliers()

  return (
    <div className="flex h-screen w-full flex-row">
      <div className="hidden md:flex">
        <LeftSidebar />
      </div>

      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">Proveedores Dropshipping</h1>
              <p className="text-muted-foreground">
                Gestiona los proveedores para pedidos mayoreo
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/admin/wholesale">← Pedidos</Link>
              </Button>
              <Button asChild>
                <Link href="/admin/wholesale/suppliers/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Proveedor
                </Link>
              </Button>
            </div>
          </div>

          {/* Suppliers List */}
          {suppliers.length === 0 ? (
            <div className="bg-white rounded-lg border shadow-sm p-12 text-center">
              <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay proveedores configurados</h3>
              <p className="text-muted-foreground mb-6">
                Comienza agregando tus primeros proveedores de dropshipping
              </p>
              <Button asChild>
                <Link href="/admin/wholesale/suppliers/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Proveedor
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="bg-white rounded-lg border shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{supplier.name}</h3>
                        {supplier.isActive ? (
                          <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            Inactivo
                          </span>
                        )}
                      </div>

                      {supplier.contactName && (
                        <p className="text-sm text-muted-foreground mb-2">
                          Contacto: {supplier.contactName}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {supplier.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            <a
                              href={`mailto:${supplier.email}`}
                              className="hover:text-primary transition-colors"
                            >
                              {supplier.email}
                            </a>
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            <a
                              href={`tel:${supplier.phone}`}
                              className="hover:text-primary transition-colors"
                            >
                              {supplier.phone}
                            </a>
                          </div>
                        )}
                        {supplier.whatsapp && (
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-4 w-4" />
                            <a
                              href={`https://wa.me/${supplier.whatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-green-600 transition-colors"
                            >
                              WhatsApp
                            </a>
                          </div>
                        )}
                      </div>

                      {supplier.leadTimeDefault && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Tiempo de entrega: {supplier.leadTimeDefault}
                        </p>
                      )}

                      {supplier.notes && (
                        <p className="text-sm text-gray-600 mt-2 italic">
                          {supplier.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/wholesale/suppliers/${supplier.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                        <Link href={`/admin/wholesale/suppliers/${supplier.id}/delete`}>
                          <Trash2 className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
