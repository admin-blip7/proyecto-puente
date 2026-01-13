"use client";

import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { Product, CartItem, CashSession, ClientProfile, Expense, Sale, Income } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProductCard from "./ProductCard";
import ShoppingCart from "./ShoppingCart";
import { Button } from "../ui/button";
import { Header } from "../shared/Header";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ShoppingCartIcon, PlusCircle, Package, Lock, Unlock, Search, QrCode, Clock, Wrench } from "lucide-react";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
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
import CashDepositVerificationDialog from "./CashDepositVerificationDialog";

import { getSales } from "@/lib/services/salesService";
import CashCloseTicket from "./CashCloseTicket";
import { Skeleton } from "../ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import BuscadorCompatibilidad from "./BuscadorCompatibilidad";
import { getProducts } from "@/lib/services/productService";
import CodeScannerDialog from "./CodeScannerDialog";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { getReadyRepairs } from "@/lib/services/repairService";
import { RepairOrder } from "@/types";


interface POSClientProps {
  initialProducts: Product[];
}

export default function POSClient({ initialProducts }: POSClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
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
  const [printTicketSession, setPrintTicketSession] = useState<CashSession | null>(null);
  const [ticketExpenses, setTicketExpenses] = useState<Expense[]>([]);
  const [ticketIncomes, setTicketIncomes] = useState<Income[]>([]);
  const [ticketSales, setTicketSales] = useState<Sale[]>([]);
  const [ticketReady, setTicketReady] = useState(false);
  const lastScanRef = useRef<{ code: string; ts: number } | null>(null);

  const handleAddRepairToCart = (repair: RepairOrder) => {
    const repairProduct: Product = {
      id: `repair-${repair.id}`,
      firestore_id: `repair-${repair.id}`,
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
  const printWindowRef = useRef<Window | null>(null);
  const printOperationRef = useRef<{ isActive: boolean }>({ isActive: false });
  const ticketElementRef = useRef<HTMLDivElement | null>(null);
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

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

  useEffect(() => {
    if (printTicketSession) {
      console.log('🔄 [TICKET] printTicketSession changed, setting ticketReady after delay...');
      // Add a small delay to ensure React has time to render the element
      const timeoutId = setTimeout(() => {
        console.log('✅ [TICKET] Setting ticketReady to true');
        setTicketReady(true);
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setTicketReady(false);
    }
  }, [printTicketSession]);


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
      (product) =>
        (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.sku.toLowerCase().includes(searchQuery.toLowerCase())) &&
        product.type === 'Venta'
    );
  }, [products, searchQuery]);

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

  const handleOpenDrawer = async (startingFloat: number, bagsStartAmounts: Record<string, number>, previousSessionConfirmedAt?: Date) => {
    if (!userProfile) return;
    try {
      const newSession = await openCashSession(userProfile.uid, userProfile.name, startingFloat, bagsStartAmounts, previousSessionConfirmedAt);
      setActiveSession(newSession);
      setOpeningDrawer(false);
      toast({ title: "Turno Abierto", description: "La caja está lista para registrar ventas." })
    } catch (error) {
      toast({ variant: 'destructive', title: "Error", description: "No se pudo abrir el turno de caja." })
    }
  }

  const handleCloseDrawer = async (actualCash: number, bagsSalesAmounts: Record<string, number> = {}, bagsActualEndAmounts: Record<string, number> = {}) => {
    if (!userProfile || !activeSession) return;

    console.log('🔄 [SESSION] handleCloseDrawer called with actualCash:', actualCash);
    console.log('🔄 [SESSION] Bag Sales:', bagsSalesAmounts);
    console.log('🔄 [SESSION] Bag Actual Ends:', bagsActualEndAmounts);
    console.log('🔄 [SESSION] Active session:', activeSession.sessionId);

    try {
      console.log('🔄 [SESSION] Closing cash session...');
      const closedSession = await closeCashSession(activeSession, userProfile.uid, userProfile.name, actualCash, bagsSalesAmounts, bagsActualEndAmounts);
      console.log('✅ [SESSION] Cash session closed:', closedSession.sessionId);

      setActiveSession(null);
      setClosingDrawer(false);

      // Save closed session and print ticket directly
      setClosedSessionData(closedSession);

      toast({
        title: "✅ Turno Cerrado",
        description: `Se depositaron ${formatCurrency(actualCash)} a Caja Chica.`,
      });

      console.log('✅ [SESSION] Session closed, printing ticket...');
      await printCashCloseTicket(closedSession);

      // No need to show deposit verification anymore
      setShowDepositVerification(false);
    } catch (error) {
      console.error('❌ [SESSION] Error closing drawer:', error);
      toast({ variant: 'destructive', title: "❌ Error", description: "No se pudo cerrar el turno de caja." })
    }
  }



  const handleDepositConfirmation = async (depositAmount: number) => {
    if (!closedSessionData) return;

    console.log('🔄 [DEPOSIT] Confirming deposit:', depositAmount);

    try {
      await depositToCajaChica(closedSessionData.sessionId, depositAmount);
      console.log('✅ [DEPOSIT] Successfully deposited to Caja Chica');

      toast({
        title: "✅ Depósito Confirmado",
        description: `${formatCurrency(depositAmount)} agregados a Caja Chica`,
      });

      // Now print the ticket after deposit confirmation
      await printCashCloseTicket(closedSessionData);

      setClosedSessionData(null);
      setShowDepositVerification(false);
    } catch (error) {
      console.error('❌ [DEPOSIT] Error depositing to Caja Chica:', error);
      throw error; // Re-throw to let the dialog handle it
    }
  }

  const handleSkipDeposit = () => {
    console.log('⚠️ [DEPOSIT] User skipped deposit to Caja Chica');

    if (!closedSessionData) return;

    toast({
      title: "ℹ️ Depósito Omitido",
      description: "No se realizó depósito a Caja Chica",
    });

    // Print ticket even if deposit was skipped
    printCashCloseTicket(closedSessionData);

    setClosedSessionData(null);
    setShowDepositVerification(false);
  }

  const printCashCloseTicket = async (session: CashSession) => {
    console.log('🔄 [TICKET] Preparing ticket for session:', session.sessionId);

    // Fetch expenses and sales for this session
    try {
      const expenses = await getExpensesBySession(
        session.sessionId,
        session.openedAt ? new Date(session.openedAt) : undefined,
        session.closedAt ? new Date(session.closedAt) : new Date()
      );
      console.log('✅ [TICKET] Expenses fetched:', expenses.length);
      setTicketExpenses(expenses);

      const incomes = await getIncomesBySession(
        session.sessionId,
        session.openedAt ? new Date(session.openedAt) : undefined,
        session.closedAt ? new Date(session.closedAt) : new Date()
      );
      console.log('✅ [TICKET] Incomes fetched:', incomes.length);
      setTicketIncomes(incomes);

      const sales = await getSalesBySession(
        session.sessionId,
        session.openedBy,
        session.openedAt ? new Date(session.openedAt) : undefined,
        session.closedAt ? new Date(session.closedAt) : new Date()
      );
      console.log('✅ [TICKET] Sales fetched:', sales.length);
      setTicketSales(sales);
    } catch (error) {
      console.error('❌ [TICKET] Error fetching data:', error);
      setTicketExpenses([]);
      setTicketSales([]);
    }

    setPrintTicketSession(session);
    setTicketReady(true);
  };

  // Effect to create and print ticket
  useEffect(() => {
    if (ticketReady && printTicketSession && !printOperationRef.current.isActive) {
      console.log('🔄 [TICKET] useEffect triggered:', { ticketReady, printSessionId: printTicketSession.sessionId });
      printOperationRef.current.isActive = true;

      // Wait for a frame to ensure the effect has completed
      setTimeout(() => {
        // Create the ticket HTML string
        const ticketHtml = createTicketHtml(printTicketSession);

        // Proceed with printing
        console.log('✅ [TICKET] Ticket HTML ready, starting print...');
        printHtml(ticketHtml);

        setPrintTicketSession(null);
        printOperationRef.current.isActive = false;
      }, 100);

      return () => {
        printOperationRef.current.isActive = false;
      };
    }
  }, [ticketReady, printTicketSession, toast]);

  const printHtml = (htmlContent: string) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Ticket de Corte - ${new Date().toLocaleDateString()}</title>
            <style>
              body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 10px; }
              @media print {
                body { margin: 0; padding: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            ${htmlContent}
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      toast({
        title: '⚠️ Ventana bloqueada',
        description: 'Permita los popups para imprimir el ticket.',
        variant: 'destructive'
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

  const createTicketHtml = (session: CashSession): string => {
    // Group sales items by product
    const soldProducts: Record<string, { name: string; quantity: number; total: number }> = {};

    ticketSales.forEach(sale => {
      if (sale.status !== 'cancelled') {
        sale.items.forEach(item => {
          const key = item.name; // Group by name
          if (!soldProducts[key]) {
            soldProducts[key] = { name: item.name, quantity: 0, total: 0 };
          }
          soldProducts[key].quantity += item.quantity;
          soldProducts[key].total += (item.priceAtSale * item.quantity);
        });
      }
    });

    const soldProductsList = Object.values(soldProducts);

    return `
      <div style="width: 80mm; margin: 0 auto;">
        <div style="text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 10px;">
          REPORTE DE CORTE DE CAJA
        </div>
        <div style="text-align: center; font-size: 10px; margin-bottom: 10px;">
          22 ELECTRONIC GROUP
        </div>
        <div style="border-top: 1px dashed black; margin: 5px 0;"></div>

        <div><strong>Sesión:</strong> ${session.sessionId}</div>
        <div><strong>Cajero:</strong> ${session.closedByName || session.openedByName || 'N/A'}</div>
        <div><strong>Fecha Apertura:</strong> ${formatDateVal(session.openedAt?.toString())}</div>
        <div><strong>Fecha Cierre:</strong> ${formatDateVal(session.closedAt?.toString())}</div>

        <div style="border-top: 1px dashed black; margin: 5px 0;"></div>

        <div><strong>Productos Vendidos:</strong></div>
        ${soldProductsList.length > 0 ?
        soldProductsList.map(item => `
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
              <span>${item.quantity}x ${item.name}</span>
              <span>${formatCurrencyVal(item.total)}</span>
            </div>
          `).join('')
        : '<div style="font-style: italic;">No hubo ventas registradas</div>'
      }

        <div style="border-top: 1px dashed black; margin: 5px 0;"></div>

        <div><strong>Ventas Totales:</strong> ${formatCurrencyVal((session.totalCashSales || 0) + (session.totalCardSales || 0))}</div>
        <div><strong>Ventas en Efectivo:</strong> ${formatCurrencyVal(session.totalCashSales || 0)}</div>
        <div><strong>Ventas con Tarjeta:</strong> ${formatCurrencyVal(session.totalCardSales || 0)}</div>
        
        <div style="border-top: 1px dashed black; margin: 5px 0;"></div>

        <div><strong>Gastos (Salidas de Efectivo):</strong></div>
        ${ticketExpenses.length > 0 ?
        ticketExpenses.map(exp => `
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
              <span>${exp.description || exp.category}</span>
              <span>${formatCurrencyVal(exp.amount)}</span>
            </div>
          `).join('')
        : '<div style="font-style: italic;">No hubo gastos registrados</div>'
      }
        <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 2px;">
          <span>Total Gastos:</span>
          <span>${formatCurrencyVal(session.totalCashPayouts || 0)}</span>
        </div>

        <div style="border-top: 1px dashed black; margin: 5px 0;"></div>

        <div><strong>Ingresos (Entradas de Efectivo):</strong></div>
        ${ticketIncomes.length > 0 ?
        ticketIncomes.map(inc => `
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
              <span>${inc.description || inc.category}</span>
              <span>${formatCurrencyVal(inc.amount)}</span>
            </div>
          `).join('')
        : '<div style="font-style: italic;">No hubo ingresos registrados</div>'
      }
        <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 2px;">
          <span>Total Ingresos:</span>
          <span>${formatCurrencyVal(ticketIncomes.reduce((sum, i) => sum + i.amount, 0))}</span>
        </div>

        <div style="border-top: 1px dashed black; margin: 5px 0;"></div>

        <div><strong>Arqueo:</strong></div>
        <div>  Efectivo Inicial: ${formatCurrencyVal(session.startingFloat || 0)}</div>
        <div>  (+) Ventas Efectivo: ${formatCurrencyVal(session.totalCashSales || 0)}</div>
        <div>  (-) Gastos Efectivo: ${formatCurrencyVal(session.totalCashPayouts || 0)}</div>
        <div style="border-top: 1px dotted black; margin: 2px 0;"></div>
        <div>  Efectivo Esperado: ${formatCurrencyVal(session.expectedCashInDrawer || 0)}</div>
        <div>  Efectivo en Caja: ${formatCurrencyVal(session.actualCashCount || 0)}</div>
        <div>  <strong>Diferencia: ${formatCurrencyVal(session.difference || 0)}</strong></div>

        <div style="border-top: 1px dashed black; margin: 5px 0;"></div>
        <div><strong>Saldos de Bolsas:</strong></div>
        ${(['recargas', 'mimovil', 'servicios']).map(key => {
        // Cast to any to access dynamic props if TS complains, or rely on interface
        const start = (session.bagsStartAmounts as any)?.[key] || 0;
        const sale = (session.bagsSalesAmounts as any)?.[key] || 0;
        const end = (session.bagsEndAmounts as any)?.[key] || (start - sale);
        return `<div>  ${key.charAt(0).toUpperCase() + key.slice(1)}: ${formatCurrencyVal(start)} - ${formatCurrencyVal(sale)} = <strong>${formatCurrencyVal(end)}</strong></div>`;
      }).join('')}

        <div style="border-top: 1px dashed black; margin: 5px 0;"></div>
        <div style="text-align: center; font-size: 10px;">
          ¡Gracias por su preferencia!
        </div>
      </div>
    `;
  };

  // Create a DOM element directly for printing


  const downloadPdf = (pdf: jsPDF, filename: string) => {
    try {
      pdf.save(filename);
      console.log('✅ [TICKET] PDF downloaded successfully:', filename);
      toast({
        title: '📥 PDF descargado',
        description: `Archivo guardado: ${filename}`,
      });
    } catch (error) {
      console.error('❌ [TICKET] Error downloading PDF:', error);
      toast({
        title: '❌ Error al descargar',
        description: 'No se pudo descargar el PDF',
        variant: 'destructive',
      });
    }
  };

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
            onConfirm={handleDepositConfirmation}
            onSkip={handleSkipDeposit}
          />
        )}
      </>
    )
  }



  return (
    <>
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
          <div className="px-8 pt-6 pb-2">
            <div className="flex gap-4 items-center mb-6 overflow-x-auto no-scrollbar pb-2">
              <button
                onClick={() => setSearchQuery("")}
                className={cn(
                  "px-5 py-2 rounded-full font-medium text-sm flex items-center gap-2 shadow-lg shadow-gray-200 dark:shadow-none whitespace-nowrap transition-all",
                  !searchQuery ? "bg-gray-900 text-white dark:bg-primary" : "bg-white dark:bg-card border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                All Items <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full ml-1", !searchQuery ? "bg-gray-700 dark:bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400")}>{products.length}</span>
              </button>
              {/* Placeholder Categories - Logic for filtering could be added here */}
              <button className="px-5 py-2 rounded-full bg-white dark:bg-card border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap flex items-center gap-2">
                Microsoldadura <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] px-1.5 py-0.5 rounded-full ml-1">12</span>
              </button>
              <button className="px-5 py-2 rounded-full bg-white dark:bg-card border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap flex items-center gap-2">
                Accesorios <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] px-1.5 py-0.5 rounded-full ml-1">45</span>
              </button>

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
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
          onConfirm={handleDepositConfirmation}
          onSkip={handleSkipDeposit}
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
      {
        printTicketSession && (
          <div ref={ticketElementRef} style={{ position: 'absolute', left: '-9999px', top: '0', width: '80mm' }}>
            <CashCloseTicket
              id="cash-close-ticket"
              session={printTicketSession}
            />
          </div>
        )
      }
      <RepairsDialog
        isOpen={showRepairsDialog}
        onOpenChange={setShowRepairsDialog}
        onAddRepair={handleAddRepairToCart}
      />
      {/* Hidden ticket for printing */}
      {
        printTicketSession && (
          <div ref={ticketElementRef} style={{ position: 'absolute', left: '-9999px', top: '0', width: '80mm' }}>
            <CashCloseTicket
              id="cash-close-ticket"
              session={printTicketSession}
            />
          </div>
        )
      }
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
