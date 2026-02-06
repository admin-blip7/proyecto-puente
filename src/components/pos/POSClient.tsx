"use client";

import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { Product, CartItem, CashSession, ClientProfile, Expense, Sale, Income } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProductCard from "./ProductCard";
import ShoppingCart from "./ShoppingCart";
import { Button } from "../ui/button";
import { Header } from "../shared/Header";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ShoppingCartIcon, PlusCircle, Package, Lock, Unlock, Search, QrCode, Clock, Wrench, Smartphone, Headphones, Zap, Grid, Speaker, Battery, Wifi, Monitor, Laptop, Keyboard } from "lucide-react";

import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import RecargasDialog from "./RecargasDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { useIsMobile } from "@/hooks/use-mobile";
import { getCurrentOpenSession, openCashSession, closeCashSession, depositToCajaChica, getLastClosedSession } from "@/lib/services/cashSessionService";
import { getExpensesBySession } from "@/lib/services/financeService";
import { getIncomesBySession } from "@/lib/services/incomeService";
import { getSalesBySession } from "@/lib/services/salesService";
import { useAuth } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import OpenSessionWizard from "./OpenSessionWizard";
import CloseCashDrawerDialog from "./CloseCashDrawerDialog";
// Dialog now repurposed as Success/Summary dialog
import CashDepositVerificationDialog from "./CashDepositVerificationDialog";

import { getSales } from "@/lib/services/salesService";

import { Skeleton } from "../ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import BuscadorCompatibilidad from "./BuscadorCompatibilidad";
import { getProducts } from "@/lib/services/productService";
import CodeScannerDialog from "./CodeScannerDialog";

import { getReadyRepairs } from "@/lib/services/repairService";
import { RepairOrder } from "@/types";
import SalesHistoryDialog from "./SalesHistoryDialog";


// Helper for category icons
const getCategoryIcon = (category: string) => {
  const lower = category.toLowerCase();
  if (lower.includes('celular') || lower.includes('phone') || lower.includes('iphone')) return <Smartphone className="w-4 h-4" />;
  if (lower.includes('audio') || lower.includes('audifono') || lower.includes('bocina')) return <Headphones className="w-4 h-4" />;
  if (lower.includes('carga') || lower.includes('cargador') || lower.includes('cable') || lower.includes('magsafe')) return <Zap className="w-4 h-4" />;
  if (lower.includes('reparacion') || lower.includes('servicio') || lower.includes('microsoldadura')) return <Wrench className="w-4 h-4" />;
  if (lower.includes('funda') || lower.includes('case') || lower.includes('protector')) return <Grid className="w-4 h-4" />;
  if (lower.includes('bateria') || lower.includes('pila')) return <Battery className="w-4 h-4" />;
  if (lower.includes('internet') || lower.includes('wifi')) return <Wifi className="w-4 h-4" />;
  if (lower.includes('computo') || lower.includes('laptop')) return <Laptop className="w-4 h-4" />;
  if (lower.includes('pantalla') || lower.includes('display')) return <Monitor className="w-4 h-4" />;
  if (lower.includes('accesorios')) return <Zap className="w-4 h-4" />;

  return <Package className="w-4 h-4" />;
};

import { ProductCategory } from "@/lib/services/categoryService";
// ... other imports

interface POSClientProps {
  initialProducts: Product[];
  initialCategories?: ProductCategory[];
}

