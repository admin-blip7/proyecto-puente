"use client";

import { CashSession, Income } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import { getIncomesBySession } from "@/lib/services/incomeService";
import { useEffect, useState } from "react";

interface CashCloseTicketProps {
  session: CashSession;
  sales?: any[]; // Using any[] for now to avoid circular deps if types are tricky, but preferably proper types
  expenses?: any[];
  incomes?: any[];
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
  sales = [],
  expenses = [],
  incomes: propIncomes = [],
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

  // Use props incomes if provided, otherwise fetch (backward compatibility)
  const [incomes, setIncomes] = useState<Income[]>(propIncomes as Income[]);

  useEffect(() => {
    // Only fetch if not provided in props and session exists
    if (session?.sessionId && propIncomes.length === 0) {
      getIncomesBySession(session.sessionId).then(setIncomes);
      setIncomes(propIncomes as Income[]);
    }
  }, [session?.sessionId, propIncomes]);

  // Filter out "Corte de Caja" (Deposits) from Incomes for the Ticket display
  // These are transfers/deposits, not "Cash Incomes" for the drawer.
  const displayIncomes = incomes.filter(inc =>
    inc.category !== 'Corte de Caja' &&
    !inc.description?.toLowerCase().includes('depósito de corte de caja')
  );

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
        <p>Fecha: {format(new Date(session.closedAt || session.openedAt), "dd/MM/yyyy HH:mm", { locale: es })}</p>
      </div>

      <hr className="border-dashed border-black my-2" />

      {/* Session Info */}
      <div className="space-y-1 mb-3">
        <p><strong>Turno:</strong></p>
        <p>  Apertura: {format(new Date(session.openedAt), "dd/MM/yyyy HH:mm", { locale: es })}</p>
        <p>  Cajero: {session.openedByName}</p>
        {session.closedAt && (
          <>
            <p>  Cierre: {format(new Date(session.closedAt), "dd/MM/yyyy HH:mm", { locale: es })}</p>
            <p>  Cierra: {session.closedByName}</p>
          </>
        )}
      </div>

      <hr className="border-dashed border-black my-2" />



      {/* Sales Detail - Grouped by Product */}
      {
        sales.length > 0 && (
          <div className="space-y-1 mb-3">
            <p className="font-bold">DETALLE DE PRODUCTOS:</p>
            {(() => {
              // Group sales items
              const soldProducts: Record<string, { name: string; quantity: number; total: number }> = {};
              sales.forEach((sale: any) => {
                if (sale.status !== 'cancelled' && sale.items) {
                  sale.items.forEach((item: any) => {
                    const key = item.name;
                    if (!soldProducts[key]) {
                      soldProducts[key] = { name: item.name, quantity: 0, total: 0 };
                    }
                    soldProducts[key].quantity += item.quantity;
                    soldProducts[key].total += (item.priceAtSale * item.quantity);
                  });
                }
              });

              const list = Object.values(soldProducts);
              if (list.length === 0) return <div className="italic">No hay items</div>;

              return list.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span>{item.quantity}x {item.name}</span>
                  <span>{formatCurrency(item.total)}</span>
                </div>
              ));
            })()}
            <hr className="border-dashed border-black my-2" />
          </div>
        )
      }

      {/* Expenses Detail */}
      {
        expenses.length > 0 && (
          <div className="space-y-1 mb-3">
            <p className="font-bold">DETALLE DE GASTOS:</p>
            {expenses.map((exp: any, index: number) => (
              <div key={index} className="flex justify-between text-xs">
                <span>{exp.description || exp.category}</span>
                <span>{formatCurrency(exp.amount)}</span>
              </div>
            ))}
            <hr className="border-dashed border-black my-2" />
          </div>
        )
      }

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
          <span>{formatCurrency(displayIncomes.reduce((acc, inc) => acc + inc.amount, 0))}</span>
        </div>
      </div>

      <hr className="border-dashed border-black my-2" />

      {/* Incomes Detail */}
      {
        displayIncomes.length > 0 && (
          <>
            <div className="space-y-1 mb-3">
              <p className="font-bold">DETALLE DE INGRESOS:</p>
              {displayIncomes.map((income, index) => (
                <div key={index} className="flex justify-between">
                  <span>{income.description || income.category}</span>
                  <span>{formatCurrency(income.amount)}</span>
                </div>
              ))}
            </div>
            <hr className="border-dashed border-black my-2" />
          </>
        )
      }

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
        {session.cashLeftForNextSession !== undefined && session.cashLeftForNextSession > 0 && (
          <div className="flex justify-between font-bold text-blue-800">
            <span>Efectivo Dejado en Caja:</span>
            <span>{formatCurrency(session.cashLeftForNextSession)}</span>
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
          const expectedEnd = start - sale;
          const actualEnd = (session.bagsEndAmounts as any)?.[key] ?? expectedEnd;
          const diff = actualEnd - expectedEnd;
          return (
            <div key={key}>
              <div className="flex justify-between text-xs">
                <span className="capitalize">{key}:</span>
                <span>
                  Ini: {formatCurrency(start)} - Vta: {formatCurrency(sale)}
                </span>
              </div>
              <div className="flex justify-between text-xs pl-2">
                <span>Esperado: {formatCurrency(expectedEnd)}</span>
                <span>Saldo: <strong>{formatCurrency(actualEnd)}</strong></span>
              </div>
              {diff !== 0 && (
                <div className={`text-xs pl-2 font-bold ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Diferencia: {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                </div>
              )}
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
    </div >
  );
}