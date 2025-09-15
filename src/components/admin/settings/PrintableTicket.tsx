"use client";

import { TicketSettings, Sale } from "@/types";
import Image from "next/image";
import { QRCode } from "react-qrcode-logo";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
  const { subtotal, tax, total } = getCalculatedTotals(displaySale.items);


  const fontSizeClass = `text-${body.fontSize}`;

  return (
    <div
      className={`ticket-preview w-[80mm] bg-white text-black font-mono shadow-lg p-3 ${fontSizeClass}`}
      style={{ fontFamily: "'Courier New', Courier, monospace" }}
    >
      {/* Header */}
      <div className="text-center space-y-1 mb-4">
        {header.showLogo && header.logoUrl && (
          <div className="flex justify-center">
            <Image src={header.logoUrl} alt="Logo" width={60} height={60} className="object-contain" />
          </div>
        )}
        {header.show.storeName && <h1 className="text-lg font-bold">{header.storeName}</h1>}
        {header.show.address && <p>{header.address}</p>}
        {header.show.phone && <p>Tel: {header.phone}</p>}
        {header.show.rfc && <p>RFC: {header.rfc}</p>}
        {header.show.website && <p>{header.website}</p>}
      </div>

      <div className="text-xs space-y-1">
        <p>Folio: {displaySale.saleId}</p>
        <p>Fecha: {format(displaySale.createdAt, "dd/MM/yyyy HH:mm", { locale: es })}</p>
        <p>Cajero: {displaySale.cashierName}</p>
        {displaySale.customerName && <p>Cliente: {displaySale.customerName}</p>}
      </div>

      <hr className="border-dashed border-black my-2" />
      
      {/* Body */}
      <div>
        <table className="w-full">
            <thead>
                <tr className="border-b border-dashed border-black">
                    {body.showQuantity && <th className="text-left pb-1">CANT</th>}
                    <th className="text-left pb-1">DESC</th>
                    {body.showUnitPrice && <th className="text-right pb-1">P.U.</th>}
                    {body.showTotal && <th className="text-right pb-1">IMPORTE</th>}
                </tr>
            </thead>
            <tbody>
                {displaySale.items.map((item, index) => (
                    <tr key={index}>
                        {body.showQuantity && <td className="align-top pr-1">{item.quantity}</td>}
                        <td className="align-top">{item.name}</td>
                        {body.showUnitPrice && <td className="align-top text-right px-1">${item.priceAtSale.toFixed(2)}</td>}
                        {body.showTotal && <td className="align-top text-right pl-1">${(item.priceAtSale * item.quantity).toFixed(2)}</td>}
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
      
      <hr className="border-dashed border-black my-2" />

      {/* Footer */}
      <div className="space-y-1">
        {footer.showSubtotal && (
            <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>${subtotal.toFixed(2)}</span>
            </div>
        )}
        {footer.showTaxes && (
            <div className="flex justify-between">
                <span>IVA:</span>
                <span>${tax.toFixed(2)}</span>
            </div>
        )}
        {footer.showDiscounts && (
            <div className="flex justify-between">
                <span>DESCUENTOS:</span>
                <span>$0.00</span>
            </div>
        )}
        <div className="flex justify-between font-bold text-lg border-t border-dashed border-black pt-1">
            <span>TOTAL:</span>
            <span>${displaySale.totalAmount.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="text-center mt-4 space-y-2">
        {footer.thankYouMessage && <p>{footer.thankYouMessage}</p>}
        {footer.additionalInfo && <p className="text-xs">{footer.additionalInfo}</p>}
        {footer.showQrCode && footer.qrCodeUrl && (
            <div className="flex justify-center pt-2">
                <QRCode value={footer.qrCodeUrl} size={80} quietZone={0} />
            </div>
        )}
      </div>
    </div>
  );
}
