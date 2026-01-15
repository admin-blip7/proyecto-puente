import { ProductCard } from '@/app/components/ProductCard';

export default function App() {
  const products = [
    {
      title: 'Acer suspiro A61Lx',
      description: 'Powerful performance meets sleek design. Capture every moment with stunning clarity.',
      price: '$1,800.00',
      imageUrl: 'https://images.unsplash.com/photo-1759668358660-0d06064f0f84?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYXB0b3AlMjBjb21wdXRlciUyMG1vZGVybnxlbnwxfHx8fDE3Njg0NTA1NDB8MA&ixlib=rb-4.1.0&q=80&w=1080',
      stockStatus: 'Low Stock: 6 left',
      stockCount: 6,
      featured: true,
      specs: [
        { label: 'Screen', value: '15.6"' },
        { label: 'RAM', value: '16GB' },
        { label: 'Storage', value: '512GB' },
      ],
    },
    {
      title: 'Adaptador bluetooth X6 ximi',
      description: 'Seamless wireless connectivity for your audio devices. Compact and easy to use.',
      price: '$150.00',
      imageUrl: 'https://images.unsplash.com/photo-1719937051489-d69ad4bb29bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibHVldG9vdGglMjBhZGFwdGVyJTIwZGV2aWNlfGVufDF8fHx8MTc2ODUwOTc2NHww&ixlib=rb-4.1.0&q=80&w=1080',
      stockStatus: 'Low Stock: 6 left',
      stockCount: 6,
      specs: [
        { label: 'Range', value: '10m' },
        { label: 'Version', value: '5.0' },
      ],
    },
    {
      title: 'Adaptador Otg Hub USB-C',
      description: 'Expand your possibilities. Connect multiple devices simultaneously with high speed.',
      price: '$50.00',
      imageUrl: 'https://images.unsplash.com/photo-1760348213270-7cd00b8c3405?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1c2IlMjBodWIlMjBjYWJsZXxlbnwxfHx8fDE3Njg1MDk3NjR8MA&ixlib=rb-4.1.0&q=80&w=1080',
      stockStatus: 'Low Stock: 7 left',
      stockCount: 7,
      featured: false,
      specs: [
        { label: 'Ports', value: '4x USB' },
        { label: 'Speed', value: '5Gbps' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product, index) => (
            <ProductCard key={index} {...product} />
          ))}
        </div>
      </div>
    </div>
  );
}
