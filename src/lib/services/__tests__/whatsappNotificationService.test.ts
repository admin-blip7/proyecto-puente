import { describe, it, expect } from 'vitest';
import { buildCorteMessage } from '../whatsappNotificationService';
import type { CashSession, Sale } from '@/types';

const baseSession: CashSession = {
  id: 'sess-1',
  sessionId: 'SESS-001',
  status: 'Cerrado',
  openedBy: 'user-1',
  openedByName: 'Juan Pérez',
  openedAt: new Date('2026-03-09T08:00:00Z'),
  closedBy: 'user-1',
  closedByName: 'Juan Pérez',
  closedAt: new Date('2026-03-09T10:00:00Z'),
  startingFloat: 500,
  totalCashSales: 1200,
  totalCardSales: 800,
  totalCashPayouts: 100,
  expectedCashInDrawer: 1600,
};

const baseSales: Sale[] = [
  {
    id: 'sale-1',
    saleId: 'SALE-001',
    items: [
      { productId: 'p1', name: 'iPhone 13 Pro', quantity: 1, priceAtSale: 900 },
      { productId: 'p2', name: 'Funda Transparente', quantity: 2, priceAtSale: 50 },
    ],
    totalAmount: 1000,
    paymentMethod: 'Efectivo',
    cashierId: 'user-1',
    customerName: null,
    customerPhone: null,
    createdAt: new Date('2026-03-09T10:00:00Z'),
    status: 'completed',
  },
  {
    id: 'sale-2',
    saleId: 'SALE-002',
    items: [
      { productId: 'p3', name: 'Cable USB-C', quantity: 1, priceAtSale: 200 },
    ],
    totalAmount: 200,
    paymentMethod: 'Tarjeta de Crédito',
    cashierId: 'user-1',
    customerName: null,
    customerPhone: null,
    createdAt: new Date('2026-03-09T12:00:00Z'),
    status: 'completed',
  },
];

describe('buildCorteMessage', () => {
  it('Test 1: returns string containing branch name in header line', () => {
    const msg = buildCorteMessage({ session: baseSession, sales: baseSales, branchName: 'Sucursal Centro' });
    expect(msg).toContain('Sucursal Centro');
  });

  it('Test 2: returns string containing "Efectivo" and cashSales amount formatted with $', () => {
    const msg = buildCorteMessage({ session: baseSession, sales: baseSales, branchName: 'Sucursal Centro' });
    expect(msg).toContain('Efectivo');
    expect(msg).toContain('$1200.00');
  });

  it('Test 3: returns string containing "Tarjeta" and cardSales amount', () => {
    const msg = buildCorteMessage({ session: baseSession, sales: baseSales, branchName: 'Sucursal Centro' });
    expect(msg).toContain('Tarjeta');
    expect(msg).toContain('$800.00');
  });

  it('Test 4: returns string containing "Total" as sum of cash + card', () => {
    const msg = buildCorteMessage({ session: baseSession, sales: baseSales, branchName: 'Sucursal Centro' });
    expect(msg).toContain('Total');
    expect(msg).toContain('$2000.00');
  });

  it('Test 5: returns string containing cashier name from session.openedByName', () => {
    const msg = buildCorteMessage({ session: baseSession, sales: baseSales, branchName: 'Sucursal Centro' });
    expect(msg).toContain('Juan Pérez');
  });

  it('Test 6: returns string containing date from session.closedAt formatted dd/MM/yyyy', () => {
    const msg = buildCorteMessage({ session: baseSession, sales: baseSales, branchName: 'Sucursal Centro' });
    expect(msg).toContain('09/03/2026');
  });

  it('Test 7: sales items (non-cancelled) appear in product detail section', () => {
    const msg = buildCorteMessage({ session: baseSession, sales: baseSales, branchName: 'Sucursal Centro' });
    expect(msg).toContain('iPhone 13 Pro');
    expect(msg).toContain('Funda Transparente');
    expect(msg).toContain('Cable USB-C');
  });

  it('Test 8: cancelled sales are excluded from product detail', () => {
    const salesWithCancelled: Sale[] = [
      ...baseSales,
      {
        id: 'sale-3',
        saleId: 'SALE-003',
        items: [{ productId: 'p4', name: 'Producto Cancelado', quantity: 1, priceAtSale: 500 }],
        totalAmount: 500,
        paymentMethod: 'Efectivo',
        cashierId: 'user-1',
        customerName: null,
        customerPhone: null,
        createdAt: new Date('2026-03-09T14:00:00Z'),
        status: 'cancelled',
      },
    ];
    const msg = buildCorteMessage({ session: baseSession, sales: salesWithCancelled, branchName: 'Sucursal Centro' });
    expect(msg).not.toContain('Producto Cancelado');
  });

  it('Test 9: empty sales array produces message without product lines (no crash)', () => {
    const msg = buildCorteMessage({ session: baseSession, sales: [], branchName: 'Sucursal Centro' });
    expect(msg).toContain('Sucursal Centro');
    expect(msg).toContain('Juan Pérez');
    expect(msg).not.toContain('Productos vendidos');
  });

  it('Test 10: product names are truncated to 25 chars to avoid excessively long lines', () => {
    const longNameSale: Sale[] = [
      {
        id: 'sale-long',
        saleId: 'SALE-LONG',
        items: [
          {
            productId: 'p-long',
            name: 'Este es un nombre muy largo de producto',
            quantity: 1,
            priceAtSale: 300,
          },
        ],
        totalAmount: 300,
        paymentMethod: 'Efectivo',
        cashierId: 'user-1',
        customerName: null,
        customerPhone: null,
        createdAt: new Date('2026-03-09T10:00:00Z'),
        status: 'completed',
      },
    ];
    const msg = buildCorteMessage({ session: baseSession, sales: longNameSale, branchName: 'Sucursal Centro' });
    // Full name is 38 chars; truncated to 25 chars = "Este es un nombre muy lar"
    expect(msg).not.toContain('Este es un nombre muy largo de producto');
    expect(msg).toContain('Este es un nombre muy lar');
  });
});
