# Codebase Concerns

**Analysis Date:** 2026-03-09

---

## Security Considerations

**Unauthenticated Admin API Routes:**
- Risk: Multiple API routes that perform sensitive operations (cancel sales, modify inventory, manage consignors) have no authentication check. Any caller can trigger them.
- Files:
  - `src/app/api/sales/cancel/route.ts` - cancels sales and restores inventory, no auth check
  - `src/app/api/consignor-payments/route.ts` - registers payments, no auth check
  - `src/app/api/purchase-orders/route.ts` - creates/reads purchase orders, no auth check
  - `src/app/api/repairs/update-status/route.ts`, `update-notes/route.ts`, `update-details/route.ts` - mutations without auth
  - `src/app/api/settings/labels/route.ts`, `settings/labels/list/route.ts` - label config mutations
- Current mitigation: Supabase RLS may catch some writes if SERVICE_ROLE_KEY is absent, but routes that fall back to anon key bypass RLS for reads and some writes.
- Recommendation: Add a middleware-level auth check (read JWT from cookie or Authorization header, verify against Supabase) for all `/api/` routes that mutate data.

**Debug/Test API Routes Exposed in Production:**
- Risk: Internal debugging endpoints expose environment details and allow destructive one-click operations.
- Files:
  - `src/app/api/debug-env/route.ts` — returns key names + lengths of `SUPABASE_SERVICE_ROLE_KEY` and anon key (partial exposure). No auth.
  - `src/app/api/debug-auth/route.ts` — debug auth state. No auth.
  - `src/app/api/debug/check-sale-structure/route.ts`, `debug/sales-check/route.ts` — raw DB introspection. No auth.
  - `src/app/api/test-payment/route.ts` — hardcoded consignor UUID `6400f9c4-e8ef-4f1a-8fa4-ad93c63161cb`, processes a real payment of $10 against production data. No auth.
  - `src/app/api/test-supabase/route.ts` — connectivity test with DB read. No auth.
- Current mitigation: None.
- Recommendation: Delete or gate these behind `NODE_ENV === 'development'` before any public deployment.

**Hardcoded Production UUIDs in Code:**
- Risk: Two routes hardcode specific production record UUIDs, coupling application code to a specific database state.
- Files:
  - `src/app/api/test-payment/route.ts`: line 8 — consignor ID `6400f9c4-e8ef-4f1a-8fa4-ad93c63161cb`
  - `src/app/api/clean-duplicate/route.ts`: line 10 — consignor ID `f3cf8a91-8ab4-4989-a089-f9d9d9741e88` deleted unconditionally on POST
- Current mitigation: None.
- Recommendation: Remove these files entirely; they are one-off migration scripts that ran and should not exist as live endpoints.

**Auth Token Stored in Insecure Cookie:**
- Risk: The admin access token (a full Supabase JWT) is written to a `samesite=lax` cookie (not `httponly`, not `secure`). Client-side JavaScript can read it directly.
- Files: `src/components/auth/AuthProvider.tsx` lines 21–27, `src/middleware.ts`
- Current mitigation: `samesite=lax` reduces CSRF risk, but XSS still exposes the token.
- Recommendation: Set `httponly; secure` flags on the cookie, or switch to server-side session management.

**Server Client Falls Back to Anon Key When SERVICE_ROLE_KEY Is Missing:**
- Risk: `getSupabaseServerClient()` silently falls back to the anon key in development and when misconfigured, bypassing service-role privileges while appearing to work.
- Files: `src/lib/supabaseServerClient.ts` lines 9–31
- Current mitigation: Logs a warning.
- Recommendation: Throw an error in production when `SUPABASE_SERVICE_ROLE_KEY` is absent instead of silently downgrading.

**QZ Tray Signing Endpoint Has No Auth:**
- Risk: `POST /api/qz/sign` signs arbitrary payloads with the server's private key. Any caller can request a valid QZ Tray signature.
- Files: `src/app/api/qz/sign/route.ts`, `src/lib/qz/signing.ts`
- Current mitigation: None.
- Recommendation: Require a valid authenticated session before signing.

---

## Tech Debt

