"use client";

import { useMemo, useState, useEffect } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMXNAmount } from "@/lib/validation/currencyValidation";
import { formatDateTimeWithPreferences } from "@/lib/appPreferences";

interface InventoryHistoryChartProps {
    data: { date: string; value: number }[];
    currentValue: number;
}

export default function InventoryHistoryChart({ data, currentValue }: InventoryHistoryChartProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const chartData = useMemo(() => {
        return data.map((item) => ({
            ...item,
            formattedDate: formatDateTimeWithPreferences(item.date, { day: "numeric", month: "short" }),
        }));
    }, [data]);

    const minValue = useMemo(() => Math.min(...data.map(d => d.value)) * 0.95, [data]);

    if (!isMounted || data.length === 0) return null;

    return (
        <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Inventario (Propio)</CardTitle>
                <span className="font-bold text-2xl">{formatMXNAmount(currentValue)}</span>
            </CardHeader>
            <CardContent className="h-[200px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="formattedDate"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={20}
                        />
                        <YAxis
                            hide
                            domain={[minValue, 'auto']}
                        />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="flex flex-col">
                                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                        Fecha
                                                    </span>
                                                    <span className="font-bold text-muted-foreground">
                                                        {payload[0].payload.formattedDate}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                        Valor
                                                    </span>
                                                    <span className="font-bold">
                                                        {formatMXNAmount(payload[0].value as number)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#10b981"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
