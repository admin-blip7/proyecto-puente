import { Product } from '@/types';
import { getProducts } from '@/lib/services/productService';
import { getProductCategories } from '@/lib/services/categoryService';
import { POSLayoutWithMobile } from '@/components/shared/POSLayout';

// Force dynamic rendering to avoid build-time data fetching issues
export const dynamic = 'force-dynamic';

export default async function POSPage() {
  const [initialProducts, initialCategories] = await Promise.all([
    getProducts(),
    getProductCategories()
  ]);

  return (
    <POSLayoutWithMobile initialProducts={initialProducts} initialCategories={initialCategories} />
  );
}
