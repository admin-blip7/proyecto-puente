import { ShoppingCart, Star } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';

interface ProductCardProps {
  title: string;
  description: string;
  price: string;
  imageUrl: string;
  stockStatus: string;
  stockCount: number;
  featured?: boolean;
  specs?: { label: string; value: string }[];
}

export function ProductCard({
  title,
  description,
  price,
  imageUrl,
  stockStatus,
  stockCount,
  featured = false,
  specs = [],
}: ProductCardProps) {
  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
      {/* Image Container */}
      <div className="relative h-[500px] overflow-hidden">
        <ImageWithFallback
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        
        {/* Featured Badge */}
        {featured && (
          <div className="absolute top-6 left-6">
            <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 shadow-md">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium text-gray-900">Featured</span>
            </div>
          </div>
        )}
        
        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          {/* Price */}
          <div className="mb-3">
            <p className="text-3xl font-semibold">{price}</p>
          </div>
          
          {/* Title */}
          <h3 className="text-xl font-medium mb-2">{title}</h3>
          
          {/* Description */}
          <p className="text-sm text-gray-200 mb-4 line-clamp-2">{description}</p>
          
          {/* Specs */}
          {specs.length > 0 && (
            <div className="flex gap-6 mb-4 text-sm">
              {specs.map((spec, index) => (
                <div key={index}>
                  <p className="text-gray-300">{spec.label}</p>
                  <p className="font-medium">{spec.value}</p>
                </div>
              ))}
            </div>
          )}
          
          {/* Stock Status */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                stockCount > 10 ? 'bg-green-400' : 'bg-orange-400'
              }`} />
              <span className="text-sm text-gray-200">{stockStatus}</span>
            </div>
            <span className="text-xs text-gray-300">Updated 2 days ago</span>
          </div>
          
          {/* Add to Cart Button */}
          <button className="w-full bg-white text-gray-900 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors">
            <ShoppingCart className="w-5 h-5" />
            Add To Cart
          </button>
        </div>
      </div>
    </div>
  );
}
