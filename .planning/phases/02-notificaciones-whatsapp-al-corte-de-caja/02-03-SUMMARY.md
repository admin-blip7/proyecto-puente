---
phase: 02-notificaciones-whatsapp-al-corte-de-caja
plan: 03
subsystem: api
tags: [whatsapp, callmebot, next.js, supabase, notifications]

# Dependency graph
requires:
  - phase: 02-01
    provides: whatsapp_number and whatsapp_apikey columns on branches table, whatsapp_notification_log table
  - phase: 02-02
    provides: buildCorteMessage() pure function in whatsappNotificationService.ts

provides:
  - POST /api/whatsapp/corte endpoint that fetches credentials, builds message, sends via Callmebot, and logs result

affects:
  - 02-04 (POSClient fire-and-forget integration — consumes this route)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-side credential fetch: whatsapp_apikey read from DB in API route, never in client bundle"
    - "Callmebot plain GET fetch with encodeURIComponent text encoding"
    - "All error branches return HTTP 200 with { ok: false } — never 500"
    - "Notification logging for both success and failure outcomes"

key-files:
  created:
    - src/app/api/whatsapp/corte/route.ts
  modified: []

key-decisions:
  - "Callmebot used via plain GET fetch (no npm package) — user's locked decision from research phase"
  - "No_number case (branch not configured) returns HTTP 200 + ok:false without logging — expected state, not an error"
  - "error_msg stored as Callmebot response body text on failure for debuggability"
  - "error type annotation changed from any to unknown with instanceof guard — stricter TypeScript per project standards"

patterns-established:
  - "WhatsApp API route: validate body → fetch credentials server-side → build message → call Callmebot → log result → return ok"
  - "Pre-existing unrelated TS errors (ProductDetailModern.tsx) logged to deferred-items, not fixed — out-of-scope per deviation rules"

requirements-completed: [REQ-009, REQ-013, REQ-014]

# Metrics
duration: 3min
completed: 2026-03-09
---

# Phase 2 Plan 3: WhatsApp Corte Notification API Route Summary

**POST /api/whatsapp/corte route using Callmebot plain GET fetch with server-side credential isolation and dual-state notification logging**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-09T18:13:42Z
- **Completed:** 2026-03-09T18:16:30Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created `src/app/api/whatsapp/corte/route.ts` — the server-side integration point between POS cash close and WhatsApp
- Credentials (`whatsapp_apikey`) read from Supabase `branches` table in the API route and never exposed to the client bundle
- Callmebot plain GET fetch with `encodeURIComponent` text encoding — exactly per user locked decision (no Twilio, no npm package)
- All error paths return HTTP 200 with `{ ok: false }` — route never throws 500
- Both `sent` and `failed` outcomes logged to `whatsapp_notification_log` for audit trail

## Task Commits

Each task was committed atomically:

1. **Task 1: Create POST /api/whatsapp/corte route** - `a85556d` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `src/app/api/whatsapp/corte/route.ts` - POST handler: validates body, fetches branch credentials, builds message via buildCorteMessage(), calls Callmebot GET, inserts log row, returns { ok }

## Decisions Made
- Used `error: unknown` with `instanceof Error` guard instead of `error: any` — stricter TypeScript, no behavior change
- `no_number` case skips logging intentionally — it's an expected configuration state, not a notification failure
- Callmebot `res.ok` (HTTP 200) is primary success indicator per plan spec; body is captured for error_msg on failure

## Deviations from Plan

None - plan executed exactly as written. The `error: any` was changed to `error: unknown` for TypeScript strictness (minor quality improvement, same behavior).

## Issues Encountered

Pre-existing TypeScript errors in `src/components/products/ProductDetailModern.tsx` (25 parse errors — JSX structure issues) found during `tsc --noEmit` verification. These are entirely unrelated to this plan's changes and pre-date it. Logged to deferred-items per out-of-scope scope boundary rule. Zero errors in the new route or its direct imports.

## User Setup Required

None - no external service configuration required beyond what was already specified in plan 02-01 (whatsapp_number and whatsapp_apikey must be populated in the branches table and Callmebot activation done per branch owner).

## Next Phase Readiness
- `POST /api/whatsapp/corte` is ready to receive fire-and-forget POST requests from POSClient (plan 02-04)
- Route handles all edge cases: missing config, session not found, Callmebot failures
- All outcomes logged — ready for audit/monitoring use

---
*Phase: 02-notificaciones-whatsapp-al-corte-de-caja*
*Completed: 2026-03-09*