**Zero Test Coverage:**
- Issue: There are no unit, integration, or e2e test files anywhere in the project (0 `.test.ts` / `.spec.ts` / `.test.tsx` / `.spec.tsx` files found).
- Impact: Every change carries risk of undetected regression. Financial and inventory logic is untested.
- Fix approach: Add Vitest for unit tests starting with `src/lib/services/salesService.ts`, `cashSessionService.ts`, and `financeService.ts` since these handle money.

**Debug and Migration Scripts Left in Production Codebase:**
- Issue: Several API routes are clearly one-off operations (clean-duplicate, correct-inventory, setup-profiles, create-profiles-table, setup-deduplication-table, force-refresh) that should have been removed after use.
- Files:
  - `src/app/api/clean-duplicate/route.ts`
  - `src/app/api/correct-inventory/route.ts`
  - `src/app/api/setup-profiles/route.ts`
  - `src/app/api/create-profiles-table/route.ts`
  - `src/app/api/setup-deduplication-table/route.ts`
  - `src/app/api/force-refresh/route.ts`
  - `src/scripts/debug-sales.ts`
- Impact: Increase attack surface, add noise to codebase, risk being accidentally invoked.
- Fix approach: Delete these files; re-run migrations through Supabase SQL editor if ever needed again.

**Duplicate Label PDF Generators:**
- Issue: Two nearly-parallel implementations exist for label PDF generation with no clear indication of which is canonical.
- Files:
  - `src/lib/printing/labelPdfGenerator.ts` (612 lines)
  - `src/lib/printing/labelPdfGeneratorFixed.ts` (large, uses html2canvas)
- Impact: Diverging logic, maintenance cost doubled, unclear which is used in production paths.
- Fix approach: Determine which is the active implementation (check `src/lib/printing/printRouter.ts`) and delete the other.

**Stale `supabaseClientWithAuth.ts` Abstraction:**
- Issue: `src/lib/supabaseClientWithAuth.ts` wraps `supabaseClient` but adds no real value — `getSupabaseClientWithAuth()` just calls `getSession()` and returns the same client. It also logs auth user IDs at INFO level on every call.
- Impact: Unnecessary indirection, leaks user IDs to logs.
- Fix approach: Replace all callers with direct `supabase` client usage and delete the file.

**`'use client'` and `'use server'` Separation Issues:**
- Issue: `src/lib/supabaseClient.ts` is used both server-side and client-side due to SSR/RSC boundaries. The file contains a `console.log` on module load (`[SupabaseClient] Initializing. isServer: ...`) that fires on every cold start.
- Files: `src/lib/supabaseClient.ts` line 33
- Impact: Performance noise, logs PII-adjacent info (server vs client distinction) in production.
- Fix approach: Remove the initialization log; split client into strict browser-only and server-only modules.

**`graphql` Dependency Listed But No Usage Found:**
- Issue: `graphql ^16.12.0` is in `package.json` but no `.graphql` files or GraphQL client imports are present in `src/`.
- Impact: Adds ~49KB (minified) to the bundle unnecessarily.
- Fix approach: Remove from `package.json`.

**`moment` Dependency Listed But Unused:**
- Issue: `moment ^2.30.1` appears in `package.json` but zero imports of `moment` exist in `src/`.
- Impact: Adds ~72KB gzipped to the bundle unnecessarily. `date-fns` (already used) is the correct replacement.
- Fix approach: Remove from `package.json`.

**`stripe` Dependency Listed But Unused:**
- Issue: `stripe ^20.3.1` is in `package.json` but no Stripe imports appear anywhere in `src/`.
- Impact: Adds weight to server bundle, suggests planned but unimplemented payment integration.
- Fix approach: Remove from `package.json` until Stripe integration is actually built.

**`react-day-picker` Pinned to Old Major:**
- Issue: `react-day-picker` is pinned to `8.10.1` while v9 is current. Version 8 has known accessibility gaps.
- Impact: Missing bug fixes, potential accessibility issues.
- Fix approach: Upgrade to v9 and update usage of the `DayPicker` component.

---

## Known Bugs

