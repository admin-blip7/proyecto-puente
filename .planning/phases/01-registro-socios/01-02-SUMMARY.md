---
phase: 01-registro-socios
plan: "02"
subsystem: socio-registration
tags: [auth, public-path, tienda-header, useAuth, conditional-link]
dependency_graph:
  requires: [01-01]
  provides: [socio-registro-public-access, soy-socio-header-link]
  affects: [AuthProvider, TiendaHeader]
tech_stack:
  added: []
  patterns: [useAuth-hook, conditional-render-by-auth-state]
key_files:
  created: []
  modified:
    - src/components/auth/AuthProvider.tsx
    - src/components/tienda/layout/TiendaHeader.tsx
decisions:
  - "Added /socio/registro to isPublicPath — single surgical line addition, no other AuthProvider logic changed"
  - "useAuth() called in TiendaHeader for userProfile — AuthProvider wraps root layout so context is always available in tienda route group"
  - "Soy Socio link placed after User icon in desktop and before POS link in mobile — both positions are discoverable without disrupting existing nav flow"
metrics:
  duration_seconds: 83
  completed_date: "2026-03-09"
  tasks_completed: 2
  files_created: 0
  files_modified: 2
---

# Phase 01 Plan 02: AuthProvider Public Path + TiendaHeader Socio Link Summary

**One-liner:** Added /socio/registro to AuthProvider's isPublicPath and injected a useAuth-conditional "Soy Socio" link into TiendaHeader for unauthenticated visitors.

## What Was Built

Two targeted wiring changes that connect the registration page (built in 01-01) to both the auth guard and the storefront entry point. Without these changes, unauthenticated users would be redirected to /login on arrival, and there was no discoverable path to the registration page from the storefront.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add /socio/registro to AuthProvider isPublicPath | 47d5068 | src/components/auth/AuthProvider.tsx |
| 2 | Add Soy Socio link to TiendaHeader | a973d0e | src/components/tienda/layout/TiendaHeader.tsx |

## Artifacts

### src/components/auth/AuthProvider.tsx
- One line added: `pathname === "/socio/registro"` appended to `isPublicPath` condition chain
- All three redirect guards (lines 154, 171, 214) now correctly skip redirection when visiting /socio/registro without a session
- No other code changed in this file

### src/components/tienda/layout/TiendaHeader.tsx
- Added `import { useAuth } from '@/lib/hooks'`
- Added `const { userProfile } = useAuth()` inside component body
- Desktop: `{!userProfile && <Link href="/socio/registro">Soy Socio</Link>}` added after User icon, before Monitor (POS) icon
- Mobile menu: `{!userProfile && <Link href="/socio/registro">Soy Socio</Link>}` added inside the `pt-3 border-t` div, before POS link
- Link is hidden for authenticated users regardless of role (relies on `userProfile` being null when no session)

## Decisions Made

1. **Single-line addition to isPublicPath** — Only `/socio/registro` was added. Tienda paths are not in isPublicPath, but the `(tienda)` route group bypasses AuthProvider redirect through its own layout — confirmed by existing behavior. No changes to tienda paths.

2. **`useAuth()` context available in TiendaHeader** — The root `src/app/layout.tsx` wraps everything in `AuthProvider`. The `(tienda)` layout is nested inside root layout, so `AuthContext` is always available when `TiendaHeader` renders.

3. **Link placement** — Desktop: after User icon maintains natural flow (identity actions grouped). Mobile: before POS link in the bottom section keeps POS as the last item (staff action) while Soy Socio appears in visitor-facing section.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `grep -n "socio/registro" src/components/auth/AuthProvider.tsx` → line 103
- `grep -n "Soy Socio\|userProfile\|useAuth" src/components/tienda/layout/TiendaHeader.tsx` → lines 12, 102, 281, 287, 414, 420
- TypeScript: no new errors in modified files (pre-existing errors in ProductDetailModern.tsx are unrelated)

## Self-Check: PASSED

- [x] src/components/auth/AuthProvider.tsx contains `pathname === "/socio/registro"` on line 103
- [x] src/components/tienda/layout/TiendaHeader.tsx imports `useAuth` on line 12
- [x] src/components/tienda/layout/TiendaHeader.tsx calls `useAuth()` on line 102
- [x] Desktop `!userProfile` conditional link exists at line 281
- [x] Mobile `!userProfile` conditional link exists at line 414
- [x] Commit 47d5068 exists (Task 1)
- [x] Commit a973d0e exists (Task 2)
- [x] TypeScript: zero new errors in modified files
