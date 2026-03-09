---
phase: 01-registro-socios
plan: "01"
subsystem: socio-registration
tags: [auth, registration, form, supabase, zod]
dependency_graph:
  requires: []
  provides: [socio-registration-form, socio-registro-page]
  affects: [AuthProvider, supabase-auth]
tech_stack:
  added: []
  patterns: [react-hook-form, zod-resolver, shadcn-form, supabase-auth-signUp]
key_files:
  created:
    - src/components/socio/SocioRegisterForm.tsx
    - src/app/socio/registro/page.tsx
  modified: []
decisions:
  - "No router.push after signUp — AuthProvider.onAuthStateChange handles redirect to /socio/dashboard to avoid race condition"
  - "role: 'Socio' (capital S) passed in options.data to match UserProfile enum and AuthProvider buildUserProfile logic"
  - "emailSent state replaces form with confirmation card when signUp returns user but no session (email confirmation flow)"
metrics:
  duration_seconds: 75
  completed_date: "2026-03-09"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 01 Plan 01: Registration Form Component and Page Summary

**One-liner:** Public /socio/registro page with client-side Zod-validated signUp form calling supabase.auth.signUp with role:'Socio' metadata.

## What Was Built

A self-service registration entry point for wholesale partners (Socios). Visitors navigate to `/socio/registro` and fill a 5-field form. On valid submission, Supabase Auth creates the account with `role: 'Socio'` in `user_metadata`, which AuthProvider then uses to redirect the new user to `/socio/dashboard` automatically.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create SocioRegisterForm client component | 5912c8d | src/components/socio/SocioRegisterForm.tsx |
| 2 | Create registration page shell | 92eaff8 | src/app/socio/registro/page.tsx |

## Artifacts

### src/components/socio/SocioRegisterForm.tsx
- `"use client"` component
- Zod schema: nombre (min 2), email (valid), password (min 6), telefono (min 10), nombreNegocio (min 2)
- `react-hook-form` with `zodResolver`
- Password visibility toggle (Eye/EyeOff)
- `onSubmit` calls `supabase.auth.signUp` with `options.data.role = 'Socio'`
- Session path: does nothing (AuthProvider fires and redirects)
- Email-confirmation path: sets `emailSent = true`, shows success card with link back to `/tienda`
- Error path: destructive toast with Supabase error message
- Link to `/login` for existing users

### src/app/socio/registro/page.tsx
- Plain RSC (no `"use client"`)
- Exports `metadata` for SEO
- Full-screen centered layout wrapping `<SocioRegisterForm />`
- No TiendaHeader/CartProvider — intentional, this is outside the tienda route group

## Decisions Made

1. **No `router.push` after signUp** — AuthProvider's `onAuthStateChange` already handles redirect to `/socio/dashboard` for role='Socio'. Calling `router.push` would race with it and potentially cause double navigation.

2. **`role: 'Socio'` (capital S)** — Matches the `UserProfile["role"]` enum. AuthProvider's `buildUserProfile` lowercases the metadata then maps `"socio"` → `"Socio"`.

3. **`emailSent` state** — When Supabase is configured with email confirmation, `data.session` is null but `data.user` is set. The form switches to a confirmation card explaining the user needs to verify their email.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- TypeScript compiles without errors in both new files
- Pre-existing errors in `ProductDetailModern.tsx` are unrelated to this plan
- Both files exist at expected paths
- Component exports `SocioRegisterForm` as default and named export

## Self-Check: PASSED

- [x] src/components/socio/SocioRegisterForm.tsx exists
- [x] src/app/socio/registro/page.tsx exists
- [x] Commit 5912c8d exists (Task 1)
- [x] Commit 92eaff8 exists (Task 2)
- [x] TypeScript: zero new errors in new files
