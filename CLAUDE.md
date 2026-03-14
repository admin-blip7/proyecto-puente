# CLAUDE.md — Proyecto Puente (22 Electronic Group POS)

## Project Overview

**Proyecto Puente** is a full-featured Point of Sale (POS) and e-commerce platform for **22 Electronic Group**, a consumer electronics retailer targeting Mexico/LATAM. It combines a customer-facing online store (`/tienda`) with a rich back-office admin panel (`/admin`) and an in-store POS terminal (`/pos`).

- **Stack:** Next.js 16 (App Router) + TypeScript + Supabase (Postgres + Auth + Storage)
- **UI:** Tailwind CSS + shadcn/ui (Radix primitives) + Lucide icons
- **Validation:** Zod schemas throughout
- **Testing:** Vitest (node environment)
- **Dev port:** `localhost:9003`

---

## Mandatory Pre-Task Steps

> From `AGENTS.md` — these rules apply to ALL agents and AI assistants:

1. **Read `project_context.md`** before starting any task — it tracks completed/in-progress work and agent assignments.
2. **After completing a task**, update `project_context.md`: move the task to "Completado", add date, agent name, and a brief description.
3. **Never modify files** listed in the "No tocar" section of `project_context.md`.
4. **Never recreate or duplicate** anything already marked "Completado".
5. **Stop and ask** if there is a conflict with another agent's work.
6. **Plan first**: for non-trivial tasks (3+ steps), write a plan to `tasks/todo.md` before coding.
7. **Capture lessons**: after any correction, update `tasks/lessons.md`.

---

## Directory Structure

```
proyecto-puente/
├── src/
│   ├── app/                      # Next.js App Router pages & API routes
│   │   ├── (admin-tienda)/       # Tienda admin route group (product mgmt, orders)
│   │   ├── (pos)/                # In-store POS terminal
│   │   ├── (socio)/              # Partner/socio portal
│   │   ├── (tienda)/             # Customer-facing e-commerce store
│   │   ├── admin/                # Back-office admin panel
│   │   │   ├── finance/          # Accounts, expenses, income, debts, assets
│   │   │   ├── inventory/        # Stock management, labels, kardex
│   │   │   ├── repairs/          # Repair order tracking
│   │   │   ├── crm/              # Customer relationship management
│   │   │   ├── sales/            # Sales history and reports
│   │   │   ├── delivery/         # Delivery routes & manifests
│   │   │   ├── diagnostico/      # iPhone diagnostic checklist
│   │   │   ├── consignors/       # Consignment management
│   │   │   └── partners/         # Partner store management
│   │   ├── api/                  # Next.js API routes (REST endpoints)
│   │   ├── login/                # Auth pages
│   │   └── layout.tsx            # Root layout with providers
│   ├── components/               # Reusable React components
│   │   ├── ui/                   # shadcn/ui primitive components
│   │   ├── admin/                # Admin-specific components
│   │   ├── pos/                  # POS terminal components
│   │   ├── tienda/               # Store-facing components
│   │   ├── auth/                 # AuthProvider, login forms
│   │   ├── shared/               # Cross-cutting shared components
│   │   └── preferences/          # App preferences provider
│   ├── lib/                      # Business logic and utilities
│   │   ├── services/             # ~60 service modules (one per domain)
│   │   ├── supabase/             # Supabase client helpers
│   │   ├── printing/             # Label & ticket PDF generation, QZ Tray
│   │   ├── validation/           # Zod-based validators
│   │   ├── hooks/                # React hooks
│   │   ├── utils.ts              # cn(), formatCurrency(), status helpers
│   │   ├── logger.ts             # Structured logger (getLogger)
│   │   └── supabaseClient.ts     # Browser Supabase client
│   ├── contexts/                 # React contexts (BranchContext)
│   ├── types/                    # Shared TypeScript types (index.ts)
│   ├── ai/                       # AI flow definitions (Genkit/BAML)
│   └── middleware.ts             # Auth guard for /tienda-admin routes
├── supabase/
│   ├── migrations/               # SQL migration files (timestamped)
│   ├── functions/                # Supabase Edge Functions
│   └── seed.sql                  # Database seed
├── scripts/                      # Node utility scripts
├── tasks/                        # Agent task tracking files
│   ├── todo.md                   # Current task plan
│   └── lessons.md                # Learned lessons from past corrections
├── memory/                       # Agent memory files
├── public/                       # Static assets
├── AGENTS.md                     # Agent rules (READ FIRST)
├── SPEC.md                       # Project specification
├── project_context.md            # Task tracker (MUST update after each task)
├── next.config.ts                # Next.js config (port 9003, dev distDir)
├── tailwind.config.ts            # Tailwind + brand palette
├── tsconfig.json                 # TS strict mode, @/* path alias
├── vitest.config.ts              # Vitest (node environment)
└── components.json               # shadcn/ui config
```

