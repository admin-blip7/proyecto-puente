"use client";

import { useState, useEffect } from "react";
import {
    Search,
    Image as ImageIcon,
    Loader2,
    Check,
    ChevronRight,
    ExternalLink,
    ZoomIn
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { searchProductImagesAction, downloadAndSaveImageAction } from "@/lib/actions/imageSearchActions";
import { STANDARD_IMAGE_SIZE } from "@/config/images";

interface SearchResult {
    original: string;
    thumbnail: string;
    title: string;
    source?: string;
    width?: number;
    height?: number;
}

interface ProductImageSearchProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    productName: string;
    onImageSelect: (imageFile: File, imageUrl: string) => void;
}

export function ProductImageSearch({
    open,
    onOpenChange,
    productName,
    onImageSelect
}: ProductImageSearchProps) {
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState(productName || "");
    const [isSearching, setIsSearching] = useState(false);
    const [isDownloading, setIsDownloading] = useState<string | null>(null);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [nextPageToken, setNextPageToken] = useState<string | null>(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [previewImage, setPreviewImage] = useState<SearchResult | null>(null);

    // Reset when dialog opens
    useEffect(() => {
        if (open) {
            setSearchQuery(productName);
            setResults([]);
            setSelectedImage(null);
            setNextPageToken(null);
            setPreviewImage(null);

            // Auto-search if product name exists
            if (productName && productName.length >= 3) {
                handleSearch(undefined, productName);
            }
        }
    }, [open, productName]);

    const handleSearch = async (pageToken?: string, queryOverride?: string) => {
        const query = (queryOverride || searchQuery).trim();

        if (!query || query.length < 2) {
            toast({
                variant: "destructive",
                title: "Search too short",
                description: "Enter at least 2 characters"
            });
            return;
        }

        if (pageToken) {
            setIsLoadingMore(true);
        } else {
            setIsSearching(true);
            setResults([]);
            setSelectedImage(null);
        }

        try {
            const response = await searchProductImagesAction(query, pageToken);

            if (response.success && response.results) {
                if (pageToken) {
                    setResults(prev => [...prev, ...response.results!]);
                } else {
                    setResults(response.results);
                }

                setNextPageToken(response.nextPageToken || null);

                if (response.results.length === 0) {
                    toast({
                        variant: "destructive",
                        title: "No results",
                        description: "No images found. Try a different name."
                    });
                }
            } else {
                throw new Error(response.error || "Search error");
            }
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Search failed",
                description: "Could not fetch images."
            });
        } finally {
            setIsSearching(false);
            setIsLoadingMore(false);
        }
    };

    const handleSelectImage = async (result: SearchResult) => {
        setSelectedImage(result.original);
        setIsDownloading(result.original);

        try {
            const response = await downloadAndSaveImageAction(result.original, searchQuery, result.thumbnail);

            if (response.success && response.file) {
                // Convert base64 to File
                const byteCharacters = atob(response.file.base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const file = new File([byteArray], response.file.name, {
                    type: response.file.type
                });

                onImageSelect(file, response.originalUrl);
                onOpenChange(false);

                toast({
                    title: "Image Saved",
                    description: `Image resized to ${STANDARD_IMAGE_SIZE.width}x${STANDARD_IMAGE_SIZE.height}px`
                });
            } else {
                throw new Error(response.error || "Download error");
            }
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not download image"
            });
            setSelectedImage(null);
        } finally {
            setIsDownloading(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                {/* Header */}
                <div className="border-b p-6 space-y-4">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <ImageIcon className="h-6 w-6 text-blue-500" />
                            Search Product Image
                        </DialogTitle>
                        <DialogDescription>
                            Search Google and select an image. It will be automatically resized to {STANDARD_IMAGE_SIZE.width}x{STANDARD_IMAGE_SIZE.height}px
                        </DialogDescription>
                    </DialogHeader>

                    {/* Search Bar */}
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSearch();
                                    }
                                }}
                                placeholder="Ex: USB Type-C Cable"
                                className="pl-10 h-11"
                                autoFocus
                            />
                        </div>
                        <Button
                            type="button"
                            onClick={() => handleSearch()}
                            disabled={isSearching}
                            size="lg"
                        >
                            {isSearching ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Searching...
                                </>
                            ) : (
                                <>
                                    <Search className="mr-2 h-4 w-4" />
                                    Search
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Results Grid */}
                <div className="flex-1 overflow-y-auto p-6 bg-muted/30">
                    {isSearching ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="text-center space-y-4">
                                <Loader2 className="h-16 w-16 animate-spin mx-auto text-primary" />
                                <div>
                                    <p className="font-medium">Searching images...</p>
                                    <p className="text-sm text-muted-foreground">This may take a few seconds</p>
                                </div>
                            </div>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="text-center space-y-3 max-w-md">
                                <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center">
                                    <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                                </div>
                                <div>
                                    <p className="font-medium">Enter product name</p>
                                    <p className="text-sm text-muted-foreground">
                                        Images will be searched on Google and resized automatically
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                                {results.map((result, index) => (
                                    <Card
                                        key={`${result.original}-${index}`}
                                        className={cn(
                                            "overflow-hidden cursor-pointer transition-all hover:shadow-xl group relative",
                                            selectedImage === result.original && "ring-2 ring-primary ring-offset-2 shadow-lg"
                                        )}
                                        onClick={() => !isDownloading && handleSelectImage(result)}
                                    >
                                        <CardContent className="p-0">
                                            <div className="aspect-square relative bg-muted">
                                                <img
                                                    src={result.thumbnail}
                                                    alt={result.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />

                                                {/* Overlay Actions */}
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            size="icon"
                                                            className="h-8 w-8 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSelectImage(result);
                                                            }}
                                                            title="Select this image"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="secondary"
                                                            className="h-8 w-8 shadow-sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPreviewImage(result);
                                                            }}
                                                            title="Zoom"
                                                        >
                                                            <ZoomIn className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="secondary"
                                                            className="h-8 w-8 shadow-sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                window.open(result.original, '_blank');
                                                            }}
                                                            title="Open original"
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Size Indicator */}
                                                {result.width && result.height && (
                                                    <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                                                        {result.width}x{result.height}
                                                    </div>
                                                )}

                                                {/* Download Indicator */}
                                                {isDownloading === result.original && (
                                                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                                        <div className="text-center space-y-2">
                                                            <Loader2 className="h-8 w-8 animate-spin text-white mx-auto" />
                                                            <p className="text-white text-xs">Resizing...</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Check when selected */}
                                                {selectedImage === result.original && !isDownloading && (
                                                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-lg">
                                                        <Check className="h-4 w-4" />
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {/* Load More */}
                            {nextPageToken && (
                                <div className="flex justify-center mt-6">
                                    <Button
                                        variant="outline"
                                        onClick={() => handleSearch(nextPageToken)}
                                        disabled={isLoadingMore}
                                    >
                                        {isLoadingMore ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Loading more...
                                            </>
                                        ) : (
                                            <>
                                                <ChevronRight className="mr-2 h-4 w-4" />
                                                Load more results
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}

                            {/* Footer Info */}
                            <div className="mt-6 text-center text-xs text-muted-foreground space-y-1">
                                <p>
                                    Results: {results.length} images
                                </p>
                                <p>
                                    All images are automatically resized to {STANDARD_IMAGE_SIZE.width}x{STANDARD_IMAGE_SIZE.height}px
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Preview Modal */}
                {previewImage && (
                    <div
                        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                        onClick={() => !isDownloading && setPreviewImage(null)}
                    >
                        <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
                            <div className="relative">
                                <img
                                    src={previewImage.original}
                                    alt={previewImage.title}
                                    className="max-w-full max-h-[80vh] object-contain rounded-md bg-white"
                                />
                                {isDownloading === previewImage.original && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-md">
                                        <Loader2 className="h-12 w-12 animate-spin text-white" />
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    size="lg"
                                    className="bg-green-600 hover:bg-green-700 text-white min-w-[200px]"
                                    onClick={() => handleSelectImage(previewImage)}
                                    disabled={!!isDownloading}
                                >
                                    {isDownloading === previewImage.original ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="mr-2 h-4 w-4" />
                                            Select This Image
                                        </>
                                    )}
                                </Button>
                                <Button
                                    size="lg"
                                    variant="secondary"
                                    onClick={() => setPreviewImage(null)}
                                    disabled={!!isDownloading}
                                >
                                    Close
                                </Button>
                            </div>

                            <Button
                                size="icon"
                                variant="secondary"
                                className="absolute -top-4 -right-4 rounded-full"
                                onClick={() => setPreviewImage(null)}
                                disabled={!!isDownloading}
                            >
                                <span className="text-xl">×</span>
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
