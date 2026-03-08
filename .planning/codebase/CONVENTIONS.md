# Coding Conventions

**Analysis Date:** 2026-03-09

## Naming Patterns

**Files:**
- React components: PascalCase, e.g., `CheckoutDialog.tsx`, `InventoryClient.tsx`
- Service modules: camelCase suffix `Service`, e.g., `salesService.ts`, `productService.ts`
- Hooks: camelCase with `use` prefix, e.g., `useControlledInput.ts`, `useDebouncedValue.ts`
- API routes: directory-per-resource with `route.ts`, e.g., `src/app/api/sales/route.ts`
- Utility files: camelCase, e.g., `utils.ts`, `tiendaPricing.ts`
- Constant files: camelCase, e.g., `repair-constants.ts` (kebab-case also observed for sub-files)

**Functions:**
- Exported service functions: camelCase verbs, e.g., `getProducts`, `addSale`, `updateProductStockWithKardex`
- React component event handlers: `handle` prefix, e.g., `handleProductsDeleted`, `handleOpenEditPage`
- Private helper functions inside modules: camelCase verbs, e.g., `buildDeliveryWhatsappUrlForSale`, `assignSaleToSingleDriverRoute`
- Boolean helpers: `is`/`has`/`should` prefix, e.g., `isPublicPath`, `isComposing`, `shouldLog`

**Variables:**
- camelCase throughout: `cartItems`, `totalAmount`, `userProfile`
- Constants at module scope: SCREAMING_SNAKE_CASE, e.g., `SALES_TABLE`, `PRODUCTS_TABLE`, `OPTIMIZED_IMAGE_WIDTH`
- Destructured Supabase table names stored as constants at top of each service file

**Types / Interfaces:**
- Interfaces: PascalCase, e.g., `Product`, `Sale`, `CartItem`, `AuthContextType`
- Props interfaces: PascalCase + `Props` suffix, e.g., `CheckoutDialogProps`, `InventoryClientProps`
- Type aliases: PascalCase, e.g., `SaleStatus`, `LogLevel`, `OwnershipType`
- Zod schemas: camelCase + `Schema` suffix, e.g., `formSchema`

## Code Style

**Formatting:**
- No Prettier config detected — formatting is ad-hoc / editor-driven
- Indentation: 2 spaces (services) or 4 spaces (pages/components) — inconsistent across files
- Trailing commas: used in most files
- Single quotes in CSS/config; double quotes in JSX and TypeScript

**Linting:**
- ESLint with `next/core-web-vitals` preset (`.eslintrc.json`)
- No custom rules beyond the preset
- TypeScript strict mode enabled (`"strict": true` in `tsconfig.json`)

## Import Organization

**Order (observed pattern):**
1. Next.js built-ins (`next/navigation`, `next/server`)
2. React imports
3. External library imports (Supabase, zod, uuid, lucide-react)
4. Internal `@/` path-aliased imports — types, services, hooks, utils
5. Relative imports (sibling/child components, sub-components)

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in `tsconfig.json`)
- Used consistently throughout: `@/types`, `@/lib/services/...`, `@/components/...`, `@/hooks/...`

**Example:**
```typescript
import { useState, useCallback } from "react";
import { CartItem, Sale } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { getLogger } from "@/lib/logger";
import { CustomerSection } from "./checkout/CustomerSection";
```

## React / Next.js Directives

**Server vs. Client boundary:**
- Server components: no directive (default in App Router) — used for data-fetching pages
- Client components: `"use client"` at top of file — all interactive components
- Server actions / services: `"use server"` at top of file — all `src/lib/services/*.ts` files
- API routes: no directive, export named `GET`/`POST`/`PUT`/`DELETE` functions

**Data fetching in pages:**
- Server page components call service functions directly with `await`
- Multiple concurrent fetches use `Promise.all`, e.g.:
  ```typescript
  const [consignors, allProducts] = await Promise.all([
    getConsignors(),
    getProducts()
  ]);
  ```

## Error Handling

**Service layer pattern:**
- Try/catch wrapping all Supabase calls
- On Supabase error: log with scoped logger, then throw `new Error(message)` or return null/empty array
- Non-critical sub-operations (kardex, CRM interaction) are caught silently with `log.warn` to prevent cascading failures
- Example:
  ```typescript
  try {
    await registerKardexMovement({...});
  } catch (kardexError) {
    log.warn("Could not register kardex movement", { productId, kardexError });
  }
  ```

**API route pattern:**
- Top-level try/catch in every route handler
- Returns `NextResponse.json({ error: '...' }, { status: 4xx/5xx })` on failure
- Returns `NextResponse.json(data)` on success
- Input validation before service call, returns 400 on missing fields

**Component layer pattern:**
- Uses `useToast()` to show user-facing errors
- Async handlers wrapped in try/catch with `setLoading(false)` in finally
- Critical errors thrown to `ErrorBoundary` (`src/components/shared/ErrorBoundary.tsx`)

## Logging

**Framework:** Custom scoped logger at `src/lib/logger.ts`

**Usage:**
```typescript
const log = getLogger("moduleName"); // one per module/service/component
log.debug("...");
log.info("...");
log.warn("...", { context });
log.error("...", error); // always logs regardless of level
```

**Level control:**
- `NEXT_PUBLIC_LOG_LEVEL` env var controls minimum level
- Development: `debug` by default; Production: `info` by default
- Errors always logged (bypasses level filter)

**Scope naming:** matches the file/module name, e.g., `getLogger("salesService")`, `getLogger("AuthProvider")`

## Comments

**When to Comment:**
- JSDoc-style comments (`/** ... */`) on exported utility functions and hooks
- Inline comments to explain non-obvious logic, especially Supabase query decisions and business rule workarounds
- Section comments in long files to group related operations: `// Sub-components`, `// Public paths that don't require authentication`
- Spanish comments are common for business logic; English for technical implementation notes

**JSDoc:**
- Used selectively on hooks and utility functions, not on React components

## Form Validation

**Pattern:** `react-hook-form` + `zodResolver` + `zod` schema
```typescript
const formSchema = z.object({
  customerName: z.string().min(1, "El nombre del cliente es requerido."),
  customerPhone: z.string().min(1, "El teléfono es requerido."),
  deviceModel: z.string().optional(),
});

const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
  defaultValues: { customerName: "" },
});
```
- Form schemas defined at module top level, not inline
- Validation messages written in Spanish

## Function Design

**Size:** Services tend toward large functions (300–900 LOC files common); component files can reach 1000+ LOC
**Parameters:** Object destructuring preferred for multi-param functions; typed inline interfaces used for complex param shapes
**Return Values:** Async functions return typed Promises; errors propagated by throw or returned as `null`

## Module Design

**Exports:**
- Services: named exports only — all functions exported individually
- Components: default export for the component, named exports for sub-types or utilities
- Types: named exports from `src/types/index.ts`

**Barrel Files:**
- `src/types/index.ts` is the central type barrel
- No component barrel files — imports use full paths to files

## Currency / Financial Utilities

**Pattern:** Always use `formatCurrency` from `src/lib/utils.ts` for display
- Underlying validation via `src/lib/validation/currencyValidation.ts` (`validateMXNAmount`, `normalizeMXNAmount`)
- Never use raw `.toFixed(2)` in UI — route through `formatCurrency`
- `Number(value || 0).toFixed(2)` used in template strings (WhatsApp messages, etc.) as an exception

---

*Convention analysis: 2026-03-09*
