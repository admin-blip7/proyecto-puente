---
phase: 2
slug: notificaciones-whatsapp-al-corte-de-caja
status: draft
nyquist_compliant: true
created: 2026-03-10
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (already in project via Next.js) |
| **Config file** | vitest.config.ts — Plan 01 Task 3 creates it if missing |
| **Quick run command** | `npx vitest run --reporter=verbose src/lib/services/__tests__/whatsappNotificationService.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01 Task 1 | 01 | 1 | REQ-008 | migration file check | `test -f supabase/migrations/20260310000000_add_whatsapp_to_branches.sql && echo OK` | created by task | ⬜ pending |
| 02-01 Task 2 | 01 | 1 | REQ-014 | migration file check | `test -f supabase/migrations/20260310000001_create_whatsapp_notification_log.sql && echo OK` | created by task | ⬜ pending |
| 02-01 Task 3 | 01 | 1 | infra | vitest config check | `test -f vitest.config.ts && echo OK` | created by task if missing | ⬜ pending |
| 02-02 Task 1 | 02 | 1 | REQ-009, REQ-011 | unit | `npx vitest run src/lib/services/__tests__/whatsappNotificationService.test.ts` | created by task | ⬜ pending |
| 02-03 Task 1 | 03 | 2 | REQ-010, REQ-013 | file + tsc | `test -f src/app/api/whatsapp/corte/route.ts && npx tsc --noEmit && echo OK` | created by task | ⬜ pending |
| 02-04 Task 1 | 04 | 2 | REQ-008, REQ-012 | file check | `test -f src/components/admin/settings/NotificacionesSettingsClient.tsx && echo OK` | created by task | ⬜ pending |
| 02-04 Task 2 | 04 | 2 | REQ-008, REQ-012 | grep + tsc | `grep -q "notificaciones" src/app/admin/settings/page.tsx && npx tsc --noEmit && echo OK` | already exists | ⬜ pending |
| 02-05 Task 1 | 05 | 3 | REQ-010, REQ-013 | grep + tsc | `grep -q "api/whatsapp/corte" src/components/pos/POSClient.tsx && npx tsc --noEmit && echo OK` | already exists | ⬜ pending |
| 02-06 Task 1 | 06 | 3 | REQ-014 | grep + tsc | `grep -q "whatsapp_notification_log" src/app/socio/dashboard/page.tsx && npx tsc --noEmit && echo OK` | already exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Pre-Execution Setup

- [ ] `src/lib/services/__tests__/whatsappNotificationService.test.ts` — stubs for REQ-009, REQ-011 (Plan 02 Task 1 creates this)
- [ ] `vitest.config.ts` — Plan 01 Task 3 creates a minimal config if not present (check first: `test -f vitest.config.ts`)

*No npm installs needed. Callmebot uses plain fetch — zero new dependencies.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| WhatsApp message received on real phone | REQ-009, REQ-010 | Requires Callmebot activation + real phone | 1) Complete Callmebot activation, 2) Configure number + apikey in settings, 3) Perform corte, 4) Check WhatsApp |
| Settings UI saves and loads number | REQ-012 | UI interaction + DB read | 1) Open settings > Notificaciones tab, 2) Enter number + apikey, 3) Save, 4) Reload page, 5) Values persist |
| Corte flow not blocked on send failure | REQ-013 | Network failure simulation needed | 1) Set invalid apikey, 2) Perform corte, 3) Verify corte completes and toast appears |
| Notification log visible in socio dashboard | REQ-014 | UI + DB integration | 1) Perform corte with number configured, 2) Open socio dashboard, 3) Log card shows entry |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Pre-execution setup covers all MISSING test file references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
