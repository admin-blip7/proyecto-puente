"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Product, CartItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  Search, ShoppingCart, QrCode, 
  Plus, Minus, Trash2, CreditCard, Banknote, Menu,
  Smartphone, Headphones, Zap, Wrench, Grid, Battery, 
  Wifi, Laptop, Monitor, Package
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import POSClient from "./POSClient";
import { ProductCategory } from "@/lib/services/categoryService";
import CheckoutDialog from "./CheckoutDialog";
import CodeScannerDialog from "./CodeScannerDialog";
import ScannedCodeResolutionDialog from "./ScannedCodeResolutionDialog";
import { useAuth } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import { findProductByScannedCode } from "@/lib/pos/scannedCode";

interface POSMobileLayoutProps {
  initialProducts: Product[];
  initialCategories?: ProductCategory[];
  onMenuOpen?: () => void;
}

// Category icon mapping
const getCategoryIcon = (category: string) => {
  const lower = category.toLowerCase();
  if (lower.includes('celular') || lower.includes('phone') || lower.includes('iphone')) return <Smartphone className="w-4 h-4" />;
  if (lower.includes('audio') || lower.includes('audifono') || lower.includes('bocina')) return <Headphones className="w-4 h-4" />;
  if (lower.includes('carga') || lower.includes('cargador') || lower.includes('cable')) return <Zap className="w-4 h-4" />;
  if (lower.includes('reparacion') || lower.includes('servicio')) return <Wrench className="w-4 h-4" />;
  if (lower.includes('funda') || lower.includes('case')) return <Grid className="w-4 h-4" />;
  if (lower.includes('bateria')) return <Battery className="w-4 h-4" />;
  if (lower.includes('internet') || lower.includes('wifi')) return <Wifi className="w-4 w-4" />;
  if (lower.includes('computo') || lower.includes('laptop')) return <Laptop className="w-4 h-4" />;
  if (lower.includes('pantalla')) return <Monitor className="w-4 h-4" />;
  return <Package className="w-4 h-4" />;
};

// Helper to get product image URL
const getProductImage = (product: Product): string | null => {
  if (product.imageUrls && product.imageUrls.length > 0) {
    return product.imageUrls[0];
  }
  return null;
};