---

## Development Commands

```bash
npm run dev           # Start dev server at localhost:9003 (webpack)
npm run dev:turbo     # Start with Turbopack (faster, experimental)
npm run dev:clean     # Clear cache then start
npm run build         # Production build
npm run lint          # ESLint
npm run typecheck     # TypeScript check (tsc --noEmit)
npm run clean         # Remove .next build directory
npm run clean:cache   # Clear webpack cache only
```

**Note:** Dev builds output to `.next-dev/` (not `.next/`) to avoid conflicts with production builds.

---

## Environment Variables

Required env vars (not committed — use `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Key Conventions

### TypeScript / Code Style
- **Strict mode** enabled (`tsconfig.json`)
- Path alias: `@/*` maps to `src/*`
- Use `import type` for type-only imports
- No `any` unless unavoidable — prefer proper typing
- TypeScript build errors are **ignored** in production (`ignoreBuildErrors: true`) but should be fixed in development

### Component Patterns
- **Server Components** by default (App Router); add `'use client'` only when needed
- **shadcn/ui** for all UI primitives — do not reinvent buttons, dialogs, inputs, etc.
- Use `cn()` from `@/lib/utils` for conditional class merging (`clsx` + `tailwind-merge`)
- Lucide React for icons (`lucide-react`)
- Forms: `react-hook-form` + `@hookform/resolvers` + Zod schemas

### Styling
- Tailwind CSS with CSS variables for theming
- Dark mode via `class` strategy (`next-themes`)
- Brand palette defined in `tailwind.config.ts`:
  - Primary yellow: `#FFD600` (`primary-22`)
  - Background dark: `#050505` (`secondary-22`)
  - Sidebar bg: `#050505`
  - Brand gold: `#DBC095`
- Custom tokens: `brand.black.*`, `brand.white.*`, `brand.gray.*`, `brand.gold.*`
- Semantic colors: `brand.semantic.danger`, `.success`, `.warning`

### Service Layer
All database access goes through **service modules** in `src/lib/services/`. Each domain has its own service file (e.g., `salesService.ts`, `inventoryService.ts`). Do not query Supabase directly from page components — call a service function.

### Supabase Clients
- **Browser:** `supabaseClient.ts` — for client components
- **Server:** `supabaseServerClient.ts` — for Server Components and API routes
- **With Auth:** `supabaseClientWithAuth.ts` — for authenticated server calls

### Currency & Locale
- Default currency: **MXN** (Mexican Peso)
- Use `formatCurrency()` from `@/lib/utils` for all money display
- Validation: `validateMXNAmount()` from `@/lib/validation/currencyValidation`
- Never use raw `toFixed()` on currency — use the validation utilities

### Logging
Use the structured logger instead of `console.log`:
```ts
import { getLogger } from '@/lib/logger';
const log = getLogger('my-module');
log.info('message');
log.warn('warning');
log.error('error', err);
```
Console logs are stripped in production builds (except `console.error`).

### RBAC / Roles
User roles: `Admin`, `Cajero`, `Cliente`, `Socio`

Role checks are handled via:
- `src/lib/services/rbacService.ts` — server-side role queries
- `src/middleware.ts` — protects `/tienda-admin` routes (cookie-based admin token)
- `src/types/rbac.ts` — type definitions

---

## App Sections & Route Groups

| Route Group | Path | Purpose |
|-------------|------|---------|
| `(tienda)` | `/tienda/*` | Public e-commerce store |
| `(admin-tienda)` | `/tienda-admin/*` | Store admin (product/order mgmt) |
| `(pos)` | `/pos/*` | In-store POS terminal |
| `(socio)` | `/usuarios/*` | Partner user management |
| `admin/*` | `/admin/*` | Full back-office admin panel |

The root `/` redirects to `/tienda` (configured in `next.config.ts`).

---

## Domain Modules

### POS / Sales
- Cart management, sale creation, receipt printing
- Cash session tracking (open/close with float)
- Payment methods: `Efectivo`, `Tarjeta de Crédito`, `Crédito`, `QR/Transferencia`
- Sale cancellation with reason tracking

### Inventory / Products
- Products with ownership types: `Propio`, `Consigna`, `Familiar`
- Kardex (stock movement log): `INGRESO` / `SALIDA` movements
- Labels: thermal label PDF generation via `labelPdfGenerator.ts`
- QR codes per product (using `qrcode` and `react-qrcode-logo`)
- Barcode support via `jsbarcode`

### iPhones Seminuevos (Refurbished)
- Model-level grouping (`SeminuevoModel`) + individual units (`SeminuevoUnit`)
- Condition grades: `A` (Excellent), `B` (Good), `C` (Acceptable)
- Full diagnostic checklist stored in Supabase

### Repairs
- Status flow: `Recibido → En Diagnóstico → Esperando Refacción → En Reparación → Listo para Entrega → Completado | Cancelado`
- Parts tracking, labor cost, customer info

### Finance
- Accounts (Banco, Efectivo, Billetera Digital)
- Expenses, Income, Transfers
- Debts and debt payments
- Fixed assets with linear depreciation
- Balance sheet reporting

### CRM
- Client profiles with identification types
- Interaction history (sale, repair, credit payment, warranty, contact)
- Tasks with priority/status tracking
- Document management

### Printing
- **QZ Tray** integration for direct thermal printing (`src/lib/qz/`)
- **PDF generation** fallback via `jsPDF` + `jspdf-autotable`
- Print routing: QZ Tray (if configured) or browser print dialog
- Separate printers for tickets vs. labels

### Delivery
- Route management with stops
- Driver WhatsApp notifications
- Offline-capable delivery tracking

---

## Database (Supabase)

- Migrations in `supabase/migrations/` — timestamped SQL files
- Edge Functions in `supabase/functions/`
- Multi-tenant: products/sales/etc. are scoped by `branchId` (via `BranchContext`)
- RLS (Row Level Security) enforced at the database level

To apply migrations:
```bash
# Via Supabase CLI
supabase db push

# Or via npm scripts for specific CRM migrations
npm run supabase:crm-migrate
npm run supabase:crm-sql
```

---

## Testing

```bash
npx vitest              # Run all tests
npx vitest run          # Run once (no watch)
```

Tests use Vitest with `vite-tsconfig-paths` for `@/*` alias resolution. Test files are colocated or in `__tests__` directories. Environment is `node`.

---

## AI / Agent Integrations

- **AI flows** in `src/ai/flows/` — currently `parse-stock-entry-command.ts`
- Uses BAML for AI workflow definitions (see `AGENTS.md` rule: "Usar siempre Baml en los workflow")
- `src/app/agent/` — agent-related pages/endpoints

---

## Multi-Agent Workflow

This project uses multiple AI agents simultaneously (Claude, Codex/OpenAI, Gemini CLI). Key coordination rules:

1. **Always read `project_context.md`** before starting — check what's completed and in progress.
2. **Always update `project_context.md`** after finishing — mark tasks complete with date and agent name.
3. **Check `tasks/lessons.md`** at session start for known pitfalls.
4. **Write plans to `tasks/todo.md`** for non-trivial tasks before coding.
5. Avoid working on the same files as another agent's active tasks.

---

## Common Pitfalls & Notes

- **TypeScript errors are suppressed in builds** — don't assume clean build = type-safe code. Run `npm run typecheck` explicitly.
- **Currency handling** — always use `formatCurrency()` and `validateMXNAmount()`, never raw `toFixed(2)`.
- **Branch context** — all data queries must respect `branchId` from `BranchContext` for multi-store support.
- **Server vs Client components** — be explicit. Supabase server client only works in Server Components and API routes.
- **Dev output dir** is `.next-dev/` not `.next/` — don't confuse them.
- **QZ Tray** requires a signed JAR for production thermal printing — see `QZ_TRAY_SIGNED_SETUP.md`.
- **Design reference** — use `22desing.html` (index.html) as the visual design reference for new UI work.
- **Do not delete files** without explicit user confirmation.
- **Do not recreate completed work** — check `project_context.md` first.
