# Architecture

**Analysis Date:** 2026-03-09

## Pattern Overview

**Overall:** Multi-surface Next.js App Router application with a service layer

**Key Characteristics:**
- Next.js App Router with route groups separating distinct surfaces: admin (`/admin`), POS (`/(pos)`), storefront (`/(tienda)`), and store admin (`/(admin-tienda)`)
- Thin Server Component pages that fetch data via a `lib/services/` layer and hand it down as props to "Client" components
- Dual Supabase client strategy: anon-key browser client (`supabaseClient.ts`) for auth and real-time reads; service-role server client (`supabaseServerClient.ts`) for privileged writes
- REST API routes under `src/app/api/` for browser-initiated mutations (POST sales, cancel orders, etc.)
- Server Actions (`"use server"`) used directly inside service files such as `productService.ts` and `salesService.ts`

## Layers

**Pages (Server Components):**
- Purpose: Entry points per route. Fetch initial data at render time using service functions. Pass data to a co-located Client component.
- Location: `src/app/**/(page|layout).tsx`
- Contains: `async` RSC functions, `export const dynamic = "force-dynamic"`, layout shells with `LeftSidebar` + `Sheet`
- Depends on: `src/lib/services/`
- Used by: Next.js router

**Client Components:**
- Purpose: Interactive UI, state management, event handling. Receives initial data as props; re-fetches via service calls or API routes.
- Location: `src/components/admin/`, `src/components/pos/`, `src/components/tienda/`
- Contains: `"use client"` components named `*Client.tsx` or feature-specific components
- Depends on: `src/lib/services/` (for direct calls) or `src/app/api/` (via fetch)
- Used by: Pages

**Service Layer:**
- Purpose: All business logic and database access. One file per domain entity. Services are marked `"use server"` and call Supabase directly.
- Location: `src/lib/services/*.ts`
- Contains: CRUD functions, aggregations, business rules (pricing, kardex, CRM linking)
- Depends on: `src/lib/supabaseServerClient.ts` (privileged ops), `src/lib/supabaseClient.ts` (client-side calls), `src/lib/supabase/utils.ts`
- Used by: Pages, API routes, other services

**API Routes:**
- Purpose: HTTP endpoints for browser-initiated mutations. Also used by external webhooks and cron jobs.
- Location: `src/app/api/**/route.ts`
- Contains: `GET`/`POST` handlers using `NextRequest`/`NextResponse`; call service layer
- Depends on: `src/lib/services/`, `src/lib/supabaseServerClient.ts`
- Used by: Client components via `fetch`, external systems

**Contexts & Providers:**
- Purpose: Global shared state passed through React tree.
- Location: `src/contexts/BranchContext.tsx`, `src/components/auth/AuthProvider.tsx`, `src/components/preferences/AppPreferencesProvider.tsx`
- Contains: React Context + Provider components
- Depends on: `src/lib/supabaseClient.ts`
- Used by: Entire app via `src/app/layout.tsx`

**Types:**
- Purpose: Shared TypeScript interfaces and Zod schemas.
- Location: `src/types/index.ts`, `src/types/discount.ts`
- Contains: Domain interfaces (`Product`, `Sale`, `Consignor`, etc.), enums, Zod schemas
- Depends on: Nothing
- Used by: All layers

## Data Flow

**Page Load (SSR → Client hydration):**

1. Browser requests a route (e.g., `/pos`, `/admin`)
2. Next.js renders the Server Component page (`page.tsx`)
3. Page calls service functions (e.g., `getProducts()`, `getSales()`) which use `getSupabaseServerClient()`
4. Fetched data is passed as `initialData` props to the `*Client.tsx` component
5. Client component hydrates with server data, then manages local state and re-fetches as needed

**Mutation Flow (Client → API Route → DB):**

1. Client component triggers an action (form submit, button click)
2. Component calls either a Server Action directly (e.g., `addSaleAndUpdateStock`) or hits an API route via `fetch`
3. API route / Server Action uses `getSupabaseServerClient()` to write to Supabase
4. Side effects triggered in service layer: kardex movement, CRM registration, finance deposit
5. Response returned; client updates local state or reloads

**Authentication Flow:**

