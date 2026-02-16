import { getFeaturedProducts, getCategories } from '@/lib/services/tiendaProductService'
import { TiendaProductCard } from '@/components/tienda/TiendaProductCard'
import { Suspense } from 'react'
import { CategoriesSlider } from '@/components/tienda/CategoriesSlider'
import { HeroBanner } from '@/components/tienda/HeroBanner'
import { FeaturesSection } from '@/components/tienda/FeaturesSection'
import { CommunityLove } from '@/components/tienda/CommunityLove'
import { getTiendaCmsSettings } from '@/lib/services/tiendaCmsService'

async function FeaturedProducts() {
  const products = await getFeaturedProducts(8)
  const categories = await getCategories()

  const categoryMap = new Map(categories.map(c => [c.value, c.label]))

  if (products.length === 0) {
    return null
  }

  return (
    <section className="py-8 lg:py-12">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <span className="tienda-section-label block mb-2">
              /// DESTACADOS
            </span>
            <h2 className="font-editors-note text-4xl lg:text-5xl font-thin">
              New Arrivals
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
          {products.map((product) => (
            <TiendaProductCard
              key={product.id}
              product={product}
              categoryLabel={categoryMap.get(product.category || '')}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default function TiendaPage() {
  const settingsPromise = getTiendaCmsSettings()

  return (
    <main className="relative">
      {/* Hero Section */}
      <Suspense fallback={<div className="h-[70vh]" />}>
        <HeroFromCms settingsPromise={settingsPromise} />
      </Suspense>

      {/* Categories Slider */}
      <Suspense fallback={<div className="h-40" />}>
        <CategoriesSlider excludeCategories={['accesorios', 'audio', 'audios', 'celular', 'celulares']} />
      </Suspense>

      {/* Featured Products */}
      <Suspense fallback={<div className="h-96" />}>
        <FeaturedProducts />
      </Suspense>

      {/* Community Love / Reviews */}
      <CommunityLove />

      {/* Features Section */}
      <FeaturesSection />
    </main>
  )
}

async function HeroFromCms({
  settingsPromise,
}: {
  settingsPromise: ReturnType<typeof getTiendaCmsSettings>
}) {
  const settings = await settingsPromise
  return <HeroBanner heroTitle={settings.heroTitle} heroSubtitle={settings.heroSubtitle} />
}
