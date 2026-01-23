"use client";

import { useMemo } from "react";
import { RepairOrder } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface RepairLabelProps {
    repair: RepairOrder;
}

export const RepairLabel = ({ repair }: RepairLabelProps) => {
    // Pattern grid SVG 3x3 circles
    const PatternGrid = () => (
        <svg width="60" height="60" viewBox="0 0 100 100" className="opacity-80">
            {[0, 1, 2].map(row =>
                [0, 1, 2].map(col => (
                    <circle
                        key={`${row}-${col}`}
                        cx={20 + col * 30}
                        cy={20 + row * 30}
                        r="6"
                        fill="none"
                        stroke="black"
                        strokeWidth="2"
                    />
                ))
            )}
        </svg>
    );

    return (
        <div

            id={`label-${repair.id}`}
            className="w-[4in] h-[2in] relative overflow-hidden rounded-xl border border-blue-200"
            style={{
                width: "4in",
                height: "2in",
                background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
                fontFamily: "Arial, sans-serif",
                color: "#000"
            }}
        >
            {/* Background Circuit Pattern Overlay (Simplified with CSS) */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(#0ea5e9 1px, transparent 1px)',
                    backgroundSize: '10px 10px'
                }}
            />

            <div className="relative z-10 p-3 h-full flex flex-col justify-between">
                {/* Header */}
                <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="text-blue-900">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-blue-900 tracking-tight uppercase">REPARACIÓN MÓVIL</h1>
                </div>

                {/* Content Info */}
                <div className="space-y-1 text-[12px] font-bold leading-tight pl-1">
                    <div className="flex items-center gap-2">
                        <span className="opacity-70 text-[10px]">👤</span>
                        <span className="uppercase truncate max-w-[200px]">NOMBRE: {repair.customerName}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="opacity-70 text-[10px]">📅</span>
                        <span>FECHA: {format(new Date(repair.createdAt), "dd/MM/yyyy", { locale: es })}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="opacity-70 text-[10px]">🔢</span>
                        <span>NÚMERO DE CLIENTE: {repair.orderId.replace("REP-", "")}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="opacity-70 text-[10px]">📱</span>
                        <span className="truncate max-w-[200px]">MODELO: {repair.deviceBrand} {repair.deviceModel}</span>
                    </div>

                    <div className="flex items-start gap-2 mt-1">
                        <span className="opacity-70 text-[10px] mt-0.5">🔒</span>
                        <div className="flex items-center gap-2">
                            <span>PIN/PATRÓN:</span>
                            <span className="text-sm">{repair.devicePassword || "NO / NA"}</span>
                        </div>
                    </div>
                </div>

                {/* Pattern Visual (Floating Right) */}
                <div className="absolute bottom-2 right-2 bg-white/50 p-1 rounded-md border border-blue-200/50">
                    <PatternGrid />
                </div>

                <div className="absolute top-10 right-2 w-16 h-16 opacity-10">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    </svg>
                </div>
            </div>
        </div>
    );
};
