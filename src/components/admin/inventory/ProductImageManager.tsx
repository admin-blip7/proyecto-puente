'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, X, Wand2, ImagePlus, GripVertical, Sparkles } from "lucide-react";
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Image from 'next/image';
import { uploadProductImage } from '@/lib/services/productService';
import { generateProductImage, optimizeProductImage } from '@/lib/services/deapiService';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";

const ItemType = 'IMAGE';

interface DraggableImageProps {
    url: string;
    index: number;
    moveImage: (dragIndex: number, hoverIndex: number) => void;
    onDelete: (index: number) => void;
    onOptimize: (url: string, index: number) => void;
    isOptimizing: boolean;
}

const DraggableImage = ({ url, index, moveImage, onDelete, onOptimize, isOptimizing }: DraggableImageProps) => {
    const ref = useRef<HTMLDivElement>(null);

    const [{ isDragging }, drag] = useDrag({
        type: ItemType,
        item: { index },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const [, drop] = useDrop({
        accept: ItemType,
        hover(item: { index: number }, monitor) {
            if (!ref.current) return;

            const dragIndex = item.index;
            const hoverIndex = index;

            if (dragIndex === hoverIndex) return;

            moveImage(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    drag(drop(ref));

    return (
        <div
            ref={ref}
            className={cn(
                "relative group bg-muted rounded-lg overflow-hidden border transition-all aspect-square",
                isDragging ? "opacity-50 ring-2 ring-primary" : "opacity-100"
            )}
        >
            <Image
                src={url}
                alt={`Product image ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 200px"
            />

            {/* Overlay Actions */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                <div className="flex justify-between items-start">
                    <div className="cursor-move p-1 bg-black/50 rounded text-white hover:bg-black/70">
                        <GripVertical className="h-4 w-4" />
                    </div>
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(index);
                        }}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>

                <div className="flex justify-center">
                    {isOptimizing ? (
                        <div className="bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Mejorando...
                        </div>
                    ) : (
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs bg-white/90 hover:bg-white"
                            onClick={(e) => {
                                e.stopPropagation();
                                onOptimize(url, index);
                            }}
                        >
                            <Sparkles className="h-3 w-3 mr-1 text-purple-600" />
                            Mejorar Fondo
                        </Button>
                    )}
                </div>
            </div>

            {index === 0 && (
                <Badge className="absolute bottom-2 left-2 bg-primary/90 hover:bg-primary pointer-events-none">
                    Principal
                </Badge>
            )}
        </div>
    );
};

interface ProductImageManagerProps {
    imageUrls: string[];
    onChange: (urls: string[]) => void;
    productName: string;
}

export default function ProductImageManager({
    imageUrls,
    onChange,
    productName
}: ProductImageManagerProps) {
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [optimizingIndices, setOptimizingIndices] = useState<number[]>([]);
    const [showSearch, setShowSearch] = useState(false);

    const handleImageSelect = async (file: File, url: string) => {
        // Upload the file to our storage
        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append('file', file);
            const finalUrl = await uploadProductImage(formData);

            onChange([...imageUrls, finalUrl]);
            toast({
                title: "Imagen agregada",
                description: "La imagen seleccionada se ha guardado correctamente.",
            });
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error al guardar",
                description: "No se pudo guardar la imagen seleccionada.",
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;

        try {
            setIsUploading(true);
            const files = Array.from(e.target.files);
            const newUrls: string[] = [];

            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                const url = await uploadProductImage(formData);
                newUrls.push(url);
            }

            onChange([...imageUrls, ...newUrls]);
            toast({
                title: "Imágenes subidas",
                description: `Se han subido ${files.length} imágenes correctamente.`,
            });
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error al subir",
                description: "No se pudieron subir las imágenes. Intenta de nuevo.",
            });
        } finally {
            setIsUploading(false);
            // Reset input value to allow uploading same files again if needed
            if (e.target) e.target.value = '';
        }
    };

    const handleGenerateImage = async () => {
        if (!productName) {
            toast({
                variant: "destructive",
                title: "Nombre requerido",
                description: "Ingresa el nombre del producto antes de generar una imagen.",
            });
            return;
        }

        try {
            setIsGenerating(true);

            const generatedUrl = await generateProductImage(productName);

            // We should ideally upload this URL to our storage to persist it
            // For now, we'll try to fetch it and upload it using our helper
            // If fetching fails (CORS), we might just use the external URL (deAPI usually hosts it for some time)
            // Best practice: Download and upload

            let finalUrl = generatedUrl;

            try {
                const res = await fetch(generatedUrl);
                const blob = await res.blob();
                const file = new File([blob], "generated-image.png", { type: "image/png" });
                const formData = new FormData();
                formData.append('file', file);
                finalUrl = await uploadProductImage(formData);
            } catch (uploadError) {
                console.warn("Could not persist generated image, using external URL", uploadError);
            }

            onChange([...imageUrls, finalUrl]);
            toast({
                title: "Imagen generada",
                description: "Se ha generado una nueva imagen con IA.",
            });
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error de generación",
                description: "No se pudo generar la imagen. Intenta de nuevo.",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleOptimizeImage = async (url: string, index: number) => {
        try {
            setOptimizingIndices(prev => [...prev, index]);

            // Fetch the image to get a Blob/File to send to API
            const res = await fetch(url);
            const blob = await res.blob();
            const file = new File([blob], "image-to-optimize.png", { type: blob.type });

            const formData = new FormData();
            formData.append('image', file);

            const optimizedUrl = await optimizeProductImage(formData);

            // Persist optimised image
            let finalUrl = optimizedUrl;
            try {
                const resOpt = await fetch(optimizedUrl);
                const blobOpt = await resOpt.blob();
                const fileOpt = new File([blobOpt], "optimized-image.png", { type: "image/png" });
                const formDataOpt = new FormData();
                formDataOpt.append('file', fileOpt);
                finalUrl = await uploadProductImage(formDataOpt);
            } catch (err) {
                console.warn("Could not persist optimized image", err);
            }

            const newUrls = [...imageUrls];
            newUrls[index] = finalUrl;
            onChange(newUrls);

            toast({
                title: "Imagen mejorada",
                description: "El fondo se ha eliminado/mejorado correctamente.",
            });

        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error de optimización",
                description: "No se pudo mejorar la imagen.",
            });
        } finally {
            setOptimizingIndices(prev => prev.filter(i => i !== index));
        }
    };

    const moveImage = useCallback((dragIndex: number, hoverIndex: number) => {
        const newUrls = [...imageUrls];
        const [draggedUrl] = newUrls.splice(dragIndex, 1);
        newUrls.splice(hoverIndex, 0, draggedUrl);
        onChange(newUrls);
    }, [imageUrls, onChange]);

    const handleDelete = (index: number) => {
        const newUrls = [...imageUrls];
        newUrls.splice(index, 1);
        onChange(newUrls);
    };

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="space-y-4">
                <div className="flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="relative overflow-hidden"
                            disabled={isUploading}
                        >
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={handleFileUpload}
                            />
                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                            Subir Imágenes
                        </Button>

                        <Button
                            variant="default"
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                            onClick={handleGenerateImage}
                            disabled={isGenerating || !productName}
                        >
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                            Generar con IA
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowSearch(true)}
                            disabled={isUploading || isGenerating}
                        >
                            <Search className="mr-2 h-4 w-4" />
                            Buscar en Web
                        </Button>
                    </div>

                    <span className="text-xs text-muted-foreground">
                        Arrastra para reordenar. La primera es la principal.
                    </span>
                </div>

                {/* Image Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {imageUrls.map((url, index) => (
                        <DraggableImage
                            key={`${url}-${index}`}
                            url={url}
                            index={index}
                            moveImage={moveImage}
                            onDelete={handleDelete}
                            onOptimize={handleOptimizeImage}
                            isOptimizing={optimizingIndices.includes(index)}
                        />
                    ))}

                    {/* Upload Placeholder / Drop Zone (Visual only for now) */}
                    {imageUrls.length === 0 && !isUploading && !isGenerating && (
                        <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-muted-foreground aspect-square bg-muted/30">
                            <ImagePlus className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm text-center">No hay imágenes</p>
                        </div>
                    )}

                    {(isUploading || isGenerating) && (
                        <div className="aspect-square flex items-center justify-center bg-muted rounded-lg border">
                            <Skeleton className="h-full w-full" />
                        </div>
                    )}
                </div>

                <ProductImageSearch
                    open={showSearch}
                    onOpenChange={setShowSearch}
                    productName={productName}
                    onImageSelect={(file, url) => {
                        handleImageSelect(file, url);
                    }}
                />
            </div>
        </DndProvider>
    );
}

import { ProductImageSearch } from "@/components/shared/ProductImageSearch";
import { Search } from "lucide-react";
