"use client";

import { useState } from "react";
import { SeminuevoUnit, Product, CONDITION_GRADES } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/components/tienda/cart/CartProvider";
import { ArrowLeft, Smartphone, ShoppingCart, CheckCircle2, Battery, Settings2, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

function UnitCard({ unit, onAdd }: { unit: SeminuevoUnit, onAdd: (u: SeminuevoUnit) => void }) {
    const mainImage = unit.imageUrls?.[0] || "/placeholder-iphone.png";
    const gradeMeta = CONDITION_GRADES[unit.conditionGrade] || CONDITION_GRADES.B;

    return (
        <Card className="overflow-hidden bg-white border-gray-100 hover:shadow-xl transition-all duration-300 flex flex-col h-full group">
            <div className="relative aspect-[4/3] bg-gray-50 flex justify-center items-center p-4">
                <div className="relative w-full h-full">
                    <Image
                        src={mainImage}
                        alt={unit.name}
                        fill
                        className="object-contain group-hover:scale-105 transition-transform duration-500"
                    />
                </div>
                <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                    <Badge className={`${gradeMeta.bgClass} border-transparent shadow-sm flex items-center gap-1 font-semibold`}>
                        {gradeMeta.label}
                    </Badge>
                    {unit.batteryHealthPercent && (
                        <Badge variant="outline" className={`bg-white shadow-sm font-semibold flex items-center gap-1
              ${unit.batteryHealthPercent >= 85 ? 'text-green-600 border-green-200' : 'text-yellow-600 border-yellow-200'}`}>
                            <Battery className="w-3 h-3" />
                            Bat: {unit.batteryHealthPercent}%
                        </Badge>
                    )}
                </div>
            </div>

            <CardContent className="p-5 flex flex-col flex-1">
                <h3 className="text-sm font-bold text-gray-900 leading-tight mb-3 line-clamp-2">
                    {unit.name}
                </h3>

                <div className="grid grid-cols-2 gap-y-2 gap-x-1 text-xs text-gray-600 mb-4 bg-gray-50 p-3 rounded-lg flex-1">
                    <div className="flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 text-gray-400" />iOS {unit.iosVersion || 'N/A'}</div>
                    <div className="flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5 text-gray-400" />{unit.color || 'N/A'}</div>
                    {unit.batteryCtycleCount ? (
                        <div className="flex items-center gap-1.5 col-span-2 text-gray-500 shadow-none">
                            Ciclos: {unit.batteryCtycleCount}
                        </div>
                    ) : null}
                    {unit.cosmeticNotes ? (
                        <div className="col-span-2 text-gray-500 italic truncate" title={unit.cosmeticNotes}>
                            Nota: {unit.cosmeticNotes}
                        </div>
                    ) : null}
                </div>

                <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                    <div className="font-extrabold text-[#0B0A0E] text-xl">
                        {formatCurrency(unit.price)}
                    </div>
                    <Button
                        onClick={() => onAdd(unit)}
                        className="bg-black text-white hover:bg-gray-800 rounded-full px-4"
                        size="sm">
                        <ShoppingCart className="w-4 h-4 mr-1.5" />
                        Comprar
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function ModelUnitsClient({
    parentModel,
    initialUnits
}: {
    parentModel: Product,
    initialUnits: SeminuevoUnit[]
}) {
    const { addItem } = useCart();
    const [selectedStorage, setSelectedStorage] = useState<string>("todos");
    const [selectedColor, setSelectedColor] = useState<string>("todos");
    const [selectedGrade, setSelectedGrade] = useState<string>("todos");
    const maxInitialPrice = Math.max(...initialUnits.map(u => u.price), 1000);
    const minInitialPrice = Math.min(...initialUnits.map(u => u.price), 0);
    const [priceRange, setPriceRange] = useState<[number, number]>([minInitialPrice, maxInitialPrice]);

    const allStorages = Array.from(new Set(initialUnits.map(u => String(u.storageGb)))).sort((a, b) => Number(a) - Number(b));
    const allColors = Array.from(new Set(initialUnits.map(u => u.color))).filter(Boolean).sort();

    const [addedMessage, setAddedMessage] = useState<string | null>(null);

    const units = initialUnits.filter(u => {
        if (selectedStorage !== "todos" && String(u.storageGb) !== selectedStorage) return false;
        if (selectedColor !== "todos" && u.color !== selectedColor) return false;
        if (selectedGrade !== "todos" && u.conditionGrade !== selectedGrade) return false;
        if (u.price < priceRange[0] || u.price > priceRange[1]) return false;
        return true;
    });

    const handleAdd = (unit: SeminuevoUnit) => {
        addItem({
            productId: unit.id,
            name: unit.name,
            price: unit.price,
            sku: `SN-${unit.serialNumber}`,
            category: 'Celular Seminuevo',
            image: unit.imageUrls?.[0]
        });
        setAddedMessage(`¡${unit.name} agregado al carrito!`);
        setTimeout(() => setAddedMessage(null), 3000);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
            {/* Mensaje flotante de carrito */}
            {addedMessage && (
                <div className="fixed top-4 right-4 z-50 bg-green-50 text-green-800 px-6 py-4 border border-green-200 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="font-semibold">{addedMessage}</span>
                </div>
            )}

            {/* Header */}
            <div className="mb-8 relative">
                <Link href="/tienda/seminuevos">
                    <Button variant="ghost" size="sm" className="mb-4 text-gray-500 hover:text-gray-900 absolute -top-12 left-0 pl-0">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver a Modelos
                    </Button>
                </Link>
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-2">
                    {parentModel.name}
                </h1>
                <p className="text-lg text-gray-600">
                    Tenemos {initialUnits.length} unidade{initialUnits.length !== 1 ? 's' : ''} disponibles de este modelo, listas para envío.
                </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">

                {/* Barra lateral de filtros */}
                <div className="w-full lg:w-64 shrink-0">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sticky top-24">
                        <div className="flex items-center gap-2 font-bold text-gray-900 mb-5 pb-3 border-b border-gray-100">
                            <SlidersHorizontal className="w-5 h-5" /> Filtros
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-gray-700">Capacidad</label>
                                <Select value={selectedStorage} onValueChange={setSelectedStorage}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Todas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">Cualquier capacidad</SelectItem>
                                        {allStorages.map(s => <SelectItem key={s} value={s}>{s} GB</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-gray-700">Estado</label>
                                <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">Cualquier estado</SelectItem>
                                        <SelectItem value="A">Excelente</SelectItem>
                                        <SelectItem value="B">Bueno</SelectItem>
                                        <SelectItem value="C">Aceptable</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-gray-700">Color</label>
                                <Select value={selectedColor} onValueChange={setSelectedColor}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">Cualquier color</SelectItem>
                                        {allColors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-4 pt-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-semibold text-gray-700">Precio máx.</label>
                                    <span className="text-xs font-bold text-primary">{formatCurrency(priceRange[1])}</span>
                                </div>
                                <Slider
                                    min={minInitialPrice}
                                    max={maxInitialPrice}
                                    step={100}
                                    value={[priceRange[1]]}
                                    onValueChange={(val) => setPriceRange([priceRange[0], val[0]])}
                                    className="w-full"
                                />
                            </div>

                            <Button
                                variant="outline"
                                className="w-full mt-4"
                                onClick={() => {
                                    setSelectedStorage("todos");
                                    setSelectedColor("todos");
                                    setSelectedGrade("todos");
                                    setPriceRange([minInitialPrice, maxInitialPrice]);
                                }}
                            >
                                Limpiar filtros
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Listado de unidades */}
                <div className="flex-1">
                    {units.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {units.map(unit => (
                                <UnitCard key={unit.id} unit={unit} onAdd={handleAdd} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white rounded-xl border border-gray-100 border-dashed w-full h-full min-h-[400px] flex flex-col items-center justify-center">
                            <Smartphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-gray-900">No encontramos unidades</h3>
                            <p className="text-gray-500 mt-1 max-w-sm">No tenemos existencias con la combinación exacta de filtros seleccionada.</p>
                            <Button
                                variant="default"
                                className="mt-5"
                                onClick={() => {
                                    setSelectedStorage("todos");
                                    setSelectedColor("todos");
                                    setSelectedGrade("todos");
                                    setPriceRange([minInitialPrice, maxInitialPrice]);
                                }}
                            >
                                Ver todas las disponibles
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
