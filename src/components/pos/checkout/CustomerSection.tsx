"use client";

import { User, Search, X, Loader2, ChevronRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CRMClient } from "@/types";
import { cn } from "@/lib/utils";

interface CustomerSectionProps {
    customerMode: 'existente' | 'nuevo';
    setCustomerMode: (mode: 'existente' | 'nuevo') => void;
    selectedCRMClient: string;
    customerName: string;
    customerPhone: string;
    setCustomerName: (name: string) => void;
    setCustomerPhone: (phone: string) => void;
    showCRMClientDropdown: boolean;
    setShowCRMClientDropdown: (open: boolean) => void;
    crmClientSearch: string;
    handleCRMClientSearch: (value: string) => void;
    loadingCRMClients: boolean;
    crmClients: CRMClient[];
    handleCRMClientSelect: (id: string) => void;
    clearCRMClientSelection: () => void;
}

export function CustomerSection({
    customerMode,
    setCustomerMode,
    selectedCRMClient,
    customerName,
    customerPhone,
    setCustomerName,
    setCustomerPhone,
    showCRMClientDropdown,
    setShowCRMClientDropdown,
    crmClientSearch,
    handleCRMClientSearch,
    loadingCRMClients,
    crmClients,
    handleCRMClientSelect,
    clearCRMClientSelection
}: CustomerSectionProps) {
    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-zinc-900 dark:text-zinc-400" />
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Información del Cliente</h3>
                </div>
                <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                    <button
                        onClick={() => setCustomerMode('existente')}
                        className={cn(
                            "px-4 py-1.5 text-xs font-bold rounded-lg transition-all capitalize",
                            customerMode === 'existente' ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-white" : "text-zinc-500"
                        )}
                    >
                        Existente
                    </button>
                    <button
                        onClick={() => setCustomerMode('nuevo')}
                        className={cn(
                            "px-4 py-1.5 text-xs font-bold rounded-lg transition-all capitalize",
                            customerMode === 'nuevo' ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-white" : "text-zinc-500"
                        )}
                    >
                        Nuevo
                    </button>
                </div>
            </div>

            {customerMode === 'existente' ? (
                <div className="space-y-4">
                    <Popover open={showCRMClientDropdown} onOpenChange={setShowCRMClientDropdown} modal={true}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                className="w-full h-14 justify-start text-left bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group"
                            >
                                <Search className="mr-3 h-5 w-5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200 transition-colors" />
                                <div className="flex-1 truncate">
                                    {selectedCRMClient ? (
                                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                            {customerName}
                                        </span>
                                    ) : (
                                        <span className="text-zinc-400 font-medium">Seleccionar cliente existente o buscar...</span>
                                    )}
                                </div>
                                {selectedCRMClient && (
                                    <div className="flex items-center gap-2" onClick={(e) => { e.stopPropagation(); clearCRMClientSelection(); }}>
                                        <X className="h-4 w-4 text-zinc-400 hover:text-red-500 transition-colors" />
                                    </div>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[486px] p-0 z-[100] rounded-2xl shadow-xl border-zinc-200 dark:border-zinc-800" align="start">
                            <div className="flex flex-col">
                                <div className="flex items-center border-b border-zinc-100 dark:border-zinc-800 px-4">
                                    <Search className="mr-3 h-5 w-5 shrink-0 text-zinc-400" />
                                    <input
                                        className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm font-medium outline-none placeholder:text-zinc-400"
                                        placeholder="Nombre, teléfono o cédula..."
                                        value={crmClientSearch}
                                        onChange={(e) => handleCRMClientSearch(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <ScrollArea className="max-h-[300px]">
                                    <div className="p-2">
                                        {loadingCRMClients ? (
                                            <div className="flex items-center justify-center py-8">
                                                <Loader2 className="h-5 w-5 animate-spin mr-3 text-zinc-400" />
                                                <span className="text-sm font-medium text-zinc-500">Buscando clientes...</span>
                                            </div>
                                        ) : crmClients.length === 0 ? (
                                            <div className="text-center py-8">
                                                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">No se encontraron resultados</p>
                                                <p className="text-xs text-zinc-500 mt-1">Intenta con otro término de búsqueda</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                {crmClients.map((client) => (
                                                    <button
                                                        key={client.id}
                                                        onClick={() => handleCRMClientSelect(client.id)}
                                                        className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-left group"
                                                    >
                                                        <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-zinc-700 transition-colors">
                                                            <User className="h-5 w-5 text-zinc-400" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{client.firstName} {client.lastName}</p>
                                                            <p className="text-xs text-zinc-500 font-medium">{client.phone || 'Sin teléfono'}</p>
                                                        </div>
                                                        <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Nombre del Cliente</Label>
                            <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Opcional</span>
                        </div>
                        <Input
                            className="h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-semibold px-4"
                            placeholder="Ej: Juan Pérez"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Teléfono</Label>
                            <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Opcional</span>
                        </div>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <Input
                                className="h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-semibold pl-11 pr-4"
                                placeholder="Ej: 555-123-4567"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
