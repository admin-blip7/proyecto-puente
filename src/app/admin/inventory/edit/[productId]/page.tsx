
import { FC } from "react";
import LeftSidebar from "@/components/shared/LeftSidebar";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { getProductById, getProducts } from "@/lib/services/productService";
import { getConsignors } from "@/lib/services/consignorService";
import EditProductForm from "@/components/admin/inventory/EditProductForm";
import Link from "next/link";
import { notFound } from 'next/navigation';

// Define la interfaz local para las props de la página
interface PageProps {
  params: {
    productId: string;
  };
}

const EditProductPage: FC<PageProps> = async ({ params }) => {
  const { productId } = params;
  
  // Fetch all necessary data in parallel
  const [product, consignors, allProducts] = await Promise.all([
      getProductById(productId),
      getConsignors(),
      getProducts()
  ]);

  if (!product) {
      notFound();
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
  );
};

export default EditProductPage;