export default function POSClient({ initialProducts, initialCategories = [] }: POSClientProps) {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const printOperationRef = useRef({ isActive: false });

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCartItem, setSelectedCartItem] = useState<CartItem | null>(null);
  const [activeSession, setActiveSession] = useState<CashSession | null | undefined>(undefined); // undefined means loading
  const [isOpeningDrawer, setOpeningDrawer] = useState(false);
  const [isClosingDrawer, setClosingDrawer] = useState(false);
  const [showDepositVerification, setShowDepositVerification] = useState(false);
  const [closedSessionData, setClosedSessionData] = useState<CashSession | null>(null);
  const [lastClosedSession, setLastClosedSession] = useState<CashSession | null>(null);
  const [showBuscadorCompatibilidad, setShowBuscadorCompatibilidad] = useState(false);
  const [isScannerOpen, setScannerOpen] = useState(false);
  const [showRepairsDialog, setShowRepairsDialog] = useState(false);

  const [showDailySales, setShowDailySales] = useState(false);
  const [showRecargasDialog, setShowRecargasDialog] = useState(false);
  const lastScanRef = useRef<{ code: string; ts: number } | null>(null);

  // Derive unique categories with counts
  const categories = useMemo(() => {
    // If we have initialCategories from DB, use them as base
    if (initialCategories && initialCategories.length > 0) {
      const categoryCounts = new Map<string, number>();

      // Initialize counts for known categories
      initialCategories.forEach(cat => {
        categoryCounts.set(cat.label, 0);
      });
      categoryCounts.set('Otros', 0); // Always have 'Otros'

      // Count products
      products.forEach(p => {
        // Match product category to available categories (case insensitive)
        const pCatName = p.categoryName || (p.categoryId ? p.categoryId : '');
        const pCategory = p.category || '';

        let matched = false;

        // Try precise match with label
        if (categoryCounts.has(pCategory)) {
          categoryCounts.set(pCategory, (categoryCounts.get(pCategory) || 0) + 1);
          matched = true;
        }
        // Try match with categoryName
        else if (categoryCounts.has(pCatName)) {
          categoryCounts.set(pCatName, (categoryCounts.get(pCatName) || 0) + 1);
          matched = true;
        }
        // Try finding case-insensitive match
        else {
          const lowerName = (pCategory || pCatName).toLowerCase();
          for (const knownCat of initialCategories) {
            if (knownCat.label.toLowerCase() === lowerName || knownCat.value.toLowerCase() === lowerName) {
              categoryCounts.set(knownCat.label, (categoryCounts.get(knownCat.label) || 0) + 1);
              matched = true;
              break;
            }
          }
        }

        if (!matched) {
          categoryCounts.set('Otros', (categoryCounts.get('Otros') || 0) + 1);
        }
      });

      // Convert to array and filter out empty categories if configured to do so (optional, generally good to show all available)
      // For now, let's show all categories that have products OR are in the initial list.
      // But user likely wants to see buttons for defined categories.

      return Array.from(categoryCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .filter(c => c.count > 0 || c.name !== 'Otros') // Show categories even if count is 0? Maybe better to hide empty ones to save space
        .sort((a, b) => {
          if (a.name === 'Otros') return 1;
          if (b.name === 'Otros') return -1;
          return b.count - a.count;
        });

    } else {
      // Fallback to extracting from products if no categories provided
      const categoryMap = new Map<string, number>();
      products.forEach(p => {
        const cat = p.categoryName || (p.categoryId ? p.categoryId.charAt(0).toUpperCase() + p.categoryId.slice(1) : 'Otros');
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
      });
      return Array.from(categoryMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    }
  }, [products, initialCategories]);

  const handleAddRepairToCart = (repair: RepairOrder) => {
    const repairProduct: Product = {
      id: `repair-${repair.id}`,
      sku: `REP-${repair.orderId}`,
      name: `Reparación #${repair.orderId} - ${repair.deviceModel}`,
      description: repair.reportedIssue,
      price: repair.totalPrice,
      cost: repair.totalCost,
      stock: 1,
      minStock: 0,
      categoryId: 'services',
      categoryName: 'Servicios',
      type: 'Servicio',
      ownershipType: 'Propio',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const cartItem: CartItem = {
      ...repairProduct,
      quantity: 1,
      repairId: repair.id
    };

    setCart(prev => [...prev, cartItem]);
    toast({
      title: "Reparación agregada",
      description: `Orden #${repair.orderId} agregada al carrito.`
    });
  };


  // Function to refresh products from the database
  const refreshProducts = useCallback(async () => {
    try {
      const updatedProducts = await getProducts();
      setProducts(updatedProducts);

      // Also refresh the active session to get updated totals
      if (userProfile) {
        const session = await getCurrentOpenSession(userProfile.uid);
        setActiveSession(session);
      }
    } catch (error) {
      console.error('Error refreshing products:', error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar los productos",
        variant: "destructive",
      });
    }
  }, [toast, userProfile]);

  useEffect(() => {
    if (userProfile) {
      getCurrentOpenSession(userProfile.uid).then(setActiveSession);

      // FORCE CLEAR any residual localStorage item that might be causing the dialog to pop up
      localStorage.removeItem('pendingDepositVerification');
    }
  }, [userProfile]);




  const addToCart = (product: Product, quantity: number = 1) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);

      const fullProduct = products.find(p => p.id === product.id);
      if (!fullProduct) return prevCart; // Should not happen

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity <= fullProduct.stock) {
          return prevCart.map((item) =>
            item.id === product.id ? { ...item, quantity: newQuantity } : item
          );
        }
        return prevCart;
      }
      if (quantity <= fullProduct.stock) {
        const newItem = { ...fullProduct, quantity: quantity };
        if (prevCart.length === 0) {
          setSelectedCartItem(newItem);
        }
        return [...prevCart, newItem];
      }
      return prevCart;
    });
  };

  const addComboToCart = (product: Product) => {
    if (!product.comboProductIds) return;
    product.comboProductIds.forEach(productId => {
      const productToAdd = products.find(p => p.id === productId);
      if (productToAdd) {
        addToCart(productToAdd, 1);
      }
    })
  }

  const updateQuantity = (productId: string, quantity: number) => {
    setCart((prevCart) => {
      const productInStock = products.find(p => p.id === productId);
      if (!productInStock) return prevCart;

      const newQuantity = Math.max(0, Math.min(quantity, productInStock.stock));

      if (newQuantity === 0) {
        const newCart = prevCart.filter((item) => item.id !== productId);
        if (selectedCartItem?.id === productId) {
          const newSelectedItem = newCart.length > 0 ? newCart[0] : null;
          setSelectedCartItem(newSelectedItem);
        }
        return newCart;
      }
      return prevCart.map((item) =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      );
    });
  };

  // Update item price (for manual discounts)
  const updateItemPrice = (productId: string, newPrice: number) => {
    setCart((prevCart) => {
      return prevCart.map((item) =>
        item.id === productId
          ? { ...item, price: Math.max(0, newPrice) }
          : item
      );
    });
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCartItem(null);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(
      (product) => {
        const matchesSearch = (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.sku.toLowerCase().includes(searchQuery.toLowerCase()));

        // Determine product category label consistent with 'categories' useMemo
        let pCat = 'Otros';

        if (initialCategories && initialCategories.length > 0) {
          const pCatName = product.categoryName || (product.categoryId ? product.categoryId : '');
          const pCategory = product.category || '';
          const lowerName = (pCategory || pCatName).toLowerCase();

          // Try precise match with category field
          const exactMatch = initialCategories.find(c => c.label === pCategory);
          if (exactMatch) {
            pCat = exactMatch.label;
          } else {
            // Try loose match
            const found = initialCategories.find(c => c.label.toLowerCase() === lowerName || c.value.toLowerCase() === lowerName);
            if (found) {
              pCat = found.label;
            } else if (pCategory) {
              // If we have a category string but it didn't match known ones, use it as is? 
              // No, the 'categories' useMemo logic falls back to 'Otros' if not matched in initialCategories.
              // But we used categoryCounts.has(pCategory) there.
              // Actually, looking at my 'categories' logic:
              // 1. Initialize counts for known categories.
              // 2. Check if product category is in map.
              // So if product.category is "Foo" and initialCategories doesn't have "Foo", it goes to 'Otros' UNLESS I explicitly add it.
              // In 'categories' useMemo, I only initialized map with known categories (and 'Otros').
              // So if it's not known, it goes to 'Otros'.
              pCat = 'Otros';
            }
          }

          // If product has a categoryName that effectively matches one of our labels, use it
          if (pCat === 'Otros') {
            // Check if pCatName matches a label directly?
            const foundByName = initialCategories.find(c => c.label === pCatName);
            if (foundByName) pCat = foundByName.label;
          }

        } else {
          // Fallback logic
          pCat = product.categoryName || (product.categoryId ? product.categoryId.charAt(0).toUpperCase() + product.categoryId.slice(1) : 'Otros');
        }

        const matchesCategory = selectedCategory === "all" || pCat === selectedCategory;

        return matchesSearch && matchesCategory && product.type === 'Venta';
      }
    );
  }, [products, searchQuery, selectedCategory, initialCategories]);

  const selectedProductDetails = useMemo(() => {
    if (!selectedCartItem) return null;
    return products.find(p => p.id === selectedCartItem.id);
  }, [selectedCartItem, products]);

  const comboProducts = useMemo(() => {
    if (!selectedProductDetails || !selectedProductDetails.comboProductIds) return [];
    return selectedProductDetails.comboProductIds.map(id => products.find(p => p.id === id)).filter(Boolean) as Product[];
  }, [selectedProductDetails, products]);

  const totalCartItems = useMemo(() => {


    return cart.reduce((total, item) => total + item.quantity, 0);
  }, [cart]);

  // Load last closed session when opening drawer
  useEffect(() => {
    if (isOpeningDrawer) {
      getLastClosedSession().then(setLastClosedSession);
    }
  }, [isOpeningDrawer]);

  /**
   * REFACTORING NOTE: Simplified handleOpenDrawer - Removed all bag-related parameters
   * 
   * Now only requires:
   * - startingFloat: Initial cash amount in drawer
   * - previousSessionConfirmedAt: Optional timestamp when previous session was confirmed
   * 
   * Removed complexity:
   * - No more bagsStartAmounts parameter
   * - No more tracking individual bag balances
   */
  const handleOpenDrawer = async (startingFloat: number, previousSessionConfirmedAt?: Date) => {
    if (!userProfile) return;
    try {
      // SIMPLIFICATION: Pass only starting float, removed bagsStartAmounts
      const newSession = await openCashSession(userProfile.uid, userProfile.name, startingFloat, previousSessionConfirmedAt);
      setActiveSession(newSession);
      setOpeningDrawer(false);
      toast({ title: "Turno Abierto", description: "La caja está lista para registrar ventas." })
    } catch (error) {
      toast({ variant: 'destructive', title: "Error", description: "No se pudo abrir el turno de caja." })
    }
  }

  /**
   * CASH FLOAT MANAGEMENT FEATURE: Enhanced handleCloseDrawer with float support
   *
   * Now requires:
   * - actualCash: Total cash counted in drawer
   * - depositAccountId: Target account for deposit
   * - closingFloat: Amount to leave in drawer for next shift (float money)
   *
   * CASH FLOAT MANAGEMENT ADDED BACK:
   * - closingFloat parameter to retain change money between shifts
   * - Only net amount (actualCash - closingFloat) is deposited
   * - Float money stays in drawer and is NOT deposited
   *
   * Removed complexity (from refactoring):
   * - No more bagsSalesAmounts tracking
   * - No more bagsActualEndAmounts calculations
   * - No more balanceBagAccountId (single deposit account)
   * - No more dailySalesAccountId (consolidated into deposit)
   *
   * The process with float management:
   * - User enters total cash counted
   * - User enters amount to leave for next shift (closing float)
   * - User selects target deposit account
   * - Only net amount (actualCash - closingFloat) is deposited to account
   */
  const handleCloseDrawer = async (actualCash: number, depositAccountId: string, closingFloat: number) => {
    if (!userProfile || !activeSession) return;

    console.log('🔄 [SESSION] handleCloseDrawer called with actualCash:', actualCash);
    console.log('🔄 [SESSION] Closing float:', closingFloat);
    console.log('🔄 [SESSION] Deposit Account:', depositAccountId);
    console.log('🔄 [SESSION] Active session:', activeSession.sessionId);

    try {
      console.log('🔄 [SESSION] Closing cash session...');
      // CASH FLOAT MANAGEMENT: Pass closing float to persist amount left for next shift
      const closedSession = await closeCashSession(activeSession, userProfile.uid, userProfile.name, actualCash, depositAccountId, closingFloat);
      console.log('✅ [SESSION] Cash session closed:', closedSession.sessionId);

      setActiveSession(null);
      setClosingDrawer(false);

      setClosedSessionData(closedSession);

      // CASH FLOAT MANAGEMENT: Include float information in success message
      const message = closingFloat > 0
        ? `Turno cerrado. ${formatCurrency(actualCash - closingFloat)} depositados. ${formatCurrency(closingFloat)} dejados como fondo de cambio.`
        : `Turno cerrado. ${formatCurrency(actualCash)} depositados en cuenta seleccionada.`;

      toast({
        title: "✅ Turno Cerrado",
        description: message,
      });

      console.log('✅ [SESSION] Session closed, printing ticket...');
      // Auto-print first
      await printCashCloseTicket(closedSession);

      // Show success dialog
      setShowDepositVerification(true);
    } catch (error) {
      console.error('❌ [SESSION] Error closing drawer:', error);
      toast({ variant: 'destructive', title: "❌ Error", description: "No se pudo cerrar el turno de caja." })
    }
  }





  /* 
   * NEW IMPLIES @libpdf/core 
   */
  const printCashCloseTicket = async (session: CashSession) => {
    if (printOperationRef.current.isActive) return;
    printOperationRef.current.isActive = true;

    console.log('🔄 [TICKET] Preparing ticket for session:', session.sessionId);
    toast({
      title: "Generando ticket...",
      description: "Por favor espere..."
    });

    try {
      const expenses = await getExpensesBySession(
        session.id,
        session.openedAt ? new Date(session.openedAt) : undefined,
        session.closedAt ? new Date(session.closedAt) : new Date()
      );

      const incomes = await getIncomesBySession(
        session.id,
        session.openedAt ? new Date(session.openedAt) : undefined,
        session.closedAt ? new Date(session.closedAt) : new Date()
      );

      const sales = await getSalesBySession(
        session.id,
        session.openedBy,
        session.openedAt ? new Date(session.openedAt) : undefined,
        session.closedAt ? new Date(session.closedAt) : new Date()
      );

      await generateAndPrintPdf({ session, sales, expenses, incomes });

    } catch (error) {
      console.error('❌ [TICKET] Error fetching data:', error);
      toast({
        title: "Error",
        description: "No se pudieron obtener los datos para el ticket",
        variant: "destructive"
      });
    } finally {
      printOperationRef.current.isActive = false;
    }
  };

  const generateAndPrintPdf = async (data: { session: CashSession, sales: any[], expenses: any[], incomes: any[] }) => {
    try {
      console.log('🔄 [TICKET] Generando PDF programático...');
      const { generateCashClosePdf } = await import('@/lib/services/cashClosePdfService');

      const pdfBlob = await generateCashClosePdf(data);
      const blobUrl = URL.createObjectURL(pdfBlob);

      // Use iframe to print
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);

      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.print();
        }
      }, 500);

      // Cleanup
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        URL.revokeObjectURL(blobUrl);
      }, 60000);

    } catch (error) {
      console.error('❌ [TICKET] Error generating PDF:', error);
      toast({
        title: "Error al generar ticket",
        description: "Hubo un problema al crear el PDF.",
        variant: "destructive"
      });
    }
  };


  // Helper to format currency
  const formatCurrencyVal = (value: number | undefined) => {
    if (value === undefined || value === null) return '$0.00';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  };

  // Helper to format date
  const formatDateVal = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('es-ES');
  };




  // Create a DOM element directly for printing




  const sanitize = (s: string) => s.toLowerCase().replace(/[\s\-_.]/g, "");

  const tryFindProductByCode = (codeRaw: string): Product | undefined => {
    const code = codeRaw.trim();
    const lower = code.toLowerCase();
    const sanitized = sanitize(code);

    // Direct exact matches first
    let match = products.find(p => p.sku?.trim().toLowerCase() === lower || p.id?.toLowerCase() === lower || p.id === code);
    if (match) return match;

    // Sanitized compare (ignoring separators)
    match = products.find(p => sanitize(p.sku || "") === sanitized || sanitize(p.id || "") === sanitized);
    if (match) return match;

    // Try to parse common patterns like SKU:xxxx or id=xxxx from QR text
    const skuMatch = code.match(/sku\s*[:=]\s*([A-Za-z0-9\-_.]+)/i);
    if (skuMatch?.[1]) {
      const m = products.find(p => p.sku?.trim().toLowerCase() === skuMatch[1].toLowerCase());
      if (m) return m;
    }
    const idMatch = code.match(/id\s*[:=]\s*([A-Za-z0-9\-_.]+)/i);
    if (idMatch?.[1]) {
      const m = products.find(p => p.id?.trim().toLowerCase() === idMatch[1].toLowerCase());
      if (m) return m;
    }

    // Optional: custom attributes
    try {
      match = products.find((p) => {
        const barcode = (p as any).attributes?.barcode || (p as any).attributes?.code;
        if (typeof barcode === 'string') {
          return sanitize(barcode) === sanitized;
        }
        return false;
      }) || undefined;
    } catch {
      // ignore
    }

    return match;
  };

  const handleScannedCode = (raw: string) => {
    const now = Date.now();
    const normalized = raw.trim();

    if (lastScanRef.current && lastScanRef.current.code === normalized && now - lastScanRef.current.ts < 1500) {
      return; // debounce duplicate rapid scans
    }
    lastScanRef.current = { code: normalized, ts: now };

    const product = tryFindProductByCode(normalized);
    if (!product) {
      toast({ title: "Código no reconocido", description: `No encontramos un producto para: ${normalized}`, variant: "destructive" });
      return;
    }

    if (product.stock <= 0) {
      toast({ title: "Sin inventario", description: `No hay stock disponible para ${product.name}.`, variant: "destructive" });
      return;
    }

    if (product.comboProductIds && product.comboProductIds.length > 0) {
      addComboToCart(product);
    } else {
      addToCart(product, 1);
    }

    toast({ title: "Producto agregado", description: `${product.name} agregado al carrito.` });
  };


  if (activeSession === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="space-y-4 w-full max-w-lg p-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    )
  }

  if (!activeSession) {
    return (
      <>
        <div className="h-full flex items-center justify-center">
          <div className="text-center space-y-4">
            <Lock className="h-16 w-16 mx-auto text-muted-foreground" />
            <h2 className="text-2xl font-bold">Caja Cerrada</h2>
            <p className="text-muted-foreground">Debes abrir un turno para poder empezar a vender.</p>
            <Button size="lg" onClick={() => setOpeningDrawer(true)}>
              <Unlock className="mr-2" />
              Abrir Turno
            </Button>
          </div>
        </div>
        <OpenSessionWizard
          isOpen={isOpeningDrawer}
          onOpenChange={setOpeningDrawer}
          onConfirm={handleOpenDrawer}
          lastClosedSession={lastClosedSession}
        />
        {closedSessionData && (
          <CashDepositVerificationDialog
            isOpen={showDepositVerification}
            onOpenChange={setShowDepositVerification}
            session={closedSessionData}
            onReprint={() => {
              if (closedSessionData) {
                printCashCloseTicket(closedSessionData);
              }
            }}
          />
        )}

      </>
    )
  }




  const todayDate = new Date().toISOString().split('T')[0];

  return (
    <>
      <SalesHistoryDialog
        isOpen={showDailySales}
        onOpenChange={setShowDailySales}
        allProducts={products}
        initialDate={todayDate}
      />
      <RecargasDialog
        isOpen={showRecargasDialog}
        onOpenChange={setShowRecargasDialog}
      />
      <div className="flex h-full bg-background-light dark:bg-background-dark overflow-hidden relative font-sans text-text-light dark:text-text-light">
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark overflow-hidden relative">
          {/* Header */}
          <div className="flex-shrink-0 px-8 py-6 bg-surface-light dark:bg-sidebar-bg border-b border-border-light dark:border-border flex justify-between items-center z-10 transition-colors">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Checkout Order</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="flex items-center gap-6">
              {/* Optional: Add header actions here if needed */}
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex items-center gap-2"
                onClick={() => setShowDailySales(true)}
              >
                <Clock className="w-4 h-4" />
                Ventas del Día
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex items-center gap-2"
                onClick={() => setShowRecargasDialog(true)}
              >
                <Smartphone className="w-4 h-4" />
                Activar Chip Telcel
              </Button>
              <div className="flex items-center gap-3 pl-6 border-l border-gray-200 dark:border-gray-700">
                <div className="flex flex-col text-right hidden sm:flex">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{userProfile?.name || 'Usuario'}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{userProfile?.role || 'Staff'}</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm">
                  {/* User Avatar Placeholder */}
                  <div className="w-full h-full bg-slate-300 flex items-center justify-center text-slate-500 font-bold">
                    {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="px-8 pt-6 pb-0">
            <div className="flex gap-4 items-center mb-2 overflow-x-auto no-scrollbar pb-2">
              <button
                onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}
                className={cn(
                  "px-5 py-2 rounded-full font-medium text-sm flex items-center gap-2 shadow-lg shadow-gray-200 dark:shadow-none whitespace-nowrap transition-all",
                  !searchQuery && selectedCategory === "all" ? "bg-gray-900 text-white dark:bg-primary" : "bg-white dark:bg-card border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                All Items <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full ml-1", !searchQuery && selectedCategory === "all" ? "bg-gray-700 dark:bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400")}>{products.length}</span>
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => { setSearchQuery(""); setSelectedCategory(cat.name); }}
                  className={cn(
                    "px-5 py-2 rounded-full font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap flex items-center gap-2",
                    selectedCategory === cat.name && !searchQuery
                      ? "bg-gray-900 text-white dark:bg-primary shadow-lg shadow-gray-200 dark:shadow-none"
                      : "bg-white dark:bg-card border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
                  )}
                >
                  {cat.name} <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full ml-1", selectedCategory === cat.name && !searchQuery ? "bg-gray-700 dark:bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400")}>{cat.count}</span>
                </button>
              ))}

              <div className="ml-auto relative hidden sm:block">
                <span className="absolute left-3 top-2.5 text-gray-400">
                  <Search className="w-5 h-5" />
                </span>
                <input
                  className="w-64 bg-white dark:bg-card border border-gray-200 dark:border-gray-700 rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400 shadow-sm"
                  placeholder="Buscar productos..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="sm:hidden ml-auto">
                <Button variant="ghost" size="icon" onClick={() => setShowBuscadorCompatibilidad(true)}>
                  <Search className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
              {filteredProducts.map((product, index) => (
                <ProductCard key={`${product.id}-${index}`} product={product} onAddToCart={() => addToCart(product)} />
              ))}
            </div>
          </div>
        </main>

        {/* Right Sidebar - Shopping Cart */}
        <aside className="hidden lg:flex w-[380px] flex-shrink-0 flex-col bg-white dark:bg-card border-l border-border-light dark:border-border z-20 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] h-full overflow-hidden">
          <ShoppingCart
            cartItems={cart}
            onUpdateQuantity={updateQuantity}
            onUpdatePrice={updateItemPrice}
            onClearCart={clearCart}
            selectedCartItem={selectedCartItem}
            onSelectItem={setSelectedCartItem}
            onAddToCart={addToCart}
            onCloseSession={() => setClosingDrawer(true)}
            onSuccessfulSale={refreshProducts}
            activeSessionId={activeSession?.id}
          />
        </aside>

        {/* Mobile Cart Sheet Button */}
        <div className="lg:hidden fixed bottom-4 right-4 z-50">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" className="w-16 h-16 rounded-full shadow-2xl bg-primary hover:bg-primary/90 text-white">
                <ShoppingCartIcon className="h-7 w-7" />
                {totalCartItems > 0 && (
                  <Badge variant="destructive" className="absolute top-0 right-0 -translate-x-1 translate-y-1 rounded-full px-2">
                    {totalCartItems}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-full sm:max-w-md">
              <ShoppingCart
                cartItems={cart}
                onUpdateQuantity={updateQuantity}
                onUpdatePrice={updateItemPrice}
                onClearCart={clearCart}
                selectedCartItem={selectedCartItem}
                onSelectItem={setSelectedCartItem}
                onAddToCart={addToCart}
                onCloseSession={() => setClosingDrawer(true)}
                onSuccessfulSale={refreshProducts}
                activeSessionId={activeSession?.id}
                isSheet={true}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* All the Dialogs and Modals */}
      <OpenSessionWizard
        isOpen={isOpeningDrawer}
        onOpenChange={setOpeningDrawer}
        onConfirm={handleOpenDrawer}
        lastClosedSession={lastClosedSession}
      />
      {closedSessionData && (
        <CashDepositVerificationDialog
          isOpen={showDepositVerification}
          onOpenChange={setShowDepositVerification}
          session={closedSessionData}
          onReprint={() => {
            if (closedSessionData) {
              printCashCloseTicket(closedSessionData);
            }
          }}
        />
      )}
      {showBuscadorCompatibilidad && (
        <BuscadorCompatibilidad
          onClose={() => setShowBuscadorCompatibilidad(false)}
          onAddToCart={addToCart}
        />
      )}
      <CodeScannerDialog
        open={isScannerOpen}
        onOpenChange={setScannerOpen}
        onResult={handleScannedCode}
      />
      <CloseCashDrawerDialog
        isOpen={isClosingDrawer}
        onOpenChange={setClosingDrawer}
        session={activeSession}
        onConfirm={handleCloseDrawer}
      />

      <RepairsDialog
        isOpen={showRepairsDialog}
        onOpenChange={setShowRepairsDialog}
        onAddRepair={handleAddRepairToCart}
      />

    </>
  );
}



function RepairsDialog({ isOpen, onOpenChange, onAddRepair }: { isOpen: boolean; onOpenChange: (open: boolean) => void; onAddRepair: (repair: RepairOrder) => void }) {
  const [repairs, setRepairs] = useState<RepairOrder[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getReadyRepairs()
        .then(setRepairs)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Reparaciones Listas para Entrega</DialogTitle>
          <DialogDescription>
            Selecciona una reparación para cobrarla en caja.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex justify-center p-4">Cargando...</div>
          ) : repairs.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground">No hay reparaciones listas para entrega.</div>
          ) : (
            <div className="space-y-2">
              {repairs.map((repair) => (
                <Card key={repair.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { onAddRepair(repair); onOpenChange(false); }}>
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <div className="font-bold">Orden #{repair.orderId}</div>
                      <div className="text-sm text-muted-foreground">{repair.customerName} - {repair.deviceModel}</div>
                      <div className="text-xs text-muted-foreground mt-1">{repair.reportedIssue}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{formatCurrency(repair.totalPrice)}</div>
                      <Badge variant="outline" className="mt-1">Listo</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