**`/tienda/cuenta` Authentication Is Not Implemented:**
- Symptoms: The user account page renders `CuentaDashboard` with no auth gate. Any unauthenticated visitor can see the account shell.
- Files: `src/app/(tienda)/tienda/cuenta/page.tsx` — line 5 has `// TODO: Implementar autenticacion real`
- Trigger: Navigate to `/tienda/cuenta` while unauthenticated.
- Workaround: None.

**`/api/cron/daily-cut` Is Publicly Accessible:**
- Symptoms: The cron endpoint uses a plain `GET` handler with no secret token or auth check. Any party can trigger it, closing open cash sessions and opening new ones in production.
- Files: `src/app/api/cron/daily-cut/route.ts`
- Trigger: `GET /api/cron/daily-cut`
- Workaround: None currently. Fix: validate a `CRON_SECRET` header before processing.

**Auth Redirect State Variable Is Module-Level Singleton:**
- Symptoms: `hasRedirectedToLogin` is declared at module scope in `AuthProvider.tsx`. In React 18 with concurrent mode and SSR, this can prevent legitimate redirects if the flag is set during one render and never reset correctly.
- Files: `src/components/auth/AuthProvider.tsx` line 14
- Trigger: Hard refresh after session expiry may occasionally not redirect to login.
- Workaround: `hasRedirectedToLogin` is reset to `false` when a user signs in, which partially mitigates it.

---

## Performance Bottlenecks

**Overly Large Service Files:**
- Problem: Several service files exceed 800–1,400 lines, loading all functions into the Next.js server bundle even when only a few are used per route.
- Files:
  - `src/lib/services/productService.ts` — 1,488 lines
  - `src/lib/services/crmClientService.ts` — 1,445 lines
  - `src/lib/services/crmService.ts` — 944 lines
  - `src/lib/services/salesService.ts` — 934 lines
  - `src/lib/services/financeService.ts` — 811 lines
- Cause: No code-splitting within service layer; all operations bundled into single files.
- Improvement path: Split into focused sub-modules (e.g., `salesService/create.ts`, `salesService/query.ts`).

**`deapiService.ts` Blocks for Up to 120 Seconds:**
- Problem: `pollRequest()` loops synchronously against the DEAPI polling endpoint for up to 120 seconds, holding the serverless function open.
- Files: `src/lib/services/deapiService.ts` lines 25–50
- Cause: Synchronous polling loop in a serverless context.
- Improvement path: Move to an async job queue (Supabase Edge Function + pg_cron) or use a webhook callback from DEAPI.

**`getSupabaseServerClient()` Creates a New Client on Every Call:**
- Problem: The function at `src/lib/supabaseServerClient.ts` instantiates a new Supabase client on every invocation rather than using a singleton per request.
- Files: `src/lib/supabaseServerClient.ts`
- Cause: No module-level instance cache.
- Improvement path: Memoize the client using a request-scoped cache (e.g., Next.js `cache()`) or a module singleton.

**`correct-inventory` Self-Calls via HTTP Fetch:**
- Problem: The `executeCorrection` action in `src/app/api/correct-inventory/route.ts` makes an HTTP fetch to itself (`/api/correct-inventory?action=analyzeDuplicates`) rather than calling the analysis logic directly. This doubles the cold-start overhead and breaks in environments without `NEXT_PUBLIC_APP_URL` set.
- Files: `src/app/api/correct-inventory/route.ts` line 103
- Cause: Poorly factored code that wasn't refactored before shipping.
- Improvement path: Extract `analyzeDuplicates` logic to a shared function and call it directly.

---

## Fragile Areas

**`salesService.ts` Consignor Balance Calculation:**
- Files: `src/lib/services/salesService.ts` lines 600–630, `src/app/api/sales/cancel/route.ts` lines 144–180
- Why fragile: Consignor balance is updated with `parseFloat(cost || 0)` arithmetic with no database transaction wrapping. A mid-operation failure leaves balance partially updated.
- Safe modification: Wrap balance updates and sale status changes in a Supabase RPC function that runs atomically, or use Postgres transactions via `pg` directly.
- Test coverage: None.

