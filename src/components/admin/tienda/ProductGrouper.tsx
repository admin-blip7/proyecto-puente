'use client'

import { useState, useCallback } from 'react'
import { searchProductsForGrouping, groupProducts } from '@/app/(admin-tienda)/tienda-admin/products/actions'
import { useToast } from '@/hooks/use-toast'
import { X, Search, Check, Smartphone, Box, AlertCircle } from 'lucide-react'

interface Product {
    id: string
    name: string
    sku: string
    price: number
    stock: number
    category: string | null
    image_urls?: string[]
}

interface AttributeMap {
    [key: string]: {
        color: string
        capacity: string
        grade: string
        battery_health: string
    }
}

export default function ProductGrouper() {
    const { toast } = useToast()
    const [query, setQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Product[]>([])
    const [selectedProducts, setSelectedProducts] = useState<Product[]>([])
    const [isSearching, setIsSearching] = useState(false)

    // Form State
    const [parentName, setParentName] = useState('')
    const [attributes, setAttributes] = useState<AttributeMap>({})
    const [isGrouping, setIsGrouping] = useState(false)

    const handleSearch = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSearching(true)
        try {
            const results = await searchProductsForGrouping(query)
            setSearchResults(results as Product[])
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Error al buscar productos"
            })
        } finally {
            setIsSearching(false)
        }
    }, [query, toast])

    const toggleProduct = (product: Product) => {
        if (selectedProducts.find(p => p.id === product.id)) {
            setSelectedProducts(prev => prev.filter(p => p.id !== product.id))
            const newAttrs = { ...attributes }
            delete newAttrs[product.id]
            setAttributes(newAttrs)
        } else {
            setSelectedProducts(prev => [...prev, product])
            setAttributes(prev => ({
                ...prev,
                [product.id]: { color: '', capacity: '', grade: '', battery_health: '' }
            }))
        }
    }

    const handleAttributeChange = (productId: string, field: string, value: string) => {
        setAttributes(prev => ({
            ...prev,
            [productId]: {
                ...prev[productId],
                [field]: value
            }
        }))
    }

    const handleGroup = async () => {
        if (!parentName) {
            toast({ variant: "destructive", title: "Error", description: "Ingresa un nombre para el producto padre" })
            return
        }
        if (selectedProducts.length < 2) {
            toast({ variant: "destructive", title: "Error", description: "Selecciona al menos 2 productos" })
            return
        }

        // Validate attributes
        for (const p of selectedProducts) {
            const attrs = attributes[p.id]
            if (!attrs.color || !attrs.capacity || !attrs.grade) {
                toast({ variant: "destructive", title: "Error", description: `Faltan atributos para ${p.name}` })
                return
            }
        }

        setIsGrouping(true)
        try {
            const result = await groupProducts({
                name: parentName,
                price: Math.min(...selectedProducts.map(p => p.price)), // Use lowest price as base
                category: selectedProducts[0].category || 'General',
                imageUrl: selectedProducts[0].image_urls?.[0], // Use first image
                childIds: selectedProducts.map(p => p.id),
                attributesMap: attributes
            })

            if (result.success) {
                toast({
                    title: "Éxito",
                    description: "Productos agrupados correctamente"
                })
                setParentName('')
                setSelectedProducts([])
                setAttributes({})
                setSearchResults([])
                setQuery('')
            } else {
                toast({ variant: "destructive", title: "Error", description: result.message })
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Error al agrupar productos" })
        } finally {
            setIsGrouping(false)
        }
    }

    return (
        <div className="space-y-8 p-6 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div>
                <h3 className="text-xl font-semibold mb-2">Agrupador de Variantes</h3>
                <p className="text-sm text-gray-500">Busca productos individuales y agrúpalos bajo un producto padre (ej. iPhone 13).</p>
            </div>

            {/* Search Section */}
            <form onSubmit={handleSearch} className="flex gap-2">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por nombre o SKU..."
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black/5 outline-none"
                />
                <button
                    type="submit"
                    disabled={isSearching}
                    className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                >
                    {isSearching ? 'Buscando...' : <Search className="w-4 h-4" />}
                </button>
            </form>

            {/* Results & Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Search Results */}
                <div className="space-y-4">
                    <h4 className="font-medium text-sm text-gray-400 uppercase tracking-wider">Resultados</h4>
                    <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                        {searchResults.map(product => {
                            const isSelected = !!selectedProducts.find(p => p.id === product.id)
                            return (
                                <div
                                    key={product.id}
                                    onClick={() => toggleProduct(product)}
                                    className={`p-3 border rounded-lg cursor-pointer transition-all ${isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-medium">{product.name}</div>
                                            <div className="text-xs text-gray-500">SKU: {product.sku || '-'}</div>
                                            <div className="text-xs font-mono mt-1">${product.price}</div>
                                        </div>
                                        {isSelected && <Check className="w-4 h-4 text-green-600" />}
                                    </div>
                                </div>
                            )
                        })}
                        {searchResults.length === 0 && !isSearching && query && (
                            <div className="text-center py-8 text-gray-400 text-sm">No se encontraron productos</div>
                        )}
                    </div>
                </div>

                {/* Selected Products Configuration */}
                <div className="space-y-4 border-l pl-8">
                    <h4 className="font-medium text-sm text-gray-400 uppercase tracking-wider">Configuración de Grupo ({selectedProducts.length})</h4>

                    {selectedProducts.length > 0 ? (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nombre del Producto Padre</label>
                                <input
                                    type="text"
                                    value={parentName}
                                    onChange={(e) => setParentName(e.target.value)}
                                    placeholder="Ej. iPhone 13"
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                                <p className="text-xs text-gray-400 mt-1">Este será el nombre visible en el catálogo principal.</p>
                            </div>

                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                {selectedProducts.map(p => (
                                    <div key={p.id} className="p-4 bg-gray-50 rounded-lg space-y-3 text-sm">
                                        <div className="font-medium flex justify-between">
                                            <span>{p.name}</span>
                                            <button onClick={() => toggleProduct(p)} className="text-gray-400 hover:text-red-500">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                placeholder="Color (Ej. Rojo)"
                                                className="px-2 py-1.5 border rounded"
                                                value={attributes[p.id]?.color}
                                                onChange={(e) => handleAttributeChange(p.id, 'color', e.target.value)}
                                            />
                                            <input
                                                placeholder="Capacidad (Ej. 128GB)"
                                                className="px-2 py-1.5 border rounded"
                                                value={attributes[p.id]?.capacity}
                                                onChange={(e) => handleAttributeChange(p.id, 'capacity', e.target.value)}
                                            />
                                            <select
                                                className="px-2 py-1.5 border rounded bg-white"
                                                value={attributes[p.id]?.grade}
                                                onChange={(e) => handleAttributeChange(p.id, 'grade', e.target.value)}
                                            >
                                                <option value="">Grado...</option>
                                                <option value="Grado A">Grado A (Excelente)</option>
                                                <option value="Grado B">Grado B (Bueno)</option>
                                                <option value="Nuevo">Nuevo</option>
                                            </select>
                                            <select
                                                className="px-2 py-1.5 border rounded bg-white"
                                                value={attributes[p.id]?.battery_health}
                                                onChange={(e) => handleAttributeChange(p.id, 'battery_health', e.target.value)}
                                            >
                                                <option value="">Batería...</option>
                                                <option value="100%">100%</option>
                                                <option value="90-99%">90-99%</option>
                                                <option value="80-89%">80-89%</option>
                                                <option value="<80%">Menos de 80%</option>
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleGroup}
                                disabled={isGrouping || !parentName}
                                className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isGrouping ? 'Agrupando...' : (
                                    <>
                                        <Box className="w-4 h-4" />
                                        Crear Grupo de Productos
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                            <Smartphone className="w-12 h-12 mb-2 opacity-20" />
                            <p>Selecciona productos de la lista</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
