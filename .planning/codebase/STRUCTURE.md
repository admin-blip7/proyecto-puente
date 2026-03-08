# Codebase Structure

**Analysis Date:** 2026-03-09

## Directory Layout

```
proyecto-puente-firebase/
├── src/
│   ├── app/                        # Next.js App Router pages and API routes
│   │   ├── layout.tsx              # Root layout — global providers
│   │   ├── globals.css             # Global stylesheet
│   │   ├── login/                  # Login page (public)
│   │   ├── change-password/        # Password reset pages
│   │   ├── reset-password/
│   │   ├── (pos)/                  # Route group: Point-of-Sale surface
│   │   │   ├── layout.tsx          # POS layout (delegates to src/layouts/POSLayout.tsx)
│   │   │   └── pos/
│   │   │       ├── page.tsx        # POS main page (SSR → POSClient)
│   │   │       └── mayoreo-config/ # Wholesale pricing config page
│   │   ├── (tienda)/               # Route group: Customer storefront
│   │   │   ├── layout.tsx          # Tienda layout (CartProvider, TiendaHeader/Footer)
│   │   │   └── tienda/
│   │   │       ├── page.tsx        # Storefront home
│   │   │       ├── buscar/         # Search page
│   │   │       ├── categoria/[slug]/
│   │   │       ├── categorias/
│   │   │       ├── checkout/
│   │   │       ├── cuenta/         # Customer account (perfil, compras)
│   │   │       ├── favoritos/
│   │   │       ├── producto/[id]/
│   │   │       └── (static pages: envios, garantia, devoluciones, pagos, terminos, privacidad)
│   │   ├── (admin-tienda)/         # Route group: Storefront CMS admin
│   │   │   └── tienda-admin/
│   │   │       ├── layout.tsx      # CMS sidebar layout
│   │   │       ├── page.tsx        # CMS dashboard
│   │   │       ├── products/       # Product management (+ group variants)
│   │   │       ├── orders/
│   │   │       └── settings/
│   │   ├── admin/                  # Internal ops/backoffice (no route group)
│   │   │   ├── layout.tsx          # Thin passthrough — forces dynamic rendering
│   │   │   ├── page.tsx            # Inventory dashboard
│   │   │   ├── finance/            # Finance sub-pages (accounts, assets, balance, cash-history, categories, debts, expenses)
│   │   │   ├── inventory/          # Add / edit / quick-intake
│   │   │   ├── consignors/         # Consignor list, payments, sales report
│   │   │   ├── crm/                # CRM clients (list, new, detail)
│   │   │   ├── delivery/           # Delivery routes, reports
│   │   │   ├── kardex/             # Kardex list and per-product detail
│   │   │   ├── repairs/            # Repair orders
│   │   │   ├── sales/              # Sales list + consignor reports
│   │   │   ├── suppliers/          # Supplier list + detail
│   │   │   ├── warranties/
│   │   │   ├── labels/
│   │   │   ├── purchases/
│   │   │   ├── stock-entry/
│   │   │   ├── settings/
│   │   │   ├── intelligence/       # AI/analytics
│   │   │   ├── compatibility/
│   │   │   ├── auditoria-productos/
│   │   │   └── diagnostico/
│   │   ├── api/                    # REST API routes
│   │   │   ├── sales/              # POST /api/sales, cancel, change-product
│   │   │   ├── consignors/         # CRUD + register-payment, sales-report
│   │   │   ├── repairs/            # update-details, update-notes, update-status
│   │   │   ├── purchase-orders/
│   │   │   ├── diagnostics/        # Device diagnostics
│   │   │   ├── qz/                 # QZ Tray print server (certificate, sign)
│   │   │   ├── public/products/    # Unauthenticated product catalog
│   │   │   ├── cron/daily-cut/     # Scheduled daily cash cut
│   │   │   ├── micas/search/
│   │   │   ├── settings/labels/
│   │   │   ├── compatibilidad/     # Device compatibility registrar/historial/modelos
│   │   │   └── (misc debug & setup routes)
│   │   ├── mobile/delivery/        # Mobile delivery driver view
│   │   ├── socio/                  # Partner dashboard + branch selector
│   │   └── agent/                  # Design/tooling prototype pages
│   ├── components/
│   │   ├── ui/                     # shadcn/ui primitives (button, dialog, table, etc.)
│   │   ├── shared/                 # Cross-surface: LeftSidebar, Header, ErrorBoundary
│   │   ├── auth/                   # AuthProvider, LoginClient
│   │   ├── preferences/            # AppPreferencesProvider
│   │   ├── pos/                    # POSClient, CheckoutDialog, checkout/
│   │   ├── admin/                  # Feature components per admin section
│   │   │   ├── finance/            # (accounts, assets, balance-sheet, cash-history, …)
│   │   │   ├── inventory/
│   │   │   ├── consignors/
│   │   │   ├── crm/
│   │   │   ├── delivery/
│   │   │   ├── kardex/
│   │   │   ├── repairs/
│   │   │   ├── sales/
│   │   │   ├── settings/
│   │   │   ├── labels/
│   │   │   ├── suppliers/
│   │   │   ├── tienda/
│   │   │   └── warranties/
│   │   ├── tienda/                 # Storefront-specific UI
│   │   │   ├── layout/             # TiendaHeader, TiendaFooter
│   │   │   ├── cart/               # CartProvider, CartSidebar
│   │   │   ├── auth/
│   │   │   └── checkout/
│   │   ├── landing/                # Marketing/landing page components
│   │   ├── web/
│   │   ├── stock/
│   │   ├── products/
│   │   ├── checkout/
│   │   ├── infra/
│   │   └── reactbits/              # Animation/design system experiments
│   ├── lib/
│   │   ├── supabaseClient.ts       # Anon-key Supabase client (browser)
│   │   ├── supabaseServerClient.ts # Service-role Supabase client (server)
│   │   ├── supabaseClientWithAuth.ts
│   │   ├── logger.ts               # getLogger(scope) utility
│   │   ├── utils.ts                # cn() and general helpers
│   │   ├── tiendaPricing.ts        # Storefront pricing logic
│   │   ├── polyfill-storage.ts     # localStorage polyfill for SSR
│   │   ├── deliveryDriverConfig.ts
│   │   ├── appPreferences.ts
│   │   ├── dictionaries.ts
│   │   ├── hooks.ts                # useAuth hook
│   │   ├── productSlugs.ts
│   │   ├── services/               # Business logic & DB access (one file per domain)
│   │   │   ├── productService.ts
│   │   │   ├── salesService.ts
│   │   │   ├── financeService.ts
│   │   │   ├── cashSessionService.ts
│   │   │   ├── kardexService.ts
│   │   │   ├── consignorService.ts
│   │   │   ├── repairService.ts
│   │   │   ├── warrantyService.ts
│   │   │   ├── crmService.ts
│   │   │   ├── deliveryRouteService.ts
│   │   │   ├── tiendaProductService.ts
│   │   │   ├── tiendaCmsService.ts
│   │   │   ├── settingsService.ts
│   │   │   ├── accountService.ts
│   │   │   ├── debtService.ts
│   │   │   ├── assetService.ts
│   │   │   ├── categoryService.ts
│   │   │   ├── paymentService.ts
│   │   │   ├── supplierService.ts
│   │   │   ├── purchaseOrderService.ts
│   │   │   └── (pdf, image, printing, AI helpers)
│   │   ├── supabase/
│   │   │   ├── utils.ts            # toDate(), nowIso()
│   │   │   └── migrations/         # SQL migration files
│   │   ├── actions/                # Next.js Server Actions for image search
│   │   ├── middleware/             # SSR error handler
│   │   ├── utils/                  # Domain utility helpers
│   │   │   ├── cashCalculations.ts
│   │   │   ├── crmUtils.ts
│   │   │   ├── exportUtils.ts
│   │   │   └── keys.ts
│   │   ├── hooks/                  # Additional custom hooks
│   │   ├── validation/
│   │   ├── qz/                     # QZ Tray print integration helpers
│   │   ├── printing/
│   │   └── diagnostics/
│   ├── contexts/
│   │   └── BranchContext.tsx       # Multi-branch selection (React Context)
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   ├── use-toast.ts
│   │   ├── useControlledInput.ts
│   │   ├── useDebouncedValue.ts
│   │   ├── useOnClickOutside.ts
│   │   └── useStablePortal.ts
│   ├── layouts/
│   │   ├── POSLayout.tsx           # POS shell layout
│   │   └── WebLayout.tsx
│   ├── types/
│   │   ├── index.ts                # All domain interfaces (Product, Sale, Consignor, etc.)
│   │   └── discount.ts
│   ├── config/
│   │   └── images.ts
│   ├── ai/flows/                   # Genkit/AI flow definitions
│   └── scripts/                    # One-off migration/utility scripts
├── scripts/                        # Node scripts for maintenance/setup
├── public/                         # Static assets (fonts, images, reviews)
├── assets/                         # Design assets (identity, reviews)
├── .planning/codebase/             # GSD analysis documents
├── tasks/                          # todo.md, lessons.md
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Directory Purposes

**`src/app/(pos)/`:**
- Purpose: Point-of-Sale terminal interface
- Contains: Main POS page, wholesale pricing config
- Key files: `src/app/(pos)/pos/page.tsx` (SSR entry), `src/components/pos/POSClient.tsx` (interactive)

**`src/app/(tienda)/`:**
- Purpose: Public-facing customer storefront
- Contains: Product catalog, product detail, cart/checkout, customer account, static pages
- Key files: `src/app/(tienda)/layout.tsx` (CartProvider wrapper), `src/app/(tienda)/tienda/page.tsx`

**`src/app/(admin-tienda)/`:**
- Purpose: CMS for the storefront (product publishing, order management, settings)
- Contains: Products, orders, settings pages for store content management
- Key files: `src/app/(admin-tienda)/tienda-admin/layout.tsx`

**`src/app/admin/`:**
- Purpose: Internal back-office operations (inventory, sales, finance, CRM, repairs)
- Contains: One page per operational section; thin Server Components that hydrate Client components
- Key files: `src/app/admin/page.tsx`, `src/app/admin/finance/page.tsx`, `src/app/admin/layout.tsx`

**`src/app/api/`:**
- Purpose: REST API surface for mutations and external integrations
- Contains: Route handlers organized by domain
- Key files: `src/app/api/sales/route.ts`, `src/app/api/purchase-orders/route.ts`

**`src/lib/services/`:**
- Purpose: All Supabase queries and business logic. Single source of truth for data access.
- Contains: Domain service files — one per entity/feature
- Key files: `src/lib/services/productService.ts`, `src/lib/services/salesService.ts`, `src/lib/services/financeService.ts`

**`src/components/ui/`:**
- Purpose: shadcn/ui component library primitives
- Contains: button, dialog, table, sheet, select, input, badge, etc.
- Generated: No (manually curated from shadcn/ui)

**`src/components/shared/`:**
- Purpose: Cross-surface components used by both admin and POS
- Key files: `src/components/shared/LeftSidebar.tsx`, `src/components/shared/Header.tsx`

**`src/types/index.ts`:**
- Purpose: All shared TypeScript types. Import from here for any domain model.
- Contains: `Product`, `Sale`, `SaleItem`, `CartItem`, `Consignor`, `Supplier`, `UserProfile`, Zod schemas

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout with all global providers
- `src/app/(pos)/pos/page.tsx`: POS surface entry
- `src/app/(tienda)/tienda/page.tsx`: Storefront home
- `src/app/admin/page.tsx`: Admin/inventory dashboard entry
- `src/app/login/page.tsx`: Authentication entry

**Configuration:**
- `next.config.ts`: Next.js configuration
- `tailwind.config.ts`: Tailwind + custom theme
- `tsconfig.json`: TypeScript config with `@/` path alias → `src/`
- `src/config/images.ts`: Image configuration constants

**Core Logic:**
- `src/lib/supabaseClient.ts`: Browser Supabase client (anon key)
- `src/lib/supabaseServerClient.ts`: Server Supabase client (service role)
- `src/lib/services/productService.ts`: Product CRUD + stock management
- `src/lib/services/salesService.ts`: Sale processing (POS + delivery)
- `src/lib/services/financeService.ts`: Accounts, expenses, cash sessions
- `src/lib/logger.ts`: Logging utility
- `src/lib/tiendaPricing.ts`: Storefront pricing calculations

**Authentication:**
- `src/components/auth/AuthProvider.tsx`: Session management, role-based redirect
- `src/lib/hooks.ts`: `useAuth()` hook

**Testing:**
- Not detected — no test files or test framework configuration found

## Naming Conventions

**Files:**
- Page files: `page.tsx` (always lowercase, required by Next.js)
- Layout files: `layout.tsx`
- Client components: `*Client.tsx` (e.g., `POSClient.tsx`, `InventoryClient.tsx`, `FinancePageWrapper.tsx`)
- Service files: `*Service.ts` in camelCase (e.g., `salesService.ts`, `productService.ts`)
- API routes: `route.ts` inside a named directory
- Hooks: `use*.ts` or `use*.tsx`
- Context/Providers: `*Context.tsx`, `*Provider.tsx`

**Directories:**
- Route groups use parentheses: `(pos)`, `(tienda)`, `(admin-tienda)`
- Dynamic segments use brackets: `[productId]`, `[id]`, `[slug]`
- All directory names are kebab-case

**Components:**
- PascalCase for component files and exports: `TiendaHeader`, `POSClient`, `LeftSidebar`
- UI primitives in `src/components/ui/` are lowercase kebab-case filenames

**TypeScript:**
- Interfaces are PascalCase: `Product`, `Sale`, `UserProfile`
- Type aliases are PascalCase: `OwnershipType`
- Constants in service files are UPPER_SNAKE_CASE: `PRODUCTS_TABLE`, `SALES_TABLE`

## Where to Add New Code

**New Admin Feature:**
- Page entry: `src/app/admin/{feature-name}/page.tsx` (Server Component, fetch data, pass to client)
- Client component: `src/components/admin/{feature-name}/{FeatureName}Client.tsx`
- Service: `src/lib/services/{featureName}Service.ts` (mark `"use server"` at top)
- API route (if needed): `src/app/api/{feature-name}/route.ts`
- Types: Add interfaces to `src/types/index.ts`

**New Storefront Page:**
- Page: `src/app/(tienda)/tienda/{page-name}/page.tsx`
- Components: `src/components/tienda/{feature}/`

**New POS Feature:**
- Add to `src/components/pos/` — interactive logic goes in `POSClient.tsx` or a new sub-component
- Service calls go through existing services or a new `src/lib/services/` file

**New API Endpoint:**
- Create `src/app/api/{resource}/route.ts`
- Call service layer functions — no direct Supabase queries inside route handlers

**Shared UI Component:**
- Primitive (based on Radix): `src/components/ui/{component-name}.tsx`
- Cross-surface utility: `src/components/shared/{ComponentName}.tsx`

**Utilities:**
- Domain-specific helpers: `src/lib/utils/{domain}Utils.ts`
- Supabase helpers: `src/lib/supabase/utils.ts`

## Special Directories

**`.planning/codebase/`:**
- Purpose: GSD codebase analysis documents
- Generated: No (written by AI agents)
- Committed: Yes

**`src/lib/supabase/migrations/`:**
- Purpose: SQL migration scripts for schema changes
- Generated: No
- Committed: Yes

**`scripts/`:**
- Purpose: Node.js one-off maintenance scripts (cache clear, image backfill, Supabase migrations)
- Generated: No
- Committed: Yes

**`public/`:**
- Purpose: Static assets served directly (fonts, review images, marketing assets)
- Generated: No
- Committed: Yes

**`.next-dev/` and `.next/`:**
- Purpose: Next.js build cache and output
- Generated: Yes
- Committed: No (should be in .gitignore, but `.next-dev/` appears in git status — potential concern)

---

*Structure analysis: 2026-03-09*
