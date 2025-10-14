"use client";

import React from 'react';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import FinanceDashboard from './FinanceDashboard';
import { Consignor, ConsignorPayment, Expense, Sale, RepairOrder, Product, CashSession, Account } from '@/types';
import { getLogger } from '@/lib/logger';

const log = getLogger("FinancePageWrapper");

interface FinancePageWrapperProps {
  initialExpenses: Expense[];
  initialSales: Sale[];
  initialRepairs: RepairOrder[];
  initialProducts: Product[];
  initialConsignors: Consignor[];
  initialConsignorPayments: ConsignorPayment[];
  initialCashSessions: CashSession[];
  initialAccounts: Account[];
}

function FinanceErrorFallback({ error, errorInfo, reset }: { 
  error?: Error; 
  errorInfo?: React.ErrorInfo; 
  reset: () => void;
}) {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] p-6">
      <div className="max-w-md w-full space-y-4">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error en el módulo financiero
          </h2>
          <p className="text-gray-600 mb-6">
            Ha ocurrido un error al cargar los datos financieros. Por favor, intente nuevamente o recargue la página.
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && error && (
          <details className="bg-gray-50 p-4 rounded-lg text-left">
            <summary className="cursor-pointer text-sm font-mono text-gray-700 mb-2">
              Ver detalles del error
            </summary>
            <div className="text-xs font-mono text-gray-600 space-y-2">
              <div>
                <strong>Error:</strong> {error.message}
              </div>
              {error.stack && (
                <div>
                  <strong>Stack:</strong>
                  <pre className="whitespace-pre-wrap mt-1">{error.stack}</pre>
                </div>
              )}
            </div>
          </details>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Intentar de nuevo
          </button>
          <button
            onClick={handleReload}
            className="px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Recargar página
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FinancePageWrapper(props: FinancePageWrapperProps) {
  const handleError = React.useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    log.error("FinancePageWrapper caught an error", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      props: {
        hasExpenses: props.initialExpenses.length > 0,
        hasSales: props.initialSales.length > 0,
        hasRepairs: props.initialRepairs.length > 0,
        hasProducts: props.initialProducts.length > 0,
        hasConsignors: props.initialConsignors.length > 0,
        hasConsignorPayments: props.initialConsignorPayments.length > 0,
        hasCashSessions: props.initialCashSessions.length > 0,
        hasAccounts: props.initialAccounts.length > 0
      }
    });
  }, [props]);

  return (
    <ErrorBoundary 
      fallback={FinanceErrorFallback}
      onError={handleError}
    >
      <FinanceDashboard {...props} />
    </ErrorBoundary>
  );
}