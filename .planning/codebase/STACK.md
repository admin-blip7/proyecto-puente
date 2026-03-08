# Technology Stack

**Analysis Date:** 2026-03-09

## Languages

**Primary:**
- TypeScript 5.x - All application code in `src/`
- SQL - Supabase migrations in `supabase/migrations/`

**Secondary:**
- JavaScript - Scripts in `scripts/` and root-level utility files (`.mjs`, `.js`)
- CSS - Global styles in `src/app/globals.css`

## Runtime

**Environment:**
- Node.js >= 18.0.0 (`.nvmrc` pins to 20; production uses Node 20 via Netlify)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js ^16.1.1 - Full-stack React framework with App Router, Server Actions, and API Routes
  - Config: `next.config.ts`
  - Entry: `src/app/layout.tsx`
  - Runs in webpack mode (not Turbopack) in development on port 9003

**UI / Component Layer:**
- React 18.2.0 - UI rendering
- Radix UI (suite of `@radix-ui/react-*` primitives) - Accessible UI components
- Tailwind CSS ^3.4.1 - Utility-first styling
  - Config: `tailwind.config.ts`
  - Dark mode: class-based
- `tailwindcss-animate` ^1.0.7 - Animation utilities
- `class-variance-authority` ^0.7.1 + `clsx` ^2.1.1 + `tailwind-merge` ^3.0.1 - CVA pattern for component variants
- `next-themes` ^0.4.6 - Theme switching
- `framer-motion` ^12.26.2 - Animations
- `lucide-react` ^0.475.0 - Icon library
- `cmdk` ^1.0.0 - Command palette
- `embla-carousel-react` ^8.6.0 - Carousel
- `react-dnd` + `react-dnd-html5-backend` ^16.0.1 - Drag-and-drop
- `react-day-picker` 8.10.1 - Date picker

**Forms / Validation:**
- `react-hook-form` ^7.54.2 - Form state management
- `@hookform/resolvers` ^4.1.3 - Schema resolvers
- `zod` ^3.24.2 - Schema validation

**Data / Charts:**
- `recharts` ^2.15.1 - Data visualization charts

**Date Utilities:**
- `date-fns` ^3.6.0
- `moment` ^2.30.1

**Testing:**
- Not detected (no jest/vitest config found)

**Build/Dev:**
- TypeScript ^5 - Type checking (`tsconfig.json`)
- ESLint ^9.36.0 + `eslint-config-next` ^15.5.3 - Linting
- PostCSS ^8 - CSS processing (`postcss.config.mjs`)
- `rimraf` ^5.0.7 - Cross-platform clean
- `sharp` ^0.34.5 - Server-side image processing (used in API routes for resizing)
- `tsx` - TypeScript script execution (used in `npm run images:backfill`)

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` ^2.45.0 - Primary data layer and auth
- `supabase` ^2.58.5 (devDep) - Supabase CLI for migrations
- `next` ^16.1.1 - Framework
- `zod` ^3.24.2 - Runtime type safety throughout API routes and services

**PDF / Document Generation:**
- `jspdf` ^2.5.2 + `jspdf-autotable` ^3.8.4 - PDF generation (cash close reports, labels)
- `@libpdf/core` ^0.2.5 - Additional PDF utilities
- `html2canvas` ^1.4.1 - Screenshot-to-canvas for PDF embedding

**Barcodes / QR:**
- `jsbarcode` ^3.11.6 - Barcode rendering
- `qrcode` ^1.5.4 + `react-qrcode-logo` ^3.0.0 - QR code generation
- `@zxing/browser` ^0.1.5 + `@zxing/library` ^0.21.3 - Barcode scanning via camera

**Printing:**
- `qz-tray` ^2.2.5 - Thermal/label printer integration (requires QZ Tray desktop app)

**Export / Import:**
- `xlsx` ^0.18.5 - Excel file generation
- `stream-json` ^1.9.1 - JSON streaming for large data

**Payments:**
- `stripe` ^20.3.1 - Stripe SDK (installed but no active usage found in `src/`)

**Database Direct (Scripts):**
- `pg` ^8.16.3 - Direct PostgreSQL connection (used in migration scripts only)

**Infrastructure:**
- `uuid` ^9.0.1 - UUID generation
- `dotenv` ^16.6.1 - Environment variable loading (scripts)
- `patch-package` ^8.0.0 - Patch npm packages post-install
- `graphql` ^16.12.0 - GraphQL (Supabase exposes `graphql_public` schema; not used directly in app code)

## Configuration

**Environment:**
- `.env.local` file present - primary local config
- `.env.local.backup` present
- Critical vars required:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `BACKGROUNDERASE_API_KEY`
  - `PHOTOROOM_API_KEY`
  - `REMOVE_BG_API_KEY`
  - `GOOGLE_CSE_API_KEY`
  - `GOOGLE_CSE_CX`
  - `QZ_CERT_PEM` / `QZ_CERTIFICATE_PEM`
  - `QZ_PRIVATE_KEY_PEM` / `QZ_PRIVATE_KEY`
  - `QZ_PRIVATE_KEY_PASSPHRASE` (optional)
  - `OPENAI_API_KEY` (Supabase Studio AI only)

**Build:**
- `next.config.ts` - Next.js config
  - `typescript.ignoreBuildErrors: true` - TypeScript errors don't block production build
  - `distDir`: `.next-dev` in development, `.next` in production
  - `compiler.removeConsole` strips all non-error console logs in production
  - Webpack HMR polling at 500ms in dev
- `tailwind.config.ts` - Tailwind config
- `tsconfig.json` - TypeScript config
  - Path alias: `@/*` → `./src/*`
  - Target: ES2017
  - `strict: true`

## Platform Requirements

**Development:**
- Node.js >= 18.0.0 (recommended: 20.x per `.nvmrc`)
- npm
- Supabase project credentials in `.env.local`
- Optional: QZ Tray desktop app for label/receipt printing

**Production:**
- Deployment target: Netlify (see `netlify.toml`)
- Node.js 20 (set in `[build.environment]`)
- Plugin: `@netlify/plugin-nextjs`
- Supabase project: `aaftjwktzpnyjwklroww.supabase.co`

---

*Stack analysis: 2026-03-09*
