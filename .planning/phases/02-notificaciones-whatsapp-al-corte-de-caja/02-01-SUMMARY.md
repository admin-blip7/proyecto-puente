---
phase: 02-notificaciones-whatsapp-al-corte-de-caja
plan: 01
subsystem: database
tags: [supabase, postgres, migrations, whatsapp, callmebot]

# Dependency graph
requires: []
provides:
  - "whatsapp_number and whatsapp_apikey columns on public.branches (nullable TEXT)"
  - "public.whatsapp_notification_log table with branch_id FK, session_id, phone_to, status, error_msg, sent_at"
  - "idx_whatsapp_log_branch_id index for efficient branch queries"
affects:
  - 02-notificaciones-whatsapp-al-corte-de-caja

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Nullable columns for optional integrations — NULL = feature disabled for that branch"
    - "session_id stored as plain UUID without FK — preserve log when sessions are archived/deleted"

key-files:
  created:
    - supabase/migrations/20260310000000_add_whatsapp_to_branches.sql
    - supabase/migrations/20260310000001_create_whatsapp_notification_log.sql
  modified: []

key-decisions:
  - "Both whatsapp_number and whatsapp_apikey are nullable TEXT — branch with NULL simply skips notifications silently"
  - "whatsapp_apikey server-side only — never exposed in client-side queries (security)"
  - "session_id in notification log has no FK constraint — ensures log survives cash session archival/deletion"
  - "vitest.config.ts was pre-existing (uses vite-tsconfig-paths plugin) — left unchanged per plan instructions"

patterns-established:
  - "Pattern 1: All WhatsApp config lives on branches table — single source of truth per branch"
  - "Pattern 2: Notification logs reference branches via CASCADE delete but NOT cash sessions"

requirements-completed: [REQ-008, REQ-014]

# Metrics
duration: 2min
completed: 2026-03-09
---

# Phase 02 Plan 01: WhatsApp Schema Migrations Summary

**Two Supabase migrations adding Callmebot WhatsApp fields to branches table and creating notification log table with branch FK and performance index**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-09T17:50:57Z
- **Completed:** 2026-03-09T17:53:20Z
- **Tasks:** 3 (2 files created, 1 pre-existing file left unchanged)
- **Files modified:** 2

## Accomplishments
- Migration `20260310000000_add_whatsapp_to_branches.sql`: adds `whatsapp_number` and `whatsapp_apikey` nullable TEXT columns to `public.branches` — satisfies REQ-008
- Migration `20260310000001_create_whatsapp_notification_log.sql`: creates `public.whatsapp_notification_log` table with branch FK (CASCADE), session_id (no FK), and `idx_whatsapp_log_branch_id` index — satisfies REQ-014
- Confirmed vitest.config.ts already present at project root (uses `vite-tsconfig-paths`) — left unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration — add whatsapp_number and whatsapp_apikey to branches** - `00f7458` (chore)
2. **Task 2: Migration — create whatsapp_notification_log table** - `f3af7c3` (chore)
3. **Task 3: Ensure vitest.config.ts exists** - no commit (file was pre-existing, no changes made)

**Plan metadata:** (docs commit pending)

## Files Created/Modified
- `supabase/migrations/20260310000000_add_whatsapp_to_branches.sql` - ALTER TABLE branches to add whatsapp_number and whatsapp_apikey columns
- `supabase/migrations/20260310000001_create_whatsapp_notification_log.sql` - CREATE TABLE whatsapp_notification_log with FK to branches and branch_id index

## Decisions Made
- Both columns nullable: a branch with no WhatsApp configured simply has NULL — notifications are silently skipped rather than erroring
- `whatsapp_apikey` must only be read server-side — never included in client-facing Supabase queries
- `session_id` in the log table is intentionally un-constrained: cash sessions may be archived or deleted, and the notification log should persist for audit purposes
- Pre-existing `vitest.config.ts` already handles `@/` path aliases via `vite-tsconfig-paths` plugin — no overwrite needed

## Deviations from Plan

None - plan executed exactly as written. The only discovery was that vitest.config.ts already existed (different from the template in the plan but functionally equivalent), which the plan explicitly handles with "leave it unchanged."

## Issues Encountered
None.

## User Setup Required
After merging this branch, apply migrations to Supabase:
```
npx supabase db push
```
or
```
npx supabase migration up
```

## Next Phase Readiness
- DB schema is ready for Plan 02-02: WhatsApp notification service + settings UI that persists `whatsapp_number` per branch
- Both columns exist on `branches` — settings form will not get a DB column-not-found error
- Notification log table ready for Plan 02-03: API route that inserts a row after sending each Callmebot notification

---
*Phase: 02-notificaciones-whatsapp-al-corte-de-caja*
*Completed: 2026-03-09*

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| supabase/migrations/20260310000000_add_whatsapp_to_branches.sql | FOUND |
| supabase/migrations/20260310000001_create_whatsapp_notification_log.sql | FOUND |
| vitest.config.ts | FOUND |
| .planning/phases/02-notificaciones-whatsapp-al-corte-de-caja/02-01-SUMMARY.md | FOUND |
| Commit 00f7458 | FOUND |
| Commit f3af7c3 | FOUND |