**`AuthProvider` Global Module Variable for Redirect:**
- Files: `src/components/auth/AuthProvider.tsx` line 14 (`let hasRedirectedToLogin = false`)
- Why fragile: Module-level mutable state in a React component module can cause unexpected behavior during HMR, SSR, and concurrent rendering.
- Safe modification: Convert to a `useRef` inside the component.
- Test coverage: None.

**Error Suppression Module Monkey-Patches `console.error`:**
- Files: `src/lib/errorSuppression.ts`
- Why fragile: Replacing `console.error` globally can mask critical errors when `NEXT_PUBLIC_SUPPRESS_DEV_ERRORS=true`. The suppression filter is string-based and may block legitimate error messages that happen to contain keywords like `NetworkError`.
- Safe modification: Use a logging abstraction (already available at `src/lib/logger.ts`) instead of patching `console.error`.
- Test coverage: None.

**`supabase` Client May Be `undefined`:**
- Files: `src/lib/supabaseClient.ts` (exported as `export const supabase = supabaseInstance`)
- Why fragile: `supabase` is typed as `SupabaseClient | undefined`. Many callers in components use `supabase!` (non-null assertion) or do `if (!supabase) return` without proper user feedback. 72 occurrences of `as any` exist across 31 service/component files, many related to typing gaps around the Supabase response.
- Safe modification: Provide a guaranteed-non-null singleton that throws on initialization failure rather than returning `undefined`.
- Test coverage: None.

---

## Scaling Limits

**No Pagination on Inventory/Sales Queries in Several Services:**
- Current capacity: Works for small datasets (< few thousand records).
- Limit: `getExpenses()` and several other service functions call `.select("*")` with no `.limit()`. Large tables will cause timeouts and memory pressure.
- Files:
  - `src/lib/services/financeService.ts` — `getExpenses()` (no limit)
  - `src/lib/services/productService.ts` — several bulk fetch paths
- Scaling path: Add cursor-based pagination and enforce row limits on all list endpoints.

**`correct-inventory` GET Handler Loads All Inventory Logs:**
- Current capacity: Functional up to ~a few thousand logs.
- Limit: `src/app/api/correct-inventory/route.ts` GET handler fetches all products with `stock < 0` and last 100 logs into memory.
- Scaling path: These are one-off debug routes; delete them.

---

## Missing Critical Features

**No Input Validation Layer on API Routes:**
- Problem: API routes accept and process raw JSON bodies with no schema validation (no Zod or similar). Type casts like `const body: CancelSalesRequest = await request.json()` provide TypeScript compile-time types but no runtime guarantees.
- Blocks: Safe external-facing use, prevents malformed data from reaching the database.
- Files: All 43 API routes in `src/app/api/`.

**No CSRF Protection:**
- Problem: The middleware only guards `/tienda-admin` paths. All other API routes (including mutation routes) have no CSRF token check. The auth cookie is `samesite=lax` which mitigates top-level navigation CSRF but not same-origin sub-resource requests.
- Files: `src/middleware.ts`

---

## Test Coverage Gaps

**Financial Services — Zero Coverage:**
- What's not tested: Cash session open/close, expense recording, account balance mutations, income registration.
- Files: `src/lib/services/cashSessionService.ts`, `src/lib/services/financeService.ts`, `src/lib/services/incomeService.ts`, `src/lib/services/accountService.ts`
- Risk: Incorrect balance calculations or session state bugs go undetected until production.
- Priority: High

**Sale Creation and Cancellation — Zero Coverage:**
- What's not tested: Full `createSale` flow including inventory decrement, consignor balance update, and Kardex registration. Sale cancellation and stock restoration.
- Files: `src/lib/services/salesService.ts`, `src/app/api/sales/cancel/route.ts`
- Risk: Race conditions and partial failures in multi-step sale operations.
- Priority: High

**Authentication Flows — Zero Coverage:**
- What's not tested: Login redirect logic, session sync, cookie writing, role resolution.
- Files: `src/components/auth/AuthProvider.tsx`, `src/middleware.ts`
- Risk: Auth bugs only discovered by manual browser testing.
- Priority: Medium

---

*Concerns audit: 2026-03-09*