1. `AuthProvider` (`src/components/auth/AuthProvider.tsx`) subscribes to `supabase.auth.onAuthStateChange`
2. On session load, builds `UserProfile` from `user.user_metadata` and `app_metadata`
3. Role determines post-login redirect: `Admin`/`Cajero` → `/pos`, `Socio` → `/socio/dashboard`, `Cliente` → `/tienda/cuenta/perfil`
4. Access token is synced to a cookie (`tienda_admin_access_token`) for SSR middleware use
5. `BranchContext` loads the user's available branches after auth resolves

**State Management:**
- Global: React Context (`AuthContext`, `BranchContext`, `AppPreferencesProvider`, `CartProvider`)
- Local: `useState`/`useReducer` inside Client components
- No Redux/Zustand; no external state library

## Key Abstractions

**Service Functions:**
- Purpose: Encapsulate all Supabase queries. Pages and API routes call these; they never build queries inline.
- Examples: `src/lib/services/productService.ts`, `src/lib/services/salesService.ts`, `src/lib/services/financeService.ts`
- Pattern: Named exports (`getProducts`, `addProduct`, `updateProduct`). Marked `"use server"` at the top of the file.

**Supabase Clients:**
- Purpose: Two separate clients for different trust levels.
  - `supabase` (anon, browser): `src/lib/supabaseClient.ts` — used in Client Components and `AuthProvider`
  - `getSupabaseServerClient()`: `src/lib/supabaseServerClient.ts` — called per-request in Server Actions and API routes; uses `SUPABASE_SERVICE_ROLE_KEY` in production
- Pattern: Import `supabase` for browser code; call `getSupabaseServerClient()` for server code

**UserProfile:**
- Purpose: Normalized user object derived from Supabase auth metadata.
- Examples: `src/types/index.ts` (interface), `src/components/auth/AuthProvider.tsx` (builder)
- Pattern: Built by `buildUserProfile(user)` inside `AuthProvider`. Roles: `Admin`, `Cajero`, `Socio`, `Cliente`.

**Logger:**
- Purpose: Structured, scoped logging with environment-controlled verbosity.
- Examples: `src/lib/logger.ts`
- Pattern: `const log = getLogger("scope")` at top of file; use `log.info()`, `log.error()`, etc.

## Entry Points

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: Every request
- Responsibilities: Wraps all surfaces in `AuthProvider`, `BranchProvider`, `AppPreferencesProvider`, `ThemeProvider`; loads font and global CSS; fetches `appPreferences` server-side

**Admin / POS Pages:**
- Location: `src/app/admin/page.tsx`, `src/app/(pos)/pos/page.tsx`
- Triggers: Navigation to `/admin` or `/pos`
- Responsibilities: Fetch initial product data server-side; render sidebar layout + hydrate Client component

**Storefront Layout:**
- Location: `src/app/(tienda)/layout.tsx`
- Triggers: Any `/tienda/*` route
- Responsibilities: Wraps storefront in its own `ThemeProvider` (forced light), `CartProvider`, `TiendaHeader`, `TiendaFooter`

**API Routes:**
- Location: `src/app/api/**/route.ts`
- Triggers: HTTP requests from Client components or external callers
- Responsibilities: Validate input, call service layer, return `NextResponse.json`

## Error Handling

**Strategy:** Catch-and-log at each layer boundary. Pages use `safeFetch()` wrappers for SSR. API routes return `{ error, status: 500 }` on failure.

**Patterns:**
- Service functions: `try/catch` with `log.error()`; re-throw or return `null`/empty array on failure
- API routes: `try/catch` blocks; return `NextResponse.json({ error }, { status: 500 })`
- SSR pages: `safeFetch<T>(fn, fallback, operationName)` helper in `src/app/admin/finance/page.tsx` pattern
- Auth errors: `AuthProvider` catches `Invalid Refresh Token` / `Refresh Token Not Found` and clears local storage before redirecting
- Supabase client: Smart-fetch wrapper in `src/lib/supabaseClient.ts` disables auth retries after 3 consecutive failures

## Cross-Cutting Concerns

**Logging:** `getLogger(scope)` from `src/lib/logger.ts`. Level controlled by `NEXT_PUBLIC_LOG_LEVEL` env var; defaults to `debug` in dev, `info` in prod.

**Validation:** Zod schemas in `src/types/index.ts`. Used in API route handlers to validate request bodies.

**Authentication:** Client-side via `AuthProvider` + Supabase auth. SSR privileged ops bypass auth by using the service-role key. Admin access token synced to a `samesite=lax` cookie for middleware use.

---

*Architecture analysis: 2026-03-09*
