"use client";

import { CashSession, Income } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import { getIncomesBySession } from "@/lib/services/incomeService";
import { useEffect, useState } from "react";

interface CashCloseTicketProps {
  session: CashSession;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeRFC?: string;
  id?: string;
}

const defaultStoreInfo = {
  name: "Mi Tienda",
  address: "Dirección de la Tienda",
  phone: "555-123-4567",
  rfc: "RFC-123456789",
};

export default function CashCloseTicket({
  session,
  storeName = defaultStoreInfo.name,
  storeAddress = defaultStoreInfo.address,
  storePhone = defaultStoreInfo.phone,
  storeRFC = defaultStoreInfo.rfc,
  id
}: CashCloseTicketProps) {
  const wrapperStyle = {
    width: "80mm",
    fontFamily: "'Courier New', Courier, monospace",
  };

  const [incomes, setIncomes] = useState<Income[]>([]);

  useEffect(() => {
    if (session?.sessionId) {
      getIncomesBySession(session.sessionId).then(setIncomes);
    }
  }, [session?.sessionId]);

  return (
    <div
      className="cash-close-ticket bg-white text-black font-mono shadow-lg p-3 text-xs"
      style={wrapperStyle}
      id={id}
    >
      {/* Header */}
      <div className="text-center space-y-1 mb-4">
        {storeName && <h1 className="text-lg font-bold">{storeName}</h1>}
        {storeAddress && <p>{storeAddress}</p>}
        {storePhone && <p>Tel: {storePhone}</p>}
        {storeRFC && <p>RFC: {storeRFC}</p>}
      </div>

      <div className="text-center space-y-1 mb-4">
        <p className="font-bold text-base">=== CORTE DE CAJA ===</p>
        <p>Folio: {session.sessionId}</p>
        <p>Fecha: {format(session.closedAt || session.openedAt, "dd/MM/yyyy HH:mm", { locale: es })}</p>
      </div>

      <hr className="border-dashed border-black my-2" />

      {/* Session Info */}
      <div className="space-y-1 mb-3">
        <p><strong>Turno:</strong></p>
        <p>  Apertura: {format(session.openedAt, "dd/MM/yyyy HH:mm", { locale: es })}</p>
        <p>  Cajero: {session.openedByName}</p>
        {session.closedAt && (
          <>
            <p>  Cierre: {format(session.closedAt, "dd/MM/yyyy HH:mm", { locale: es })}</p>
            <p>  Cierra: {session.closedByName}</p>
          </>
        )}
      </div>

      <hr className="border-dashed border-black my-2" />

      {/* Sales Summary */}
      <div className="space-y-1 mb-3">
        <p className="font-bold">RESUMEN DE VENTAS:</p>
        <div className="flex justify-between">
          <span>Fondo de Caja Inicial:</span>
          <span>{formatCurrency(session.startingFloat ?? 0)}</span>
        </div>
        <div className="flex justify-between">
          <span>Ventas en Efectivo:</span>
          <span>{formatCurrency(session.totalCashSales ?? 0)}</span>
        </div>
        <div className="flex justify-between">
          <span>Ventas con Tarjeta:</span>
          <span>{formatCurrency(session.totalCardSales ?? 0)}</span>
        </div>
        <div className="flex justify-between">
          <span>Gastos de Caja:</span>
          <span>{formatCurrency(session.totalCashPayouts ?? 0)}</span>
        </div>
        <div className="flex justify-between">
          <span>Ingresos de Caja:</span>
          <span>{formatCurrency(incomes.reduce((acc, inc) => acc + inc.amount, 0))}</span>
        </div>
      </div>

      <hr className="border-dashed border-black my-2" />

      {/* Incomes Detail */}
      {incomes.length > 0 && (
        <>
          <div className="space-y-1 mb-3">
            <p className="font-bold">DETALLE DE INGRESOS:</p>
            {incomes.map((income, index) => (
              <div key={index} className="flex justify-between">
                <span>{income.description || income.category}</span>
                <span>{formatCurrency(income.amount)}</span>
              </div>
            ))}
          </div>
          <hr className="border-dashed border-black my-2" />
        </>
      )}

      <hr className="border-dashed border-black my-2" />

      {/* Cash Count */}
      <div className="space-y-1 mb-3">
        <p className="font-bold">CONTEO DE EFECTIVO:</p>
        <div className="flex justify-between">
          <span>Efectivo Esperado:</span>
          <span>{formatCurrency(session.expectedCashInDrawer ?? 0)}</span>
        </div>
        {session.actualCashCount !== undefined && (
          <div className="flex justify-between">
            <span>Efectivo Contado:</span>
            <span>{formatCurrency(session.actualCashCount)}</span>
          </div>
        )}
        {session.difference !== undefined && (
          <div className={`flex justify-between font-bold ${session.difference === 0 ? '' : session.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
            <span>Diferencia:</span>
            <span>{session.difference >= 0 ? '+' : '-'}{formatCurrency(Math.abs(session.difference))}</span>
          </div>
        )}
      </div>

      <hr className="border-dashed border-black my-2" />

      {/* Bag Balances */}
      <div className="space-y-1 mb-3">
        <p className="font-bold">SALDOS DE BOLSAS:</p>
        {['recargas', 'mimovil', 'servicios'].map(key => {
          const start = (session.bagsStartAmounts as any)?.[key] || 0;
          const sale = (session.bagsSalesAmounts as any)?.[key] || 0;
          const end = (session.bagsEndAmounts as any)?.[key] || (start - sale);
          return (
            <div key={key} className="flex justify-between text-xs">
              <span className="capitalize">{key}:</span>
              <span>
                {formatCurrency(start)} - {formatCurrency(sale)} = <strong>{formatCurrency(end)}</strong>
              </span>
            </div>
          );
        })}
      </div>

      <hr className="border-dashed border-black my-2" />

      {/* Totals */}
      <div className="space-y-1 mb-4">
        <div className="flex justify-between font-bold text-base border-t border-dashed border-black pt-1">
          <span>TOTAL VENTAS DEL DÍA:</span>
          <span>{formatCurrency((session.totalCashSales ?? 0) + (session.totalCardSales ?? 0))}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center space-y-2">
        <p className="text-xs">*** CORTE DE CAJA FINALIZADO ***</p>
        <p className="text-xs">Gracias por su preferencia</p>
        <p className="text-xs">Este documento no es un comprobante fiscal</p>
      </div>
    </div>
  );
}