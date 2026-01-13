"use client";

import { TicketSettings, Sale } from "@/types";
import Image from "next/image";
import { QRCode } from "react-qrcode-logo";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";

interface PrintableTicketProps {
  settings: TicketSettings;
  sale: Sale | null; // Null for preview mode
}

const sampleSale: Sale = {
  items: [
    { productId: '1', name: "Mica Hidrogel iPhone 15 Pro Max", quantity: 1, priceAtSale: 250.00 },
    { productId: '2', name: "Cable USB-C 2m Carga Rápida", quantity: 2, priceAtSale: 180.00 },
    { productId: '3', name: "Adaptador de Corriente 20W", quantity: 1, priceAtSale: 450.00 },
  ],
  totalAmount: 1179.60,
  saleId: "SALE-PREVIEW",
  createdAt: new Date(),
  cashierName: "Admin",
  paymentMethod: "Efectivo" as const,
  customerName: "Cliente de Muestra",
  customerPhone: "555-123-4567",
  id: "preview",
  cashierId: "preview",
};

const getCalculatedTotals = (items: Sale['items']) => {
  const subtotal = items.reduce((acc, item) => acc + (item.priceAtSale * item.quantity), 0);
  // Assuming a 16% tax rate for calculation. This should be dynamic in a real app.
  const tax = subtotal * 0.16;
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

export default function PrintableTicket({ settings, sale }: PrintableTicketProps) {
  const { header, body, footer } = settings;
  const displaySale = sale || sampleSale;
  const { subtotal, tax } = getCalculatedTotals(displaySale.items);


  const fontSizeClass = `text-${body.fontSize}`;
  const isItalic = settings.fontStyle?.italic;
  const storeInitials = header.storeName
    ?.split(" ")
    .filter(Boolean)
    .map(word => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const wrapperStyle = {
    width: `${settings.paperWidth || 80}mm`,
    fontFamily: "'Courier New', Courier, monospace",
    fontWeight: 'bold',
    fontStyle: isItalic ? 'italic' : 'normal',
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={`ticket-preview bg-white text-black font-mono shadow-lg ${fontSizeClass}`}
        style={wrapperStyle}
      >
        <div
          className="h-2 w-full"
          style={{
            backgroundImage: "linear-gradient(135deg, #111 25%, transparent 25%), linear-gradient(225deg, #111 25%, transparent 25%)",
            backgroundSize: "12px 12px",
          }}
        />
        <div className="px-4 pb-4 pt-3">
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-1">
            {header.showLogo && (
              <div className="flex justify-center">
                <div className="h-10 w-10 rounded-lg bg-black text-white flex items-center justify-center text-base font-bold">
                  {header.showLogo && header.logoUrl ? (
                    <Image src={header.logoUrl} alt="Logo" width={28} height={28} className="object-contain" />
                  ) : (
                    storeInitials || "PS"
                  )}
                </div>
              </div>
            )}
            {header.show.storeName && (
              <h1 className="text-base tracking-[0.2em] font-bold uppercase">
                {header.storeName}
              </h1>
            )}
            <div className="h-px w-14 bg-black/80" />
            {header.show.address && <p className="text-[10px] uppercase tracking-widest">{header.address}</p>}
            {header.show.phone && <p className="text-[10px] uppercase tracking-widest">Tel: {header.phone}</p>}
            {header.show.rfc && <p className="text-[10px] uppercase tracking-widest">RFC: {header.rfc}</p>}
            {header.show.website && <p className="text-[10px] uppercase tracking-widest">{header.website}</p>}
          </div>

          <div className="mt-4 text-[10px] uppercase tracking-widest">
            <div className="flex justify-between">
              <span className="text-black/60">Folio:</span>
              <span className="font-bold">{displaySale.saleId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/60">Fecha:</span>
              <span className="font-bold">{format(displaySale.createdAt, "dd/MM/yyyy, hh:mm a", { locale: es })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/60">Cajero:</span>
              <span className="font-bold">{displaySale.cashierName}</span>
            </div>
            {displaySale.customerName && (
              <div className="flex justify-between">
                <span className="text-black/60">Cliente:</span>
                <span className="font-bold">{displaySale.customerName}</span>
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-black/30 my-3" />

          {/* Body */}
          <div>
            <div className="flex justify-between text-[10px] uppercase tracking-widest border-b border-dashed border-black/40 pb-1">
              <span>Descripción</span>
              <span>Total</span>
            </div>
            <div className="space-y-2 mt-2">
              {displaySale.items.map((item, index) => (
                <div key={index} className="flex justify-between items-start">
                  <div className="flex gap-2">
                    {body.showQuantity && (
                      <span className="w-4 text-right font-bold">{item.quantity}</span>
                    )}
                    <div>
                      <div className="text-sm font-semibold leading-tight">{item.name}</div>
                      {body.showUnitPrice && (
                        <div className="text-[10px] text-black/60">
                          P.U. {formatCurrency(item.priceAtSale ?? 0)}
                        </div>
                      )}
                    </div>
                  </div>
                  {body.showTotal && (
                    <div className="text-sm font-semibold tabular-nums">
                      {formatCurrency((item.priceAtSale ?? 0) * (item.quantity ?? 0))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-dashed border-black/30 my-3" />

          {/* Footer */}
          <div className="space-y-1 text-[11px]">
            {footer.showSubtotal && (
              <div className="flex justify-between text-black/70">
                <span>Subtotal:</span>
                <span className="tabular-nums">{formatCurrency(subtotal ?? 0)}</span>
              </div>
            )}
            {footer.showTaxes && (
              <div className="flex justify-between text-black/70">
                <span>IVA (16%):</span>
                <span className="tabular-nums">{formatCurrency(tax ?? 0)}</span>
              </div>
            )}
            {footer.showDiscounts && (
              <div className="flex justify-between text-black/70">
                <span>Descuentos:</span>
                <span className="tabular-nums">$0.00</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t border-black/80 pt-2">
              <span>TOTAL</span>
              <span className="tabular-nums">{formatCurrency(displaySale.totalAmount ?? 0)}</span>
            </div>
            {(displaySale.amountPaid !== undefined || displaySale.changeGiven !== undefined) && (
              <div className="mt-3 rounded-lg bg-black/5 px-3 py-2 text-[11px]">
                {displaySale.amountPaid !== undefined && (
                  <div className="flex justify-between font-semibold">
                    <span>Efectivo / Entregado:</span>
                    <span className="tabular-nums">{formatCurrency(displaySale.amountPaid)}</span>
                  </div>
                )}
                {displaySale.changeGiven !== undefined && (
                  <div className="flex justify-between font-semibold">
                    <span>Cambio:</span>
                    <span className="tabular-nums">{formatCurrency(displaySale.changeGiven)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="text-center mt-4 space-y-2">
            {footer.showQrCode && footer.qrCodeUrl ? (
              <div className="flex justify-center pt-2">
                <QRCode value={footer.qrCodeUrl} size={80} quietZone={0} />
              </div>
            ) : (
              <div className="flex justify-center">
                <div
                  className="h-6 w-24 opacity-60"
                  style={{
                    backgroundImage: "repeating-linear-gradient(90deg, #111 0 2px, transparent 2px 4px)",
                  }}
                />
              </div>
            )}
            {footer.thankYouMessage && <p className="font-semibold">{footer.thankYouMessage}</p>}
            {footer.additionalInfo && <p className="text-[10px] text-black/70">{footer.additionalInfo}</p>}
          </div>
        </div>
        <div
          className="h-2 w-full"
          style={{
            backgroundImage: "linear-gradient(45deg, #111 25%, transparent 25%), linear-gradient(-45deg, #111 25%, transparent 25%)",
            backgroundSize: "12px 12px",
          }}
        />
      </div>
    </div>
  );
}
