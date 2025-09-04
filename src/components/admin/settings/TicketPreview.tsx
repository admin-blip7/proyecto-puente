"use client";

import { TicketSettings } from "@/types";
import Image from "next/image";
import { QRCode } from "react-qrcode-logo";

interface TicketPreviewProps {
  settings: TicketSettings;
}

// Sample data for the preview
const sampleSale = {
  items: [
    { name: "Mica Hidrogel iPhone 15 Pro Max", quantity: 1, total: 250.00, unitPrice: 250.00 },
    { name: "Cable USB-C 2m Carga Rápida", quantity: 2, total: 360.00, unitPrice: 180.00 },
    { name: "Adaptador de Corriente 20W", quantity: 1, total: 450.00, unitPrice: 450.00 },
  ],
  subtotal: 1060.00,
  tax: 169.60,
  discounts: 50.00,
  total: 1179.60,
};

export default function TicketPreview({ settings }: TicketPreviewProps) {
  const { header, body, footer } = settings;
  const fontSizeClass = `text-${body.fontSize}`;

  return (
    <div
      className={`w-[80mm] bg-white text-black font-mono shadow-lg p-3 ${fontSizeClass}`}
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
                {sampleSale.items.map((item, index) => (
                    <tr key={index}>
                        {body.showQuantity && <td className="align-top">{item.quantity}</td>}
                        <td className="align-top">{item.name}</td>
                        {body.showUnitPrice && <td className="align-top text-right">${item.unitPrice.toFixed(2)}</td>}
                        {body.showTotal && <td className="align-top text-right">${item.total.toFixed(2)}</td>}
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
                <span>${sampleSale.subtotal.toFixed(2)}</span>
            </div>
        )}
        {footer.showTaxes && (
            <div className="flex justify-between">
                <span>IVA:</span>
                <span>${sampleSale.tax.toFixed(2)}</span>
            </div>
        )}
        {footer.showDiscounts && (
            <div className="flex justify-between">
                <span>DESCUENTOS:</span>
                <span>-${sampleSale.discounts.toFixed(2)}</span>
            </div>
        )}
        <div className="flex justify-between font-bold text-lg border-t border-dashed border-black pt-1">
            <span>TOTAL:</span>
            <span>${sampleSale.total.toFixed(2)}</span>
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
