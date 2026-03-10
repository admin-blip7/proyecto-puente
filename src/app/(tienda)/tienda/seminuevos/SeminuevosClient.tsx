"use client";

import { useState } from "react";
import { SeminuevoModel, CONDITION_GRADES } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Smartphone, Filter, HardDrive, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function ModelCard({ model }: { model: SeminuevoModel }) {
    const mainImage = model.imageUrls?.[0] || "/placeholder-iphone.png";

    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 group flex flex-col h-full bg-white border-gray-100">
            <div className="relative aspect-square bg-gray-50 p-6 flex flex-col justify-center items-center">
                {/* Aquí podrías usar next/image */}
                <div className="relative w-full h-full max-h-[220px]">
                    <Image
                        src={mainImage}
                        alt={model.modelName}
                        fill
                        className="object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-500"
                    />
                </div>
                <div className="absolute top-3 right-3">
                    <Badge className="bg-primary/90 text-primary-foreground font-semibold shadow-sm">
                        {model.unitsAvailable} disp.
                    </Badge>
                </div>
            </div>

            <CardContent className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{model.modelName}</h3>

                <div className="flex items-center gap-2 mb-4 mt-1">
                    <span className="text-xl font-bold text-primary">
                        Desde {formatCurrency(model.priceFrom)}
                    </span>
                </div>

                <div className="space-y-3 mb-5 flex-1">
                    <div className="flex flex-wrap gap-1.5 items-center">
                        <HardDrive className="w-4 h-4 text-gray-500 mr-1" />
                        {model.storagesAvailable.sort().map(storage => (
                            <Badge key={storage} variant="secondary" className="text-xs bg-gray-100 text-gray-700">
                                {storage}
                            </Badge>
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-1.5 items-center">
                        <ShieldCheck className="w-4 h-4 text-gray-500 mr-1" />
                        {model.gradesAvailable.map(grade => {
                            const meta = CONDITION_GRADES[grade];
                            return (
                                <Badge key={grade} variant="outline" className={`text-xs ${meta.bgClass} border-transparent`}>
                                    {meta.label}
                                </Badge>
                            );
                        })}
                    </div>
                </div>

                <Link href={`/tienda/seminuevos/${model.modelId}`} className="w-full mt-auto">
                    <Button className="w-full font-medium" size="lg">
                        Ver unidades
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}

export default function SeminuevosClient({ initialModels }: { initialModels: SeminuevoModel[] }) {
    const [selectedStorage, setSelectedStorage] = useState<string>("todos");
    const [selectedGrade, setSelectedGrade] = useState<string>("todos");

    // Filtro
    const models = initialModels.filter(m => {
        if (selectedStorage !== "todos" && !m.storagesAvailable.includes(selectedStorage)) return false;
        if (selectedGrade !== "todos" && !m.gradesAvailable.includes(selectedGrade as any)) return false;
        return true;
    });

    const allStorages = Array.from(new Set(initialModels.flatMap(m => m.storagesAvailable))).sort();

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto mb-12">
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-4">
                    iPhones Seminuevos
                </h1>
                <p className="text-lg text-gray-600">
                    Dispositivos inspeccionados minuciosamente. Calidad certificada, batería comprobada y garantía incluida.
                </p>
            </div>

            {/* Filters (Basic) */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8 items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 text-gray-700 font-medium">
                    <Filter className="w-5 h-5" />
                    <span>Filtros:</span>
                </div>
                <div className="flex flex-1 w-full sm:w-auto gap-4 sm:justify-end">
                    <Select value={selectedStorage} onValueChange={setSelectedStorage}>
                        <SelectTrigger className="w-[140px] bg-gray-50">
                            <SelectValue placeholder="Capacidad" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos">Cualquier cap.</SelectItem>
                            {allStorages.map(s => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                        <SelectTrigger className="w-[140px] bg-gray-50">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos">Cualquier estado</SelectItem>
                            <SelectItem value="A">Excelente</SelectItem>
                            <SelectItem value="B">Bueno</SelectItem>
                            <SelectItem value="C">Aceptable</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Grid */}
            {models.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {models.map(model => (
                        <ModelCard key={model.modelId} model={model} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-xl border border-gray-100 border-dashed">
                    <Smartphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">No hay modelos disponibles</h3>
                    <p className="text-gray-500 mt-1">Prueba quitando los filtros para ver más opciones.</p>
                    <Button variant="outline" className="mt-4" onClick={() => { setSelectedStorage("todos"); setSelectedGrade("todos"); }}>
                        Limpiar filtros
                    </Button>
                </div>
            )}
        </div>
    );
}
