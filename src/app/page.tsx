import POSClient from '@/components/pos/POSClient';
import { Product } from '@/types';
import LeftSidebar from '@/components/shared/LeftSidebar';

// Mock function to simulate fetching products.
// In a real application, this would fetch from Firestore.
const getProducts = async (): Promise<Product[]> => {
  const categories = ["Bebidas", "Limpieza", "Snacks", "Panadería"];
  return Array.from({ length: 12 }, (_, i) => ({
    id: `prod_${i + 1}`,
    name: `Product ${i + 1}`,
    sku: `SKU00${i + 1}`,
    price: parseFloat((Math.random() * 50 + 5).toFixed(2)),
    cost: parseFloat((Math.random() * 30 + 2).toFixed(2)),
    stock: Math.floor(Math.random() * 100),
    category: categories[i % categories.length],
    imageUrl: `https://picsum.photos/400/400?random=${i}`,
    createdAt: new Date(),
  }));
};

export default async function POSPage() {
  const initialProducts = await getProducts();
  return (
    <div className="flex h-screen w-full bg-background">
      <LeftSidebar />
      <main className="flex-1 flex flex-col">
        <POSClient initialProducts={initialProducts} />
      </main>
    </div>
  );
}
