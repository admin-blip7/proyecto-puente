# Testing Patterns

**Analysis Date:** 2026-03-09

## Test Framework

**Runner:**
- None detected. No `jest.config.*`, `vitest.config.*`, or equivalent found in the project root.
- No test runner dependency in `package.json` (no `jest`, `vitest`, `@testing-library/*`, `mocha`, `playwright`, `cypress`).

**Assertion Library:**
- None installed.

**Run Commands:**
```bash
npm run lint        # ESLint only — no test script configured
npm run typecheck   # tsc --noEmit — type checking only
```

## Test File Organization

**Location:**
- No test files exist. No `*.test.*` or `*.spec.*` files found anywhere in the repository.

**Naming:**
- Not applicable — no established pattern.

**Structure:**
- Not applicable.

## Test Structure

**Suite Organization:**
- No test suites exist in the codebase.

**Patterns:**
- None established.

## Mocking

**Framework:** None
**Patterns:** None established.

## Fixtures and Factories

**Test Data:** None established.
**Location:** None.

## Coverage

**Requirements:** None enforced — no coverage threshold configured.

**View Coverage:**
```bash
# No coverage command available
```

## Test Types

**Unit Tests:**
- Not implemented. Service functions in `src/lib/services/` contain pure business logic that would be suitable for unit testing but have no tests.

**Integration Tests:**
- Not implemented. API routes in `src/app/api/` and Supabase interactions are untested.

**E2E Tests:**
- Not implemented. No Playwright, Cypress, or similar framework installed.

## Quality Verification Substitutes

Since no automated tests exist, the project relies on:

1. **TypeScript strict mode** (`"strict": true` in `tsconfig.json`) — catches type errors at compile time via `npm run typecheck`
2. **ESLint** (`next/core-web-vitals`) — catches common React/Next.js anti-patterns via `npm run lint`
3. **Manual testing** — inferred from diagnostic pages at `src/app/admin/diagnostico/` and test scripts at `test-pdf-generation.js`, `test-print-functionality.js`, `test-buscador.html`
4. **Supabase RPC validation** — business logic partially enforced at the database layer (e.g., `collect_repair_profit` RPC)

## Recommended Test Placement (If Tests Are Added)

Based on the project structure, the following conventions would fit if testing is introduced:

**Co-located unit tests:**
```
src/lib/services/salesService.ts
src/lib/services/salesService.test.ts  ← place here

src/lib/validation/currencyValidation.ts
src/lib/validation/currencyValidation.test.ts  ← place here
```

**Shared test utilities:**
```
src/__tests__/          ← integration and cross-cutting tests
src/__tests__/helpers/  ← shared fixtures and mocks
```

**Highest-value targets for first tests:**
- `src/lib/validation/currencyValidation.ts` — pure functions, no side effects, critical to financial correctness
- `src/lib/utils.ts` — `formatCurrency`, `cn`, status variant helpers
- `src/lib/tiendaPricing.ts` — pricing calculation logic
- `src/lib/utils/cashCalculations.ts` — financial calculations

## Vitest Setup Recommendation (If Adding Tests)

Given the Next.js + TypeScript stack, Vitest is the natural fit:

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

---

*Testing analysis: 2026-03-09*
