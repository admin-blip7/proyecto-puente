
"use client"

import { useState, useEffect, useMemo } from "react";
import { CashSession, Expense } from "@/types";
import { Button } from "@/components/ui/button";
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

  // Fetch expenses, daily sales, and COGS when date range changes
  useEffect(() => {
    const fetchData = async () => {
      if (!dateRange?.from || !dateRange?.to) return;

      setLoadingExpenses(true);
      try {
        const { getExpensesByDateRange, getDailySalesStats, getCOGSByDateRange } = await import("@/lib/services/financeService");

        const [expensesData, salesData, cogsData] = await Promise.all([
          getExpensesByDateRange(dateRange.from, dateRange.to),
          getDailySalesStats(dateRange.from, dateRange.to),
          getCOGSByDateRange(dateRange.from, dateRange.to)
        ]);

        setExpenses(expensesData);
        setRawSales(salesData);
        setCOGS(cogsData);
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

    // Gross Profit = Sales - COGS
    const grossProfit = totalSales - cogs;

    // Net Profit = Gross Profit - Expenses = Sales - COGS - Expenses
    const netProfit = grossProfit - totalExpenses;

    return { totalSales, totalExpenses, netProfit, cogs, grossProfit };
  }, [rawSales, expenses, cogs]);

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
          const sessionDateKey = format(new Date(s.closedAt), 'yyyy-MM-dd');
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
              Ventas - COGS - Gastos
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
          <ScrollArea className="h-[calc(100vh-400px)] w-full">
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort('sessionId')}>
                        ID Sesión
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort('closedAt')}>
                        Fecha Cierre
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort('closedByName')}>
                        Cajero
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      Ventas del Día
                    </TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" onClick={() => handleSort('startingFloat')}>
                        Fondo Inicial
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" onClick={() => handleSort('totalCashSales')}>
                        Ventas Efectivo
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" onClick={() => handleSort('expectedCashInDrawer')}>
                        Efectivo Esperado
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" onClick={() => handleSort('actualCashCount')}>
                        Efectivo Contado
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" onClick={() => handleSort('difference')}>
                        Diferencia
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        No hay datos en este periodo.
                      </TableCell>
                    </TableRow>
                  ) : (
                    dailyRows.map((row) => (
                      <TableRow key={row.date}>
                        <TableCell className="font-mono">
                          {row.session ? row.session.sessionId : '-'}
                        </TableCell>
                        <TableCell>
                          {row.session ? formatDateTime(row.session.closedAt) : format(row.dateObj, "dd MMM yyyy", { locale: es })}
                        </TableCell>
                        <TableCell>
                          {row.session ? row.session.closedByName : '-'}
                        </TableCell>
                        <TableCell className="text-right font-bold text-blue-600">
                          {formatCurrency(row.dailySalesTotal)}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.session ? formatCurrency(row.session.startingFloat ?? 0) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {row.session ? formatCurrency(row.session.totalCashSales ?? 0) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {row.session ? formatCurrency(row.session.expectedCashInDrawer ?? 0) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {row.session ? formatCurrency(row.session.actualCashCount ?? 0) : '-'}
                        </TableCell>
                        <TableCell className={cn("text-right font-bold",
                          row.session?.difference && row.session.difference > 0 && "text-green-600",
                          row.session?.difference && row.session.difference < 0 && "text-red-600"
                        )}>
                          {row.session ? formatCurrency(row.session.difference ?? 0) : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
