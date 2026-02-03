
"use client"

import { useState, useEffect, useMemo } from "react";
import { CashSession, Expense } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, DollarSign, TrendingDown, TrendingUp, Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn, formatCurrency } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateRange } from "react-day-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getExpensesByDateRange, getDailySalesStats } from "@/lib/services/financeService";

interface CashHistoryClientProps {
  initialSessions: CashSession[];
}

export default function CashHistoryClient({ initialSessions }: CashHistoryClientProps) {
  const [sessions, setSessions] = useState<CashSession[]>(initialSessions);
  const [sortConfig, setSortConfig] = useState<{ key: keyof CashSession | 'difference'; direction: 'asc' | 'desc' } | null>(null);

  // Financial Dashboard State
  const currentDate = new Date();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(currentDate),
    to: endOfMonth(currentDate),
  });

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [rawSales, setRawSales] = useState<{ createdAt: string; totalAmount: number }[]>([]);
  const [cogs, setCOGS] = useState<number>(0);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  /* New incomes state */
  const [incomes, setIncomes] = useState<{ amount: number }[]>([]);

  // Fetch expenses, daily sales, cogs, AND incomes when date range changes
  useEffect(() => {
    const fetchData = async () => {
      if (!dateRange?.from || !dateRange?.to) return;

      setLoadingExpenses(true);
      try {
        const { getExpensesByDateRange, getDailySalesStats, getCOGSByDateRange, getIncomesByDateRange } = await import("@/lib/services/financeService");

        const [expensesData, salesData, cogsData, incomesData] = await Promise.all([
          getExpensesByDateRange(dateRange.from, dateRange.to),
          getDailySalesStats(dateRange.from, dateRange.to),
          getCOGSByDateRange(dateRange.from, dateRange.to),
          getIncomesByDateRange(dateRange.from, dateRange.to)
        ]);

        setExpenses(expensesData);
        setRawSales(salesData);
        setCOGS(cogsData);
        // Filter out "Corte de Caja" and "Bolsa de Saldo" from Incomes to prevent double counting
        // These are just transfers of sales money and balance bag deposits, not new income.
        const filteredIncomes = incomesData.filter((inc: any) =>
          inc.category !== 'Corte de Caja' &&
          inc.category !== 'Bolsa de Saldo' &&
          !inc.description?.toLowerCase().includes('depósito de corte de caja') &&
          !inc.description?.toLowerCase().includes('bolsa de saldo')
        );

        setIncomes(filteredIncomes);
      } catch (error) {
        console.error("Error fetching financial data:", error);
      } finally {
        setLoadingExpenses(false);
      }
    };

    fetchData();
  }, [dateRange]);

  // Aggregate sales by local date
  const salesByDate = useMemo(() => {
    const map: Record<string, number> = {};
    rawSales.forEach(sale => {
      const date = new Date(sale.createdAt);
      const key = format(date, 'yyyy-MM-dd');
      map[key] = (map[key] || 0) + sale.totalAmount;
    });
    return map;
  }, [rawSales]);

  // Filter sessions by date range
  const filteredSessions = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return sessions;

    return sessions.filter(session => {
      if (!session.closedAt) return false;
      const sessionDate = new Date(session.closedAt);
      // Ensure we compare including the full day for 'to' date
      const endDate = new Date(dateRange.to!);
      endDate.setHours(23, 59, 59, 999);

      // Safety check: Ensure both dates are valid
      if (isNaN(sessionDate.getTime())) return false;

      return sessionDate >= dateRange.from! && sessionDate <= endDate;
    });
  }, [sessions, dateRange]);

  // Sort filtered sessions
  const sortedSessions = useMemo(() => {
    const sorted = [...filteredSessions];
    if (!sortConfig) return sorted;

    return sorted.sort((a, b) => {
      const { key, direction } = sortConfig;

      let aValue: any = a[key as keyof CashSession];
      let bValue: any = b[key as keyof CashSession];

      if (key === 'difference') {
        aValue = a.difference ?? 0;
        bValue = b.difference ?? 0;
      }

      if (key === 'closedAt') {
        aValue = a.closedAt ? new Date(a.closedAt).getTime() : 0;
        bValue = b.closedAt ? new Date(b.closedAt).getTime() : 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue === undefined || aValue === null) aValue = 0;
      if (bValue === undefined || bValue === null) bValue = 0;

      if (aValue < bValue) {
        return direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredSessions, sortConfig]);

  // Calculate Financials
  const financials = useMemo(() => {
    // Total revenue from sales
    const totalSales = rawSales.reduce((sum, sale) => sum + sale.totalAmount, 0);

    const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const totalIncomes = incomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);

    // Gross Profit = Sales - COGS
    const grossProfit = totalSales - cogs;

    // Net Profit = Gross Profit + Other Incomes - Expenses
    // Formula: (Sales - COGS) + Incomes - Expenses
    const netProfit = grossProfit + totalIncomes - totalExpenses;

    return { totalSales, totalExpenses, totalIncomes, netProfit, cogs, grossProfit };
  }, [rawSales, expenses, cogs, incomes]);

  const formatDateTime = (date?: Date) => {
    if (!date) return 'N/A';
    return format(date, "dd MMM yyyy, HH:mm", { locale: es });
  }

  const getDailySalesForSession = (sessionDate?: Date) => {
    if (!sessionDate) return 0;
    const dateKey = format(sessionDate, 'yyyy-MM-dd');
    return salesByDate[dateKey] || 0;
  }

  // Generate rows for ALL days in the date range, merging with session data
  const dailyRows = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return [];

    const rows: Array<{
      date: string;
      dateObj: Date;
      session: CashSession | null;
      dailySalesTotal: number;
    }> = [];

    // Generate all dates in range
    let currentDate = new Date(dateRange.from);
    const endDate = new Date(dateRange.to);
    endDate.setHours(23, 59, 59, 999);

    while (currentDate <= endDate) {
      const dateKey = format(currentDate, 'yyyy-MM-dd');

      // Find session(s) for this date - take the most recent one if multiple exist
      const sessionsForDate = filteredSessions
        .filter(s => {
          if (!s.closedAt) return false;
          // IMPORTANT: Parse date carefully. If s.closedAt is ISO string (UTC), 
          // new Date() converts to local. format() then uses local. 
          // Ideally we match based on the "Session Day" concept, usually when it was closed.
          const sessionDate = new Date(s.closedAt);
          // Safety check for invalid dates
          if (isNaN(sessionDate.getTime())) return false;

          const sessionDateKey = format(sessionDate, 'yyyy-MM-dd');

          return sessionDateKey === dateKey;
        })
        .sort((a, b) => {
          const aTime = a.closedAt ? new Date(a.closedAt).getTime() : 0;
          const bTime = b.closedAt ? new Date(b.closedAt).getTime() : 0;
          return bTime - aTime; // Most recent first
        });

      rows.push({
        date: dateKey,
        dateObj: new Date(currentDate),
        session: sessionsForDate[0] || null, // Take most recent session
        dailySalesTotal: salesByDate[dateKey] || 0
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return rows.reverse(); // Most recent first
  }, [dateRange, filteredSessions, salesByDate]);

  const handleSort = (key: keyof CashSession | 'difference') => {
    setSortConfig(current => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const months = [
    { value: "0", label: "Enero" },
    { value: "1", label: "Febrero" },
    { value: "2", label: "Marzo" },
    { value: "3", label: "Abril" },
    { value: "4", label: "Mayo" },
    { value: "5", label: "Junio" },
    { value: "6", label: "Julio" },
    { value: "7", label: "Agosto" },
    { value: "8", label: "Septiembre" },
    { value: "9", label: "Octubre" },
    { value: "10", label: "Noviembre" },
    { value: "11", label: "Diciembre" },
  ];

  const years = Array.from({ length: 5 }, (_, i) => (currentDate.getFullYear() - i).toString());

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tablero Financiero</h1>
          <p className="text-muted-foreground">Resumen de ganancias, gastos y cortes de caja.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const res = await fetch('/api/cron/daily-cut');
                const data = await res.json();
                if (data.success) {
                  alert("Corte automático simulado con éxito. Recarga la página para ver los cambios.");
                } else {
                  alert("Error al simular corte: " + data.error);
                }
              } catch (e) {
                alert("Error de conexión");
              }
            }}
          >
            Simular Corte Automático
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[300px] justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd MMM y", { locale: es })} -{" "}
                      {format(dateRange.to, "dd MMM y", { locale: es })}
                    </>
                  ) : (
                    format(dateRange.from, "dd MMM y", { locale: es })
                  )
                ) : (
                  <span>Selecciona un rango</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                locale={es}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(financials.totalSales)}</div>
            <p className="text-xs text-muted-foreground">
              {rawSales.length} ventas en el periodo
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo de Ventas (COGS)</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(financials.cogs)}</div>
            <p className="text-xs text-muted-foreground">
              Costo de productos vendidos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(financials.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              {loadingExpenses ? "Cargando..." : `${expenses.length} gastos registrados`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganancia Neta</CardTitle>
            <TrendingUp className={cn("h-4 w-4", financials.netProfit >= 0 ? "text-green-500" : "text-red-500")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", financials.netProfit >= 0 ? "text-green-600" : "text-red-600")}>
              {formatCurrency(financials.netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              (Ventas + Ingresos) - COGS - Gastos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Otros Ingresos</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(financials.totalIncomes)}</div>
            <p className="text-xs text-muted-foreground">
              {incomes.length} ingresos extras
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen Diario de Ventas y Cortes</CardTitle>
          <CardDescription>
            {dateRange?.from && dateRange?.to ? (
              <>Mostrando {dailyRows.length} días del {format(dateRange.from, "dd/MM/yyyy")} al {format(dateRange.to, "dd/MM/yyyy")}</>
            ) : (
              "Selecciona un rango de fechas"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <Select
              value={sortConfig?.key || "closedAt"}
              onValueChange={(value) => handleSort(value as any)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="closedAt">Fecha</SelectItem>
                <SelectItem value="sessionId">ID Sesión</SelectItem>
                <SelectItem value="closedByName">Cajero</SelectItem>
                <SelectItem value="totalCashSales">Ventas Efectivo</SelectItem>
                <SelectItem value="difference">Diferencia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Card Grid View (Desktop & Mobile) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dailyRows.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No hay datos en este periodo.
              </div>
            ) : (
              dailyRows.map((row) => (
                <Card key={row.date} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-bold text-lg">
                          {row.session ? formatDateTime(row.session.closedAt) : format(row.dateObj, "dd MMM yyyy", { locale: es })}
                        </div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {row.session ? row.session.sessionId : 'Sin sesión'}
                        </div>
                      </div>
                      <Badge variant={row.session ? "default" : "secondary"}>
                        {row.session ? "Cerrado" : "Sin Datos"}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Cajero:</span>
                        <span className="font-medium">{row.session ? row.session.closedByName : '-'}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 py-2 border-y border-dashed my-2">
                        <div>
                          <span className="text-xs text-muted-foreground block">Ventas del Día</span>
                          <span className="font-bold text-blue-600 text-base">{formatCurrency(row.dailySalesTotal)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block">Ventas Efectivo</span>
                          <span className="font-bold text-green-600 text-base">{row.session ? formatCurrency(row.session.totalCashSales ?? 0) : '-'}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Fondo Inicial:</span>
                        <span>{row.session ? formatCurrency(row.session.startingFloat ?? 0) : '-'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Efectivo Esperado:</span>
                        <span>{row.session ? formatCurrency(row.session.expectedCashInDrawer ?? 0) : '-'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Efectivo Contado:</span>
                        <span className="font-semibold">{row.session ? formatCurrency(row.session.actualCashCount ?? 0) : '-'}</span>
                      </div>

                      {row.session?.cashLeftForNextSession && row.session.cashLeftForNextSession > 0 ? (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground text-xs">Dejado en Caja:</span>
                          <span className="font-semibold text-blue-600">{formatCurrency(row.session.cashLeftForNextSession)}</span>
                        </div>
                      ) : null}

                      {row.session?.balanceBagAmount && row.session.balanceBagAmount > 0 ? (
                        <div className="flex justify-between items-center bg-purple-50 -mx-4 px-4 py-2 border-y border-purple-200">
                          <span className="text-muted-foreground text-xs">Bolsa de Saldo:</span>
                          <span className="font-semibold text-purple-700">{formatCurrency(row.session.balanceBagAmount)}</span>
                        </div>
                      ) : null}

                      {row.session && (
                        <div className="mt-2 pt-2 border-t border-dashed">
                          <span className="text-xs font-semibold text-muted-foreground mb-1 block">Bolsas (Venta / Saldo)</span>
                          {['recargas', 'mimovil', 'servicios'].map(key => {
                            const sale = (row.session!.bagsSalesAmounts as any)?.[key] || 0;
                            const end = (row.session!.bagsEndAmounts as any)?.[key] || 0;
                            if (sale === 0 && end === 0) return null;
                            return (
                              <div key={key} className="flex justify-between text-xs py-0.5">
                                <span className="capitalize text-muted-foreground">{key}:</span>
                                <span>
                                  <span className="text-blue-600">{formatCurrency(sale)}</span> / <span className="font-medium">{formatCurrency(end)}</span>
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2 mt-2 border-t bg-muted/20 -mx-4 px-4 py-2">
                        <span className="font-medium">Diferencia:</span>
                        <span className={cn("font-bold text-lg",
                          row.session?.difference && row.session.difference > 0 && "text-green-600",
                          row.session?.difference && row.session.difference < 0 && "text-red-600"
                        )}>
                          {row.session ? formatCurrency(row.session.difference ?? 0) : '-'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
