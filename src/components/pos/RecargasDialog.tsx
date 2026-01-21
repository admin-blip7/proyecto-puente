"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";

interface RecargasDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RecargasDialog({ isOpen, onOpenChange }: RecargasDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setHasError(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] p-0 gap-0 bg-white dark:bg-card border-gray-200 dark:border-gray-700">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Recargas Telefónicas
              </DialogTitle>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Sistema de recargas Comunicatec
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </DialogHeader>

        {/* Content */}
        <div className="relative w-full h-[500px] bg-gray-50 dark:bg-sidebar-bg">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-card z-10">
              <div className="relative w-12 h-12 mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-gray-100 dark:border-gray-700"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Cargando sistema de recargas...
              </p>
            </div>
          )}

          {hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-card z-10 p-6">
              <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                <X className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-gray-900 dark:text-white font-semibold mb-1">
                Error al cargar
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center">
                No se pudo conectar con el sistema de recargas
              </p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium text-sm transition-colors"
              >
                Reintentar
              </button>
            </div>
          )}

          <iframe
            key={hasError ? 'retry' : 'initial'}
            src="https://recargascomunicatec.com.mx/sims/Recargas/recargas"
            title="Recargas Comunicatec"
            className="w-full h-full border-0"
            style={{ display: isLoading || hasError ? 'none' : 'block' }}
            allow="payment"
            onLoad={handleLoad}
            onError={handleError}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-sidebar-bg/50 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            powered by{' '}
            <span className="font-semibold text-primary">Comunicatec</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
