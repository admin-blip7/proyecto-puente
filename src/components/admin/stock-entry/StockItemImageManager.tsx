"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Wand2, Sparkles, Upload, X, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { generateProductImageAction, optimizeProductImageAction } from "@/lib/actions/stockImageActions";

interface StockItemImageManagerProps {
    itemName: string;
    itemCategory?: string;
    imageFile?: File;
    imageUrl?: string;
    isImageProcessing?: boolean;
    hasOptimizedImage?: boolean;
    onImageFileChange: (file: File | undefined) => void;
    onImageUrlChange: (url: string | undefined) => void;
    onProcessingChange: (processing: boolean) => void;
    onOptimizedChange: (optimized: boolean) => void;
    onSearchClick: () => void;
    suggestedImageUrl?: string;
    onUseSuggestedImage?: (url: string) => void;
}

export function StockItemImageManager({
    itemName,
    itemCategory,
    imageFile,
    imageUrl,
    isImageProcessing,
    hasOptimizedImage,
    onImageFileChange,
    onImageUrlChange,
    onProcessingChange,
    onOptimizedChange,
    onSearchClick,
    suggestedImageUrl,
    onUseSuggestedImage
}: StockItemImageManagerProps) {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Crear preview local cuando hay archivo
    useEffect(() => {
        if (!imageFile) {
            setPreviewUrl(null);
            return;
        }

        const url = URL.createObjectURL(imageFile);
        setPreviewUrl(url);

        // Cleanup function to revoke the URL when component unmounts or imageFile changes
        return () => {
            URL.revokeObjectURL(url);
        };
    }, [imageFile]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onImageFileChange(file);
            onImageUrlChange(undefined); // Limpiar URL anterior
            onOptimizedChange(false);

            // Crear preview
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(URL.createObjectURL(file));

            toast({ title: "Imagen cargada", description: file.name });
        }
        // Reset inputs
        e.target.value = '';
    };

    const handleGenerateWithAI = async () => {
        if (!itemName) {
            toast({ variant: "destructive", title: "Error", description: "El producto debe tener un nombre" });
            return;
        }

        onProcessingChange(true);
        try {
            const result = await generateProductImageAction(itemName, itemCategory);
            if (result.success && result.imageUrl) {
                // Update display immediately with the URL
                onImageUrlChange(result.imageUrl);
                onImageFileChange(undefined); // Clear manual file if any
                onOptimizedChange(true);

                // Clear any local preview
                if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                }

                toast({ title: "Imagen generada", description: "✨ Imagen creada con IA" });

                // Try to convert to File for persistence, but don't block UI if CORS fails
                try {
                    const response = await fetch(result.imageUrl, { mode: 'cors' }); // Try CORS fetch
                    if (response.ok) {
                        const blob = await response.blob();
                        const file = new File([blob], `${itemName.replace(/\s+/g, '-').toLowerCase()}-ai.jpg`, { type: 'image/jpeg' });
                        onImageFileChange(file);
                    } else {
                        console.warn("Could not fetch generated image for file conversion (CORS?)", result.imageUrl);
                    }
                } catch (fetchError) {
                    console.warn("Error fetching generated image blob:", fetchError);
                    // We still have the URL, so the user can see it. 
                    // Persistence logic in main component handles URL if file is missing.
                }
            } else {
                throw new Error(result.error || 'Error generando imagen');
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo generar la imagen" });
        } finally {
            onProcessingChange(false);
        }
    };

    const handleOptimizeImage = async () => {
        if (!imageFile) {
            // Podríamos intentar optimizar la imageUrl si no hay file, pero por ahora requerimos upload
            toast({ variant: "destructive", title: "Error", description: "Primero sube una imagen" });
            return;
        }

        onProcessingChange(true);
        try {
            const formData = new FormData();
            formData.append('image', imageFile);

            const result = await optimizeProductImageAction(formData);
            if (result.success && result.imageUrl) {
                // Update display immediately with the URL
                onImageUrlChange(result.imageUrl);
                onImageFileChange(undefined);
                onOptimizedChange(true);

                // Clear any local preview
                if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                }

                toast({ title: "Imagen optimizada", description: "✨ Fondo removido y mejorado" });

                try {
                    const response = await fetch(result.imageUrl, { mode: 'cors' });
                    if (response.ok) {
                        const blob = await response.blob();
                        const optimizedFile = new File([blob], `${itemName.replace(/\s+/g, '-').toLowerCase()}-opt.jpg`, { type: 'image/jpeg' });
                        onImageFileChange(optimizedFile);
                        // Update preview to use local blob which is faster/safer
                        setPreviewUrl(URL.createObjectURL(optimizedFile));
                    }
                } catch (e) {
                    console.warn("Could not fetch optimized image blob:", e);
                }
            } else {
                throw new Error(result.error || 'Error optimizando imagen');
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo optimizar la imagen" });
        } finally {
            onProcessingChange(false);
        }
    };

    const handleRemoveImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        onImageFileChange(undefined);
        onImageUrlChange(undefined);
        onOptimizedChange(false);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
    };

    // Determine what to show
    const displayImage = imageUrl || previewUrl;
    const canUseSuggested = Boolean(suggestedImageUrl && !displayImage && !isImageProcessing);

    return (
        <div className="flex flex-col items-center gap-2">
            {/* Preview de imagen */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/25 group">
                {displayImage ? (
                    <>
                        <Image src={displayImage} alt={itemName} fill className="object-cover" />

                        {/* Botón eliminar */}
                        <button
                            onClick={handleRemoveImage}
                            className="absolute -top-1 -right-1 z-10 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:scale-110 transition-transform opacity-0 group-hover:opacity-100"
                            title="Eliminar imagen"
                        >
                            <X className="h-3 w-3" />
                        </button>

                        {/* Indicador de optimizado */}
                        {hasOptimizedImage && (
                            <div className="absolute bottom-0 left-0 right-0 bg-green-500/90 text-white text-[9px] font-bold text-center py-0.5">
                                ✓ IA
                            </div>
                        )}

                        {/* Spinner overlay */}
                        {isImageProcessing && (
                            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-20">
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        {isImageProcessing ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                            <Camera className="h-6 w-6 sm:h-8 sm:w-8 opacity-50" />
                        )}
                    </div>
                )}
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2 mt-2">
                {/* Subir imagen */}
                <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 bg-muted hover:bg-muted/80 border shadow-sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImageProcessing}
                    title="Subir foto"
                >
                    <Upload className="h-4 w-4" />
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileUpload}
                />

                {/* Generar con IA */}
                <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 bg-muted hover:bg-muted/80 border shadow-sm"
                    onClick={handleGenerateWithAI}
                    disabled={isImageProcessing || !itemName}
                    title="Generar con IA"
                >
                    <Wand2 className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                </Button>

                {/* Buscar en Google */}
                <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 bg-muted hover:bg-muted/80 border shadow-sm"
                    onClick={onSearchClick}
                    disabled={isImageProcessing || !itemName}
                    title="Buscar en Google"
                >
                    <Search className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                </Button>

                {/* Mejorar imagen */}
                {imageFile && !hasOptimizedImage && (
                    <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 bg-muted hover:bg-muted/80 border shadow-sm"
                        onClick={handleOptimizeImage}
                        disabled={isImageProcessing}
                        title="Mejorar fondo"
                    >
                        <Sparkles className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
                    </Button>
                )}
            </div>

            {canUseSuggested && suggestedImageUrl && onUseSuggestedImage && (
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[10px]"
                    onClick={() => onUseSuggestedImage(suggestedImageUrl)}
                >
                    Usar foto sugerida
                </Button>
            )}
        </div>
    );
}
