"use client";

import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { Product, CartItem, CashSession, ClientProfile } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProductCard from "./ProductCard";
import ShoppingCart from "./ShoppingCart";
import { Button } from "../ui/button";
import { Header } from "../shared/Header";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ShoppingCartIcon, PlusCircle, Package, Lock, Unlock, Search, QrCode } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";

import { useIsMobile } from "@/hooks/use-mobile";
import { getCurrentOpenSession, openCashSession, closeCashSession } from "@/lib/services/cashSessionService";
import { useAuth } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import OpenCashDrawerDialog from "./OpenCashDrawerDialog";
import CloseCashDrawerDialog from "./CloseCashDrawerDialog";
import CashCloseTicket from "./CashCloseTicket";
import { Skeleton } from "../ui/skeleton";
import CreateFinancePlanDialog from "./CreateFinancePlanDialog";
import { getClientsWithCredit } from "@/lib/services/creditService";
import { formatCurrency } from "@/lib/utils";
import BuscadorCompatibilidad from "./BuscadorCompatibilidad";
import { getProducts } from "@/lib/services/productService";
import CodeScannerDialog from "./CodeScannerDialog";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";


interface POSClientProps {
  initialProducts: Product[];
}

export default function POSClient({ initialProducts }: POSClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [allClients, setAllClients] = useState<ClientProfile[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCartItem, setSelectedCartItem] = useState<CartItem | null>(null);
  const [activeSession, setActiveSession] = useState<CashSession | null | undefined>(undefined); // undefined means loading
  const [isOpeningDrawer, setOpeningDrawer] = useState(false);
  const [isClosingDrawer, setClosingDrawer] = useState(false);
  const [isFinancePlanOpen, setFinancePlanOpen] = useState(false);
  const [showBuscadorCompatibilidad, setShowBuscadorCompatibilidad] = useState(false);
  const [isScannerOpen, setScannerOpen] = useState(false);
  const [printTicketSession, setPrintTicketSession] = useState<CashSession | null>(null);
  const [ticketReady, setTicketReady] = useState(false);
  const lastScanRef = useRef<{ code: string; ts: number } | null>(null);
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
    } catch (error) {
      console.error('Error refreshing products:', error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar los productos",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    if (userProfile) {
      getCurrentOpenSession(userProfile.uid).then(setActiveSession);
      getClientsWithCredit().then(setAllClients);
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
         if(selectedCartItem?.id === productId) {
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

  const handleOpenDrawer = async (startingFloat: number) => {
    if (!userProfile) return;
    try {
        const newSession = await openCashSession(userProfile.uid, userProfile.name, startingFloat);
        setActiveSession(newSession);
        setOpeningDrawer(false);
        toast({ title: "Turno Abierto", description: "La caja está lista para registrar ventas."})
    } catch(error) {
        toast({ variant: 'destructive', title: "Error", description: "No se pudo abrir el turno de caja."})
    }
  }

  const handleCloseDrawer = async (actualCash: number) => {
    if (!userProfile || !activeSession) return;

    console.log('🔄 [TICKET] handleCloseDrawer called with actualCash:', actualCash);
    console.log('🔄 [TICKET] Active session:', activeSession.sessionId);

    try {
        console.log('🔄 [TICKET] Closing cash session...');
        const closedSession = await closeCashSession(activeSession, userProfile.uid, userProfile.name, actualCash);
        console.log('✅ [TICKET] Cash session closed:', closedSession.sessionId);

        setActiveSession(null);
        setClosingDrawer(false);

        // Generate and print cash close ticket
        console.log('🔄 [TICKET] Starting ticket printing process...');
        toast({
          title: '🔄 Cerrando turno...',
          description: 'Generando ticket de corte de caja...',
        });

        await printCashCloseTicket(closedSession);

        const difference = closedSession.difference || 0;
        const diffText = difference === 0 ? 'Sin diferencias' : `Diferencia: ${formatCurrency(difference)}`;
        toast({
          title: "✅ Turno Cerrado",
          description: `${diffText}. El ticket se está imprimiendo...`,
        });

        console.log('✅ [TICKET] Turno closed successfully, printing started');
    } catch(error) {
        console.error('❌ [TICKET] Error closing drawer:', error);
        toast({ variant: 'destructive', title: "❌ Error", description: "No se pudo cerrar el turno de caja."})
    }
  }

  const printCashCloseTicket = async (session: CashSession) => {
    console.log('🔄 [TICKET] printCashCloseTicket called with session:', session?.sessionId);

    // Validate session data
    if (!session?.sessionId) {
      console.error('❌ [TICKET] Invalid session data for printing:', session);
      toast({
        title: '❌ Error de Impresión',
        description: 'Datos de sesión inválidos',
        variant: 'destructive'
      });
      return;
    }

    console.log('✅ [TICKET] Session data validated:', {
      sessionId: session.sessionId,
      cashierName: session.closedByName || session.openedByName,
      openingTime: session.openedAt,
      closingTime: session.closedAt,
      totalSales: (session.totalCashSales || 0) + (session.totalCardSales || 0)
    });

    try {
      console.log('🔄 [TICKET] Setting printTicketSession state...');
      // Set session for printing - this will trigger the useEffect
      setPrintTicketSession(session);
      console.log('✅ [TICKET] printTicketSession state set, useEffect will trigger printing');
    } catch (error) {
      console.error('❌ [TICKET] Error setting printTicketSession:', error);
      toast({
        title: '❌ Error de Impresión',
        description: 'No se pudo iniciar la impresión del ticket de corte de caja',
        variant: 'destructive'
      });
      setPrintTicketSession(null);
    }
  };

  // Create a DOM element directly for printing
  const createTicketElement = useCallback((session: CashSession): HTMLElement => {
    const container = document.createElement('div');
    container.id = 'temp-ticket-' + session.sessionId;
    container.style.cssText = `
      width: 80mm;
      padding: 10px;
      background: white;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: black;
    `;

    const formatDate = (date: Date | undefined) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const formatCurrencyLocal = (value: number | undefined) => {
      if (value === undefined || value === null) return '$0.00';
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
      }).format(value);
    };

    const totalSales = (session.totalCashSales || 0) + (session.totalCardSales || 0);

    container.innerHTML = `
      <div style="text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 10px;">
        CORTE DE CAJA
      </div>
      <div style="text-align: center; font-size: 10px; margin-bottom: 10px;">
        22 ELECTRONIC GROUP
      </div>
      <div style="border-top: 1px dashed black; margin: 5px 0;"></div>

      <div><strong>Sesión:</strong> ${session.sessionId}</div>
      <div><strong>Cajero Apertura:</strong> ${session.openedByName || 'N/A'}</div>
      <div><strong>Cajero Cierre:</strong> ${session.closedByName || session.openedByName || 'N/A'}</div>
      <div><strong>Fecha Apertura:</strong> ${formatDate(session.openedAt)}</div>
      <div><strong>Fecha Cierre:</strong> ${formatDate(session.closedAt)}</div>

      <div style="border-top: 1px dashed black; margin: 5px 0;"></div>

      <div><strong>RESUMEN DE VENTAS:</strong></div>
      <div><strong>Total del Día:</strong> ${formatCurrencyLocal(totalSales)}</div>
      <div>  Efectivo: ${formatCurrencyLocal(session.totalCashSales || 0)}</div>
      <div>  Tarjeta: ${formatCurrencyLocal(session.totalCardSales || 0)}</div>
      <div>  Gastos de Caja: ${formatCurrencyLocal(session.totalCashPayouts || 0)}</div>

      <div style="border-top: 1px dashed black; margin: 5px 0;"></div>

      <div><strong>ARQUEO DE EFECTIVO:</strong></div>
      <div>  Fondo Inicial: ${formatCurrencyLocal(session.startingFloat || 0)}</div>
      <div>  Efectivo Esperado: ${formatCurrencyLocal(session.expectedCashInDrawer || 0)}</div>
      <div>  Efectivo Contado: ${formatCurrencyLocal(session.actualCashCount || 0)}</div>
      <div>  <strong>Diferencia: ${formatCurrencyLocal(session.difference || 0)}</strong></div>

      <div style="border-top: 1px dashed black; margin: 5px 0;"></div>
      <div style="text-align: center; font-size: 10px; margin-top: 10px;">
        *** CORTE DE CAJA FINALIZADO ***
      </div>
      <div style="text-align: center; font-size: 10px;">
        ¡Gracias por su preferencia!
      </div>
      <div style="text-align: center; font-size: 9px;">
        Este documento no es un comprobante fiscal
      </div>
    `;

    return container;
  }, []);

  const downloadPdf = useCallback((pdf: jsPDF, filename: string) => {
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
  }, [toast]);

  // Effect to create and print ticket
  useEffect(() => {
    if (ticketReady && printTicketSession && !printOperationRef.current.isActive) {
      console.log('🔄 [TICKET] useEffect triggered:', { ticketReady, printSessionId: printTicketSession.sessionId });
      printOperationRef.current.isActive = true;

      // Wait for a frame to ensure the effect has completed
      setTimeout(() => {
        // Create the ticket element programmatically
        const ticketElement = createTicketElement(printTicketSession);
        console.log('🔄 [TICKET] Creating ticket element programmatically...');
        console.log('🔄 [TICKET] Ticket element created:', {
          id: ticketElement.id,
          tagName: ticketElement.tagName,
          hasChildren: ticketElement.children.length
        });

        // Append to body temporarily for html2canvas to capture
        ticketElement.style.position = 'absolute';
        ticketElement.style.left = '-9999px';
        ticketElement.style.top = '0';
        document.body.appendChild(ticketElement);

        // Proceed with printing
        console.log('✅ [TICKET] Ticket element ready, starting print...');
        generateAndPrintPdf(ticketElement)
          .then(() => {
            if (printOperationRef.current.isActive) {
              console.log('✅ [TICKET] PDF generation completed, cleaning up...');
              // Remove the temporary element
              if (ticketElement.parentNode) {
                ticketElement.parentNode.removeChild(ticketElement);
              }
              setPrintTicketSession(null);
            }
          })
          .catch((error) => {
            if (printOperationRef.current.isActive) {
              console.error('❌ [TICKET] Error in generateAndPrintPdf:', error);
              toast({
                title: '❌ Error de Impresión',
                description: 'No se pudo imprimir el ticket. Recargue la página e intente nuevamente.',
                variant: 'destructive'
              });
              setPrintTicketSession(null);
            }
          })
          .finally(() => {
            printOperationRef.current.isActive = false;
            console.log('✅ [TICKET] Print operation completed');
          });
      }, 100);

      return () => {
        printOperationRef.current.isActive = false;
      };
    }
  }, [ticketReady, printTicketSession, toast, createTicketElement, generateAndPrintPdf]);

  const generateAndPrintPdf = useCallback(async (ticketElement: HTMLElement) => {
    console.log('🔄 [TICKET] Starting PDF generation...');
    console.log('🔄 [TICKET] Ticket element found:', !!ticketElement);

    if (!printTicketSession) {
      console.error('❌ [TICKET] No printTicketSession available');
      return;
    }

    try {
      // Generate PDF
      console.log('🔄 [TICKET] Generating canvas with html2canvas...');
      const canvas = await html2canvas(ticketElement, {
        scale: 2,
        useCORS: true,
        logging: false, // Disable html2canvas internal logging
        backgroundColor: '#ffffff',
        width: 302, // 80mm at 96dpi
        height: ticketElement.scrollHeight || 600
      });

      console.log('✅ [TICKET] Canvas generated:', {
        width: canvas.width,
        height: canvas.height
      });

      const imgData = canvas.toDataURL('image/png');
      console.log('✅ [TICKET] Image data URL created');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, canvas.height * 80 / canvas.width]
      });

      console.log('✅ [TICKET] PDF created with dimensions:', {
        width: 80,
        height: canvas.height * 80 / canvas.width
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 80, canvas.height * 80 / canvas.width);

      // Upload PDF to Supabase Storage
      try {
        console.log('🔄 [TICKET] Uploading PDF to Supabase Storage...');
        const blob = pdf.output('blob');
        const formData = new FormData();
        formData.append('file', blob, `ticket-${printTicketSession.sessionId}.pdf`);
        formData.append('sessionId', printTicketSession.id);
        formData.append('sessionIdString', printTicketSession.sessionId);

        const uploadResponse = await fetch('/api/cash-sessions/upload-ticket', {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          console.log('✅ [TICKET] PDF uploaded to storage:', uploadData.url);
        } else {
          console.warn('⚠️ [TICKET] Failed to upload PDF to storage, continuing with print...');
        }
      } catch (uploadError) {
        console.error('❌ [TICKET] Error uploading PDF:', uploadError);
        // Continue with printing even if upload fails
      }

      // Auto-print the PDF
      pdf.autoPrint();
      console.log('✅ [TICKET] PDF autoPrint configured');

      // Create blob and URL
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      console.log('✅ [TICKET] Blob URL created:', url);

      // Show info toast about printing
      toast({
        title: '🖨️ Imprimiendo ticket...',
        description: 'Abriendo ventana de impresión. Si no se abre, verifique el bloqueador de popups.',
      });

      // Try to open print dialog
      const printWindow = window.open(url, '_blank', 'width=800,height=600');
      console.log('🔄 [TICKET] Attempting to open print window...');
      console.log('🔄 [TICKET] Print window object:', printWindow);
      console.log('🔄 [TICKET] Popup blocked?', !printWindow);

      // Store reference for cleanup
      printWindowRef.current = printWindow;

      if (printWindow) {
        printWindow.onload = () => {
          console.log('✅ [TICKET] Print window loaded successfully');
          console.log('🔄 [TICKET] Triggering print()...');
          printWindow.print();

          // Update toast
          toast({
            title: '✅ Impresión iniciada',
            description: 'Use Ctrl+P o haga clic en imprimir',
          });

          setTimeout(() => {
            if (!printWindow.closed) {
              console.log('🔄 [TICKET] Closing print window...');
              printWindow.close();
            }
            URL.revokeObjectURL(url);
            printWindowRef.current = null;
            console.log('✅ [TICKET] PDF generation and printing completed successfully');
          }, 1000);
        };

        printWindow.onerror = (error) => {
          console.error('❌ [TICKET] Print window error:', error);
          toast({
            title: '⚠️ Error en impresión',
            description: 'Error al cargar la ventana de impresión. Descargando PDF...',
            variant: 'destructive',
          });
          // Fallback to download
          downloadPdf(pdf, `ticket-corte-${new Date().toISOString().split('T')[0]}.pdf`);
          URL.revokeObjectURL(url);
          printWindowRef.current = null;
        };
      } else {
        // Window was blocked by popup blocker
        console.warn('⚠️ [TICKET] Popup blocker detected! Window.open returned null');
        toast({
          title: '⚠️ Ventana bloqueada',
          description: 'Su bloqueador de popups está impidiendo la impresión.',
          variant: 'destructive',
          duration: 5000,
        });

        // Wait a moment then show instructions
        setTimeout(() => {
          toast({
            title: '📋 Instrucciones',
            description: '1) Permita popups para este sitio 2) O descargue el PDF directamente',
            duration: 7000,
          });
        }, 2000);

        // Fallback: Download PDF directly
        console.log('🔄 [TICKET] Falling back to direct download...');
        downloadPdf(pdf, `ticket-corte-${new Date().toISOString().split('T')[0]}.pdf`);
        URL.revokeObjectURL(url);
        printWindowRef.current = null;
        console.log('✅ [TICKET] PDF downloaded as fallback');
      }
    } catch (error) {
      console.error('❌ [TICKET] Error generating PDF:', error);
      toast({
        title: '❌ Error al generar PDF',
        description: 'No se pudo generar el ticket. Intente nuevamente.',
        variant: 'destructive',
      });
      throw error; // Re-throw to be caught by calling function
    }
  }, [printTicketSession, toast, downloadPdf]);

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
                        <Unlock className="mr-2"/>
                        Abrir Turno
                    </Button>
                </div>
            </div>
            <OpenCashDrawerDialog 
                isOpen={isOpeningDrawer}
                onOpenChange={setOpeningDrawer}
                onConfirm={handleOpenDrawer}
            />
        </>
    )
  }


  
  return (
    <>
    <div className="grid h-full grid-cols-1 lg:grid-cols-12">
      <div className="lg:col-span-7 flex flex-col h-full bg-background px-4 sm:px-6 pt-6 overflow-hidden">
        <Header 
          searchQuery={searchQuery} 
          onSearchQueryChange={setSearchQuery} 
          actionSlot={
            <Button variant="outline" size="icon" onClick={() => setScannerOpen(true)} title="Abrir escáner">
              <QrCode className="h-5 w-5" />
            </Button>
          }
        />
        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Encuentra los mejores productos</h2>
          <Button
            onClick={() => setShowBuscadorCompatibilidad(true)}
            variant="outline"
            className="hidden md:flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Buscar Micas
          </Button>
        </div>
        <ScrollArea className="flex-1 -mx-4 sm:-mx-6 mt-4">
          <div className="p-4 sm:p-6 grid gap-2 sm:gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))'}}>
            {filteredProducts.map((product, index) => (
              <ProductCard key={`${product.id}-${index}`} product={product} onAddToCart={() => addToCart(product)} />
            ))}
          </div>
        </ScrollArea>
      </div>
       <div className="hidden lg:flex lg:col-span-5 flex-row h-full">
        
        
         <div className="flex-1 flex flex-col h-full bg-card shadow-inner border-l">
            <ShoppingCart
              cartItems={cart}
              onUpdateQuantity={updateQuantity}
              onClearCart={clearCart}
              selectedCartItem={selectedCartItem}
              onSelectItem={setSelectedCartItem}
              onAddToCart={addToCart}
              onCloseSession={() => setClosingDrawer(true)}
              onFinanceSale={() => setFinancePlanOpen(true)}
              onSuccessfulSale={refreshProducts}
            />
         </div>
       </div>

       {/* Mobile Buttons */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50 flex gap-2">
        {/* Buscador de Micas flotante */}
        <Button
          onClick={() => setShowBuscadorCompatibilidad(true)}
          size="icon"
          className="w-14 h-14 rounded-full shadow-2xl bg-blue-600 hover:bg-blue-700"
        >
          <Package className="h-6 w-6" />
        </Button>

        {/* Mobile Cart Sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" className="w-16 h-16 rounded-full shadow-2xl">
              <ShoppingCartIcon className="h-7 w-7" />
              {totalCartItems > 0 && (
                <Badge
                  variant="secondary"
                  className="absolute top-0 right-0 -translate-x-1 translate-y-1 rounded-full px-2"
                >
                  {totalCartItems}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="p-0 flex flex-col w-full sm:max-w-md">
            <SheetTitle className="sr-only">Mi Pedido</SheetTitle>
             <ShoppingCart
                cartItems={cart}
                onUpdateQuantity={updateQuantity}
                onClearCart={clearCart}
                isSheet
                selectedCartItem={selectedCartItem}
                onSelectItem={setSelectedCartItem}
                onAddToCart={addToCart}
                onCloseSession={() => setClosingDrawer(true)}
                onFinanceSale={() => setFinancePlanOpen(true)}
                onSuccessfulSale={refreshProducts}
             />
          </SheetContent>
        </Sheet>
      </div>
    </div>
     <CloseCashDrawerDialog
        isOpen={isClosingDrawer}
        onOpenChange={setClosingDrawer}
        session={activeSession}
        onConfirm={handleCloseDrawer}
      />
      <CreateFinancePlanDialog
        isOpen={isFinancePlanOpen}
        onOpenChange={setFinancePlanOpen}
        allProducts={products}
        allClients={allClients}
        onSaleCreated={refreshProducts}
      />

      {/* Buscador de Compatibilidad */}
      {showBuscadorCompatibilidad && (
        <BuscadorCompatibilidad
          onClose={() => setShowBuscadorCompatibilidad(false)}
          onAddToCart={addToCart}
        />
      )}

      {/* Scanner Dialog */}
      <CodeScannerDialog open={isScannerOpen} onOpenChange={setScannerOpen} onResult={handleScannedCode} />

      {/* Hidden ticket for printing */}
      {printTicketSession && (
        <div ref={ticketElementRef} style={{ position: 'absolute', left: '-9999px', top: '0', width: '80mm' }}>
          <CashCloseTicket
            id="cash-close-ticket"
            session={printTicketSession}
          />
        </div>
      )}
    </>
  );
}
