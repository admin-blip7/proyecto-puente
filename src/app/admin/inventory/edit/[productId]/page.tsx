
import LeftSidebar from "@/components/shared/LeftSidebar";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { getProductById } from "@/lib/services/productService";
import { getConsignors } from "@/lib/services/consignorService";
import { getProducts } from "@/lib/services/productService";
import EditProductForm from "@/components/admin/inventory/EditProductForm";
import Link from "next/link";

interface PageProps {
    params: {
        productId: string;
    }
}

export default async function EditProductPage({ params }: PageProps) {
    const { productId } = params;
    
    // Fetch all necessary data in parallel
    const [product, consignors, allProducts] = await Promise.all([
        getProductById(productId),
        getConsignors(),
        getProducts()
    ]);

    if (!product) {
        return (
             <div className="flex h-screen w-full flex-col items-center justify-center">
                <h1 className="text-2xl font-bold">Producto no encontrado</h1>
                <p className="text-muted-foreground">El producto que buscas no existe o ha sido eliminado.</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/admin">Volver al Inventario</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="flex h-screen w-full flex-row">
            <div className="hidden md:flex">
                <LeftSidebar />
            </div>
             <div className="absolute top-4 left-4 z-50 md:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Menu className="h-6 w-6" />
                    </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-24">
                      <SheetTitle className="sr-only">Admin Menu</SheetTitle>
                      <LeftSidebar />
                    </SheetContent>
                </Sheet>
            </div>
            <main className="flex-1 overflow-auto p-4 md:p-6">
                <EditProductForm 
                    product={product}
                    consignors={consignors}
                    allProducts={allProducts}
                />
            </main>
        </div>
    )
}
