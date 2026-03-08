# External Integrations

**Analysis Date:** 2026-03-09

## APIs & External Services

**Background Removal (Image Processing):**
- **PhotoRoom** - Primary background removal for product images
  - SDK/Client: Direct REST fetch in `src/lib/services/photoroomService.ts`
  - Endpoints: `https://sdk.photoroom.com/v1/segment`, `https://image-api.photoroom.com/v2/account`
  - Auth: `PHOTOROOM_API_KEY` env var
- **remove.bg** - Alternative background removal
  - SDK/Client: Direct REST fetch in `src/lib/services/removeBgService.ts`
  - Endpoint: `https://api.remove.bg/v1.0/removebg`
  - Auth: `REMOVE_BG_API_KEY` env var
- **BackgroundErase** - Second alternative background removal
  - SDK/Client: Direct REST fetch in `src/lib/services/backgroundEraseService.ts`
  - Endpoint: `https://api.backgrounderase.com/v2`
  - Auth: `BACKGROUNDERASE_API_KEY` env var

**Image Search:**
- **Google Custom Search Engine (CSE)** - Product image search
  - SDK/Client: Direct REST fetch in `src/lib/services/googleImageSearch.ts`
  - Endpoint: `https://www.googleapis.com/customsearch/v1`
  - Auth: `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_CX` env vars

**Payment Processing:**
- **Stripe** - Payment processing
  - SDK/Client: `stripe` ^20.3.1 package installed
  - Auth: Stripe keys (not explicitly found in active source - likely configured for future use or in API routes under `src/app/api/`)
  - Note: Package is installed but no direct usage found in current source files

**Printing:**
- **QZ Tray** - Thermal/label printer bridge (desktop application)
  - SDK/Client: `qz-tray` ^2.2.5 in `src/lib/printing/qzTrayClient.ts`
  - Signing API: `src/app/api/qz/sign/route.ts` (RSA-SHA256 signing)
  - Certificate API: `src/app/api/qz/certificate/route.ts`
  - Auth: `QZ_CERT_PEM`, `QZ_PRIVATE_KEY_PEM`, `QZ_PRIVATE_KEY_PASSPHRASE` env vars
  - Signing implementation: `src/lib/qz/signing.ts`

## Data Storage

**Databases:**
- **Supabase (PostgreSQL)** - Primary database and backend
  - Project ID: `aaftjwktzpnyjwklroww`
  - Host: `aaftjwktzpnyjwklroww.supabase.co`
  - Connection (client): `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Connection (server): `SUPABASE_SERVICE_ROLE_KEY`
  - Client (browser): `src/lib/supabaseClient.ts` - custom fetch wrapper with timeout/retry logic
  - Client (server): `src/lib/supabaseServerClient.ts` - service role client
  - ORM/Client: `@supabase/supabase-js` ^2.45.0
  - Migrations: `supabase/migrations/` (20+ migration files, PostgreSQL 17)
  - Config: `supabase/config.toml`
  - Realtime: enabled (Supabase Realtime feature)
  - GraphQL: exposed via `graphql_public` schema (not used directly in app)
  - RPC: custom PostgreSQL functions called via `supabase.rpc()` (e.g., `update_cash_session_totals_by_session`)

**File Storage:**
- **Supabase Storage** - Product images and documents
  - Configured via `scripts/configure-supabase-storage.mjs`
  - Next.js image optimization allows `*.supabase.co` hostnames
  - Also whitelisted: `depinprod.s3.pl-waw.scw.cloud` (Scaleway S3-compatible bucket)

**Caching:**
- None (no Redis or in-memory cache layer detected)
- Next.js `fetch` cache used selectively (`next: { revalidate: 300 }` in image search)

## Authentication & Identity

**Auth Provider:**
- **Supabase Auth** - Primary authentication
  - Implementation: Email/password + session management
  - Session storage: `localStorage` via custom adapter in `src/lib/supabaseClient.ts`
  - Provider: `src/components/auth/AuthProvider.tsx`
  - Roles supported: `Admin`, `Cajero`, `Cliente`, `Socio`
  - Role source: `user.user_metadata.role` or `user.app_metadata.role`
  - Cookie: `tienda_admin_access_token` (JWT) synced for middleware auth on `/tienda-admin/*`
  - Middleware: `src/middleware.ts` validates JWT against Supabase `/auth/v1/user` endpoint
  - Auth resilience: automatic circuit-breaker disables auth refreshes after 3 consecutive failures

## Monitoring & Observability

**Error Tracking:**
- Not detected (no Sentry, Datadog, etc.)

**Logs:**
- Custom logger in `src/lib/logger.ts` (`getLogger(namespace)`)
- Console suppression in production via `compiler.removeConsole` (keeps errors)
- Error suppression utility: `src/lib/errorSuppression.ts`

## CI/CD & Deployment

**Hosting:**
- **Netlify** - Production deployment
  - Config: `netlify.toml`
  - Build command: `npm run build` (which runs `rimraf .next && next build`)
  - Publish dir: `.next`
  - Plugin: `@netlify/plugin-nextjs`
  - Node: 20

**CI Pipeline:**
- Not detected (no GitHub Actions, CircleCI, etc.)

## Scheduled Jobs

**Cron:**
- `src/app/api/cron/daily-cut/` - Daily cash cut job (likely called by external cron or Netlify Scheduled Functions)

## Webhooks & Callbacks

**Incoming:**
- `POST /api/sales` - Process POS sales transactions
- `POST /api/qz/sign` - Sign QZ Tray print requests
- `GET /api/qz/certificate` - Serve QZ Tray certificate
- `POST /api/repairs/*` - Repair management endpoints
- `POST /api/purchase-orders/*` - Purchase order endpoints
- `POST/GET /api/consignors/*` - Consignor management
- `/api/crm/*` - CRM client endpoints
- `/api/cron/daily-cut` - Scheduled daily cash cut
- Many additional resource endpoints under `src/app/api/`

**Outgoing:**
- Google Custom Search API (`googleapis.com/customsearch/v1`)
- PhotoRoom API (`sdk.photoroom.com`, `image-api.photoroom.com`)
- remove.bg API (`api.remove.bg`)
- BackgroundErase API (`api.backgrounderase.com`)
- Supabase API (all data operations)

## Environment Configuration

**Required env vars:**
```
NEXT_PUBLIC_SUPABASE_URL       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY      # Supabase service role (server-only)
BACKGROUNDERASE_API_KEY        # Background removal (BackgroundErase)
PHOTOROOM_API_KEY               # Background removal (PhotoRoom)
REMOVE_BG_API_KEY               # Background removal (remove.bg)
GOOGLE_CSE_API_KEY              # Google Custom Search
GOOGLE_CSE_CX                   # Google Custom Search Engine ID
QZ_CERT_PEM                     # QZ Tray TLS certificate (or QZ_CERTIFICATE_PEM)
QZ_PRIVATE_KEY_PEM              # QZ Tray private key (or QZ_PRIVATE_KEY)
QZ_PRIVATE_KEY_PASSPHRASE       # QZ Tray key passphrase (optional)
OPENAI_API_KEY                  # Supabase Studio AI only (not used in app)
```

**Secrets location:**
- `.env.local` for local development (gitignored)
- Netlify environment variables for production (also hardcoded in `netlify.toml` build section — security concern)

---

*Integration audit: 2026-03-09*
