"use client"

import { useState, useMemo } from "react";
import { Product, Sale } from "@/types";
// import { forecastDemand } from "@/ai/flows/forecast-demand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Bot, ChevronsUpDown, Loader2, Check } from "lucide-react";
import { format, subDays, addDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface DemandForecastProps {
    products: Product[];
    sales: Sale[];
}

interface ChartData {
    date: string;
    historical?: number;
    forecasted?: number;
}

export default function DemandForecast({ products, sales }: DemandForecastProps) {
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [forecastResult, setForecastResult] = useState<any | null>(null);
    const { toast } = useToast();

    const handleSelectProduct = (product: Product) => {
        setSelectedProduct(product);
        setPopoverOpen(false);
        setForecastResult(null); // Reset previous results
    };

    const handleGenerateForecast = async () => {
        if (!selectedProduct) {
            toast({ variant: "destructive", title: "Error", description: "Por favor, selecciona un producto." });
            return;
        }

        setIsLoading(true);
        try {
            const salesByDay: Record<string, number> = {};
            sales.forEach(sale => {
                sale.items.forEach(item => {
                    if (item.productId === selectedProduct.id) {
                        const dateStr = format(sale.createdAt, "yyyy-MM-dd");
                        salesByDay[dateStr] = (salesByDay[dateStr] || 0) + item.quantity;
                    }
                });
            });

            const historicalSales = Object.entries(salesByDay).map(([date, quantity]) => ({
                date: date,
                quantitySold: quantity
            }));

            /*
            const result = await forecastDemand({
                productName: selectedProduct.name,
                historicalSales: historicalSales,
            });

            setForecastResult(result);
            */
            setForecastResult({
                analysisSummary: "Funcionalidad de IA desactivada.",
                forecast: []
            });

        } catch (error) {
            // Suppress console.error to avoid ERR_ABORTED logs
            // console.error("Error generating forecast:", error);
            toast({ variant: "destructive", title: "Error de IA", description: "No se pudo generar el pronóstico. Verifica tu API key." });
        } finally {
            setIsLoading(false);
        }
    }

    const chartData = useMemo(() => {
        if (!selectedProduct) return [];

        const dataMap = new Map<string, ChartData>();

        // Populate historical data
        sales.forEach(sale => {
            sale.items.forEach(item => {
                if (item.productId === selectedProduct.id) {
                    const dateStr = format(sale.createdAt, "dd MMM");
                    const current = dataMap.get(dateStr) || { date: dateStr };
                    dataMap.set(dateStr, { ...current, historical: (current.historical || 0) + item.quantity });
                }
            });
        });

        // Populate forecasted data
        if (forecastResult) {
            forecastResult.forecast.forEach((point: any) => {
                const dateStr = format(parseISO(point.date), "dd MMM");
                const current = dataMap.get(dateStr) || { date: dateStr };
                dataMap.set(dateStr, { ...current, forecasted: point.predictedQuantity });
            });
        }

        const sortedData = Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
        return sortedData;

    }, [selectedProduct, sales, forecastResult]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Pronóstico de Demanda con IA</CardTitle>
                <CardDescription>
                    Selecciona un producto para analizar su historial de ventas y predecir la demanda futura para los próximos 30 días.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={popoverOpen}
                                className="w-full sm:w-[300px] justify-between"
                            >
                                {selectedProduct ? selectedProduct.name : "Seleccionar un producto..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                            <Command>
                                <CommandInput placeholder="Buscar producto..." />
                                <CommandList>
                                    <CommandEmpty>No se encontró ningún producto.</CommandEmpty>
                                    {products.map((product) => (
                                        <CommandItem
                                            key={product.id}
                                            value={product.name}
                                            onSelect={() => handleSelectProduct(product)}
                                        >
                                            <Check className={cn("mr-2 h-4 w-4", selectedProduct?.id === product.id ? "opacity-100" : "opacity-0")} />
                                            {product.name}
                                        </CommandItem>
                                    ))}
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <Button onClick={handleGenerateForecast} disabled={!selectedProduct || isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                        Generar Pronóstico
                    </Button>
                </div>

                {forecastResult && (
                    <div className="space-y-4 pt-4">
                        <Card className="bg-muted/50">
                            <CardHeader className="flex-row items-start gap-4 space-y-0">
                                <div className="flex-shrink-0">
                                    <Bot className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Análisis de la IA</CardTitle>
                                    <CardDescription>{forecastResult.analysisSummary}</CardDescription>
                                </div>
                            </CardHeader>
                        </Card>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="historical" name="Ventas Históricas" stroke="#8884d8" strokeWidth={2} />
                                    <Line type="monotone" dataKey="forecasted" name="Pronóstico" stroke="#82ca9d" strokeWidth={2} strokeDasharray="5 5" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