export default function POSMobileLayout({ initialProducts, initialCategories = [], onMenuOpen }: POSMobileLayoutProps) {
  const isMobile = useIsMobile();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // During SSR or before hydration, use desktop layout to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);
  
  // ============ ALL HOOKS MUST BE BEFORE CONDITIONAL RETURN ============
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);
  const [isScannerOpen, setScannerOpen] = useState(false);
  const [unrecognizedCode, setUnrecognizedCode] = useState<string | null>(null);
  const [isResolutionOpen, setResolutionOpen] = useState(false);
  const [isAssociatingCode, setIsAssociatingCode] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  const handleResolutionOpenChange = useCallback((open: boolean) => {
    setResolutionOpen(open);
    if (!open && !isAssociatingCode) {
      setUnrecognizedCode(null);
    }
  }, [isAssociatingCode]);

  // Filtrar productos - useMemo MUST be before conditional return
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    if (selectedCategory !== "all") {
      filtered = filtered.filter(p => 
        p.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query) ||
        p.barcode?.includes(query)
      );
    }
    
    return filtered.slice(0, 30); // Limitar para performance mobile
  }, [products, selectedCategory, searchQuery]);

  // Categorías únicas - useMemo MUST be before conditional return
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return ["all", ...Array.from(cats)];
  }, [products]);

  // Cart helpers
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Desktop: usar POSClient normal (also during SSR)
  // IMPORTANT: All hooks (useState, useEffect, useMemo, useCallback) must be ABOVE this line
  if (!mounted || !isMobile) {
    return <POSClient initialProducts={initialProducts} initialCategories={initialCategories} />;
  }

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      // Add as CartItem (Product with quantity)
      return [...prev, { ...product, quantity: 1 }];
    });
    toast({
      title: "Agregado",
      description: `${product.name} agregado al carrito`,
    });
  };

  const handleCreateProductFromScan = useCallback(() => {
    if (!unrecognizedCode) return;
    setResolutionOpen(false);
    setUnrecognizedCode(null);
    router.push(`/admin/inventory/add?sku=${encodeURIComponent(unrecognizedCode)}`);
  }, [router, unrecognizedCode]);

  const handleAssociateCodeToProduct = useCallback(
    async (product: Product) => {
      if (!unrecognizedCode) return;
      setIsAssociatingCode(true);

      try {
        const response = await fetch("/api/products/assign-scanned-code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: product.id,
            scannedCode: unrecognizedCode,
          }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            typeof payload?.error === "string"
              ? payload.error
              : "No se pudo asociar el código."
          );
        }

        setProducts((currentProducts) =>
          currentProducts.map((currentProduct) =>
            currentProduct.id === product.id
              ? {
                  ...currentProduct,
                  sku:
                    typeof payload?.sku === "string" && payload.sku.trim()
                      ? payload.sku
                      : currentProduct.sku,
                  attributes: {
                    ...(currentProduct.attributes ?? {}),
                    barcode: unrecognizedCode,
                  },
                }
              : currentProduct
          )
        );

        setResolutionOpen(false);
        setUnrecognizedCode(null);
        toast({
          title: "Código asociado",
          description: `${unrecognizedCode} ahora pertenece a ${product.name}.`,
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "No se pudo asociar",
          description:
            error instanceof Error
              ? error.message
              : "Ocurrió un problema al guardar el código.",
        });
      } finally {
        setIsAssociatingCode(false);
      }
    },
    [toast, unrecognizedCode]
  );

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const handleCheckoutSuccess = async () => {
    clearCart();
    setShowCart(false);
    setCheckoutOpen(false);
    toast({
      title: "Venta completada",
      description: "La venta se registró correctamente",
    });
  };

  // Handle scanned barcode/QR
  const handleScannedCode = (code: string) => {
    const normalized = code.trim();
    setScannerOpen(false);
    const product = findProductByScannedCode(products, normalized);
    
    if (product) {
      addToCart(product);
      toast({
        title: "Producto encontrado",
        description: `${product.name} agregado al carrito`,
      });
    } else {
      setUnrecognizedCode(normalized);
      setResolutionOpen(true);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Mobile Header - Fixed */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background border-b">
        {/* Top row: Menu + Search + Actions */}
        <div className="flex items-center gap-2 p-3">
          <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={onMenuOpen}>
            <Menu className="h-6 w-6" />
          </Button>
          
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11 text-base"
            />
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-11 w-11 shrink-0"
            onClick={() => setScannerOpen(true)}
          >
            <QrCode className="h-5 w-5" />
          </Button>
        </div>

        {/* Categories - Horizontal Scroll */}
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 px-3 pb-3">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="h-9 px-3 shrink-0 rounded-full"
              >
                {cat === "all" ? "📦 Todo" : (
                  <span className="flex items-center gap-1.5">
                    {getCategoryIcon(cat)}
                    <span className="max-w-[80px] truncate">{cat}</span>
                  </span>
                )}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-[120px]" />

      {/* Products Grid - 2 columns for easy thumb reach */}
      <ScrollArea className="flex-1 pb-20">
        <div className="grid grid-cols-2 gap-3 p-3">
          {filteredProducts.map((product) => {
            const imageUrl = getProductImage(product);
            return (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="flex flex-col items-start p-3 bg-card rounded-xl border text-left transition-all active:scale-[0.98] active:bg-muted touch-manipulation min-h-[160px]"
              >
                {/* Product Image or Placeholder */}
                <div className="w-full aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                  {imageUrl ? (
                    <img 
                      src={imageUrl} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Package className="h-10 w-10 text-muted-foreground/50" />
                  )}
                </div>
                
                {/* Product Info */}
                <p className="text-sm font-medium line-clamp-2 leading-tight min-h-[40px]">
                  {product.name}
                </p>
                <p className="text-lg font-bold text-primary mt-auto">
                  {formatCurrency(product.price)}
                </p>
                {product.stock !== undefined && product.stock <= 5 && (
                  <Badge variant="destructive" className="mt-1 text-[10px] px-1.5 py-0">
                    Low: {product.stock}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
        
        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Package className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-base">No hay productos</p>
            <p className="text-sm">Intenta otra búsqueda o categoría</p>
          </div>
        )}
      </ScrollArea>

      {/* Cart Button - Fixed Bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-background/95 backdrop-blur border-t">
        <Sheet open={showCart} onOpenChange={setShowCart}>
          <SheetTrigger asChild>
            <Button 
              className="w-full h-14 text-lg font-semibold flex items-center justify-between rounded-xl shadow-lg"
              disabled={cart.length === 0}
            >
              <span className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Carrito
                {cartCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-6 px-2">
                    {cartCount}
                  </Badge>
                )}
              </span>
              <span className="text-xl">{formatCurrency(cartTotal)}</span>
            </Button>
          </SheetTrigger>
          
          <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0 flex flex-col">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="flex items-center justify-between text-lg">
                <span>🛒 Carrito ({cartCount})</span>
                <span className="text-primary text-xl">{formatCurrency(cartTotal)}</span>
              </SheetTitle>
            </SheetHeader>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {cart.map((item) => {
                  const itemImageUrl = getProductImage(item);
                  return (
                    <div 
                      key={item.id}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl"
                    >
                      {/* Product mini image */}
                      <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                        {itemImageUrl ? (
                          <img 
                            src={itemImageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="h-7 w-7 text-muted-foreground" />
                        )}
                      </div>
                      
                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1">{item.name}</p>
                        <p className="text-primary font-bold">{formatCurrency(item.price)}</p>
                        <p className="text-xs text-muted-foreground">
                          Subtotal: {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                      
                      {/* Quantity controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-full"
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-bold text-lg">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-full"
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Remove */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            
            {/* Payment buttons */}
            <div className="p-4 border-t bg-background space-y-3">
              <Button 
                className="w-full h-14 text-lg font-semibold rounded-xl" 
                size="lg"
                onClick={() => {
                  setShowCart(false);
                  setCheckoutOpen(true);
                }}
              >
                <CreditCard className="mr-2 h-5 w-5" />
                Cobrar {formatCurrency(cartTotal)}
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="h-12 rounded-xl"
                  onClick={() => {
                    setShowCart(false);
                    setCheckoutOpen(true);
                  }}
                >
                  <Banknote className="mr-2 h-4 w-4" />
                  Efectivo
                </Button>
                <Button 
                  variant="outline" 
                  className="h-12 rounded-xl"
                  onClick={() => {
                    setShowCart(false);
                    setCheckoutOpen(true);
                  }}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Tarjeta
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Checkout Dialog */}
      <CheckoutDialog
        isOpen={isCheckoutOpen}
        onOpenChange={setCheckoutOpen}
        cartItems={cart}
        totalAmount={cartTotal}
        onSuccessfulSale={handleCheckoutSuccess}
        activeSessionId={undefined}
      />

      {/* Barcode/QR Scanner Dialog */}
      <CodeScannerDialog
        open={isScannerOpen}
        onOpenChange={setScannerOpen}
        onResult={handleScannedCode}
      />
      <ScannedCodeResolutionDialog
        open={isResolutionOpen}
        scannedCode={unrecognizedCode}
        products={products}
        isSaving={isAssociatingCode}
        onOpenChange={handleResolutionOpenChange}
        onCreateNew={handleCreateProductFromScan}
        onAssociate={handleAssociateCodeToProduct}
      />
    </div>
  );
}
