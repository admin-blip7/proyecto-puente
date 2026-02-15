import ProductGrouper from "@/components/admin/tienda/ProductGrouper";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function GroupProductsPage() {
    return (
        <main className="max-w-6xl mx-auto py-8 px-4">
            <div className="mb-6">
                <Link
                    href="/tienda-admin/products"
                    className="inline-flex items-center text-sm text-gray-500 hover:text-black mb-4 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Volver a Productos
                </Link>
                <h2 className="font-editors-note text-3xl font-light">Agrupar Productos</h2>
                <p className="mt-1 text-sm text-black/60">Crea relaciones padre-hijo para manejar variantes de color, capacidad y grado.</p>
            </div>

            <ProductGrouper />
        </main>
    );
}
