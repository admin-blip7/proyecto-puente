# Phase 1: Registro de Socios en Tienda Web - Research

**Researched:** 2026-03-09
**Domain:** Supabase Auth + Next.js App Router registration flow
**Confidence:** HIGH

---

## Summary

This phase adds a self-service registration page at `/socio/registro` so wholesale partners (Socios) can create an account directly from the storefront and land on `/socio/dashboard` without manual approval. The project already has a fully-wired auth system via `AuthProvider`, a working `/socio/dashboard`, and a near-identical pattern in `CustomerLogin` that creates users with `role: 'Cliente'` via `supabase.auth.signUp({ options: { data: { role, name } } })`. The Socio registration is a small variation of that pattern.

The biggest design decision is route placement: `/socio/registro` should live at `src/app/socio/registro/page.tsx` (standalone, outside the `(tienda)` route group) because the `/socio/*` subtree is already established and must stay outside the tienda layout (no cart, no TiendaHeader). The registration page should be added to `AuthProvider.isPublicPath` so unauthenticated visitors can reach it.

The link to registration should be added to `TiendaHeader.tsx` in the User/Account icon area, conditionally shown only when no user session is active.

**Primary recommendation:** Follow the `CustomerLogin` pattern exactly — client-side `supabase.auth.signUp` with `options.data = { name, role: 'Socio', phone, businessName }`. No API route or service-role key is needed for the signUp itself. After a successful signUp, `AuthProvider.onAuthStateChange` fires, detects `role=Socio`, and redirects to `/socio/dashboard` automatically.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REQ-001 | Página pública de registro en /socio/registro | Standalone route at `src/app/socio/registro/page.tsx`; add to `isPublicPath` |
| REQ-002 | Formulario con nombre, email, contraseña, teléfono y datos del negocio | Zod schema + react-hook-form pattern from `LoginClient.tsx`; add `phone`, `businessName` fields |
| REQ-003 | API route / lógica que crea usuario en Supabase Auth con role=Socio en user_metadata | Use `supabase.auth.signUp` client-side with `options.data.role = 'Socio'` — same as `CustomerLogin` |
| REQ-004 | Redirección automática al dashboard /socio/dashboard tras registro exitoso | `AuthProvider.onAuthStateChange` already handles this; no extra code needed |
| REQ-005 | Link de acceso a registro de socios desde la tienda visible para usuarios no autenticados | Add conditional link in `TiendaHeader.tsx` next to the User icon |
| REQ-006 | Validación de campos en el frontend | Zod schema + `@hookform/resolvers/zod` pattern already in project |
| REQ-007 | Manejo de errores | `useToast` pattern from `LoginClient.tsx`; or inline error state from `CustomerLogin.tsx` |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.45.0 | User creation via `supabase.auth.signUp` | Already the auth layer for the whole project |
| `react-hook-form` | ^7.54.2 | Form state, submission, field registration | Used in `LoginClient.tsx` |
| `zod` | ^3.24.2 | Schema validation for form fields | Used in `LoginClient.tsx` and throughout API routes |
| `@hookform/resolvers` | ^4.1.3 | Connect Zod schema to react-hook-form | Used in `LoginClient.tsx` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | ^0.475.0 | Icons (Loader2, Eye, EyeOff, Building2) | Loading spinner, password toggle |
| `useToast` from `@/hooks/use-toast` | project hook | Error / success notifications | Preferred over inline error in admin-style pages; the tienda style uses inline error `<div>` |

### UI Components (from `@/components/ui/`)
All already installed via Radix UI + shadcn convention:
- `Button`, `Input`, `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription`
- `Form`, `FormControl`, `FormField`, `FormItem`, `FormLabel`, `FormMessage`

**No new installations required.**

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── socio/
│       ├── page.tsx              # already exists — redirects to /socio/dashboard
│       ├── dashboard/page.tsx    # already exists
│       ├── seleccionar-sucursal/ # already exists
│       └── registro/
│           └── page.tsx          # NEW — thin Server Component shell
├── components/
│   └── socio/
│       └── SocioRegisterForm.tsx # NEW — "use client" form component
```

The page shell (`page.tsx`) is a minimal Server Component that renders the client form component. This matches the project's pattern: thin RSC pages hydrating a `*Client.tsx`-style component.

### Pattern 1: Auth signUp with user_metadata role (HIGH confidence)
**What:** Call `supabase.auth.signUp` from a Client Component, passing `options.data` to set `user_metadata`. AuthProvider reads `user_metadata.role` on the next `onAuthStateChange` event.
**When to use:** All self-service registration flows in this project.

```typescript
// Source: src/components/tienda/auth/CustomerLogin.tsx (verified in codebase)
const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      name: fullName,
      role: 'Socio',         // <-- user_metadata.role, read by buildUserProfile()
      phone: phone,
      business_name: businessName,
    },
  },
})
```

`buildUserProfile()` in `AuthProvider.tsx` (lines 61-68) reads:
```typescript
const metadataRole = String(metadata.role || "").toLowerCase();
// ...
if (resolvedRole === "socio") role = "Socio";
```

Then `getPostLoginRedirect` (lines 37-39) handles the redirect:
```typescript
if (role === 'Socio') {
  return "/socio/dashboard";
}
```

### Pattern 2: react-hook-form + zod validation (HIGH confidence)
**What:** Define a Zod schema, use `zodResolver`, define fields with `FormField`.
**When to use:** Every form in the admin/pos UI.

```typescript
// Source: src/components/auth/LoginClient.tsx (verified in codebase)
const formSchema = z.object({
  nombre: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  email: z.string().email({ message: "Por favor ingrese un correo válido." }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
  telefono: z.string().min(10, { message: "Ingrese un teléfono válido (10 dígitos)." }),
  nombreNegocio: z.string().min(2, { message: "El nombre del negocio es requerido." }),
});

const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
  defaultValues: { nombre: "", email: "", password: "", telefono: "", nombreNegocio: "" },
});
```

### Pattern 3: Public path registration in AuthProvider
**What:** The `isPublicPath` variable in `AuthProvider.tsx` (lines 99-102) controls which paths skip auth redirect.
**When to use:** Any page that must be accessible without login.

Current code:
```typescript
// Source: src/components/auth/AuthProvider.tsx lines 99-102 (verified)
const isPublicPath = pathname === "/login" ||
  pathname === "/reset-password" ||
  pathname === "/" ||
  pathname.startsWith("/products/");
```

Required change — add one condition:
```typescript
const isPublicPath = pathname === "/login" ||
  pathname === "/reset-password" ||
  pathname === "/" ||
  pathname.startsWith("/products/") ||
  pathname === "/socio/registro";   // ADD THIS
```

**Important:** If the user is already logged in and visits `/socio/registro`, `AuthProvider` will fire `onAuthStateChange` → `getPostLoginRedirect` → redirect them away. This is desirable behavior.

### Pattern 4: Conditional link in TiendaHeader
**What:** TiendaHeader is a Client Component. It can access `supabase.auth.getSession()` or use `useAuth()` to detect whether a user is logged in, then show/hide the Socio link.
**When to use:** Any header element that is auth-aware.

The User icon currently links unconditionally to `/tienda/cuenta/perfil`. The link for Socio registration should appear next to it, only for unauthenticated visitors:

```typescript
// In TiendaHeader.tsx, within the "Icon Buttons" div (after the User icon)
// Import useAuth at top: import { useAuth } from '@/lib/hooks'
const { userProfile } = useAuth()

// Render conditionally:
{!userProfile && (
  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
    <Link
      href="/socio/registro"
      className="flex h-11 items-center gap-2 rounded-full border border-border/50 bg-background px-3 hover:border-accent/50 hover:bg-secondary/50 transition-all text-xs font-bold uppercase tracking-wider"
    >
      Soy Socio
    </Link>
  </motion.div>
)}
```

### Anti-Patterns to Avoid
- **Using an API route for signUp**: The client-side `supabase.auth.signUp` is sufficient. An API route would add complexity without benefit since user_metadata is set via `options.data` in the client call.
- **Using `getSupabaseServerClient()` for registration**: The service-role client is for privileged server-side operations. The anon client handles `signUp` correctly.
- **Redirecting manually after signUp**: Do not call `router.push('/socio/dashboard')` after signUp. Instead, let `AuthProvider.onAuthStateChange` handle the redirect. This avoids race conditions between the session being set and the redirect.
- **Adding `/socio/registro` inside the `(tienda)` route group**: That would wrap it in `TiendaHeader`, `TiendaFooter`, and `CartProvider`. The Socio registration page should be a standalone page without the storefront chrome.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validation functions | `zod` + `zodResolver` | Already installed; handles edge cases, error messages, type inference |
| Auth session management | Custom session polling | `supabase.auth.onAuthStateChange` (already in AuthProvider) | AuthProvider already does everything needed |
| Role-based redirect | Manual role check + redirect after signUp | `AuthProvider.getPostLoginRedirect` | Already handles Socio → `/socio/dashboard` |
| Loading state in button | Custom spinner implementation | `Loader2` from lucide-react + `disabled` | Already used in LoginClient |
| Toast notifications | Custom alert div | `useToast` hook | Already wired in layout |

---

## Common Pitfalls

### Pitfall 1: Email Confirmation Enabled in Supabase
**What goes wrong:** If the Supabase project has "Confirm email" enabled in Auth settings, `signUp` returns a user but NO session. The `onAuthStateChange` event fires with `SIGNED_UP` but the user is not authenticated yet — so the redirect to `/socio/dashboard` never happens. Instead, the user sees a blank page or gets redirected to `/login`.
**Why it happens:** Supabase default setting for new projects has email confirmation enabled. The existing `CustomerLogin` code (line 62-63) does NOT check for this — it directly calls `router.push('/tienda/cuenta/perfil')` after signUp, which would break if email confirmation is on.
**How to avoid:** Check `data.session` after signUp. If `data.session` is null but `data.user` exists, email confirmation is required — show a message "Revisa tu correo para confirmar tu cuenta." Do not redirect.
**Warning signs:** User is created in Supabase dashboard but can't log in immediately; `session` is null after `signUp`.

```typescript
const { data, error } = await supabase.auth.signUp({ ... })
if (data.session) {
  // Auto-logged in — AuthProvider will redirect
} else if (data.user) {
  // Email confirmation required
  setSuccessMessage("Revisa tu correo para confirmar tu cuenta.")
}
```

### Pitfall 2: AuthProvider redirecting away from /socio/registro before form loads
**What goes wrong:** A visitor navigates to `/socio/registro`. `AuthProvider` runs `syncSession()`. If there's a stale localStorage token, it might briefly think the user is logged in and redirect. If the user has no token, but `isPublicPath` doesn't include `/socio/registro`, they get sent to `/login` immediately.
**Why it happens:** `isPublicPath` currently does not include `/socio/registro`.
**How to avoid:** Add `pathname === "/socio/registro"` to `isPublicPath` in `AuthProvider.tsx`. This is a REQUIRED change for REQ-001.

### Pitfall 3: Role set in user_metadata but not recognized
**What goes wrong:** If the role string is `"socio"` (lowercase) but the metadata stores it differently (e.g., `"Socio"` with capital S), `buildUserProfile` resolves it correctly due to `.toLowerCase()` comparison, but it's still best practice to store it as `"Socio"` matching the existing enum.
**Why it happens:** The project uses `role: "Socio"` (capital S) consistently in `CustomerLogin` (`role: 'Cliente'`) and in the `UserProfile` type definition.
**How to avoid:** Always pass `role: 'Socio'` (capital S) in `options.data` to match the convention.

### Pitfall 4: TiendaHeader is in the (tienda) layout but /socio/registro is not
**What goes wrong:** The Socio link added to TiendaHeader only appears on tienda pages. That is correct — the requirement is "visible desde la tienda" (REQ-005). The link is not needed on `/socio/registro` itself.
**Why it happens:** Route groups in Next.js App Router mean layouts only apply within their group.
**How to avoid:** This is expected and correct behavior. No action needed.

### Pitfall 5: useAuth() not available in TiendaHeader
**What goes wrong:** `useAuth()` (from `@/lib/hooks`) depends on `AuthContext`. The `(tienda)` layout does NOT include `AuthProvider` — it only has `ThemeProvider`, `CartProvider`. The root `layout.tsx` wraps everything in `AuthProvider`, so `useAuth()` IS available in `TiendaHeader` since the tienda layout is nested inside the root layout.
**Why it happens:** Could be confused by the (tienda) layout file only showing `CartProvider`.
**How to avoid:** Verify by checking `src/app/layout.tsx` — it wraps all children in `AuthProvider` (confirmed in ARCHITECTURE.md: "Root Layout: Wraps all surfaces in AuthProvider"). `useAuth()` is safe to call in `TiendaHeader`.

---

## Code Examples

### Full signUp flow with error handling and email confirmation guard
```typescript
// Source: Pattern adapted from src/components/tienda/auth/CustomerLogin.tsx
const onSubmit = async (values: z.infer<typeof formSchema>) => {
  setLoading(true);
  try {
    if (!supabase) throw new Error("Supabase no está configurado");

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          name: values.nombre,
          role: 'Socio',
          phone: values.telefono,
          business_name: values.nombreNegocio,
        },
      },
    });

    if (error) throw error;

    if (data.session) {
      // AuthProvider's onAuthStateChange will redirect to /socio/dashboard
      // No manual router.push needed
    } else if (data.user) {
      // Email confirmation is enabled in Supabase settings
      setEmailSent(true);
    }
  } catch (error: any) {
    toast({
      variant: "destructive",
      title: "Error al registrarse",
      description: error.message || "No fue posible crear la cuenta.",
    });
  } finally {
    setLoading(false);
  }
};
```

### AuthProvider isPublicPath change
```typescript
// File: src/components/auth/AuthProvider.tsx — lines 99-102
// BEFORE:
const isPublicPath = pathname === "/login" ||
  pathname === "/reset-password" ||
  pathname === "/" ||
  pathname.startsWith("/products/");

// AFTER:
const isPublicPath = pathname === "/login" ||
  pathname === "/reset-password" ||
  pathname === "/" ||
  pathname.startsWith("/products/") ||
  pathname === "/socio/registro";
```

### Minimal page shell
```typescript
// File: src/app/socio/registro/page.tsx
import SocioRegisterForm from "@/components/socio/SocioRegisterForm";

export const metadata = {
  title: "Registro de Socio - 22 Electronic",
  description: "Únete al programa Socio 22+ y accede a precios mayoristas",
};

export default function SocioRegistroPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <SocioRegisterForm />
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Firebase Auth (original project) | Supabase Auth | Migration on `feature/rama-supabase` branch | All auth uses `supabase.auth.*` |
| Admin-created accounts only | Self-service `signUp` | `CustomerLogin.tsx` already does this for Clientes | Pattern confirmed working |
| Manual role assignment | `user_metadata.role` set at signUp | Present in codebase since Supabase migration | Socio follows same pattern |

---

## Route Group Decision

**Decision: `/socio/registro` should be OUTSIDE the `(tienda)` route group.**

Rationale:
- The `/socio/*` subtree is already established outside any route group at `src/app/socio/`. This is the correct home.
- The `(tienda)` layout adds `TiendaHeader`, `TiendaFooter`, `CartProvider`, and `ThemeProvider` forced to light mode. A registration page for a wholesale partner program does not need a shopping cart or storefront navigation.
- The existing `/login` page follows the same pattern: standalone outside any route group, using a simple centered Card layout.
- If placed inside `(tienda)`, the URL would need to be `/tienda/socio/registro` which does not match REQ-001 (`/socio/registro`).

**File location:** `src/app/socio/registro/page.tsx`
**Component location:** `src/components/socio/SocioRegisterForm.tsx`

---

## Open Questions

1. **Email confirmation in Supabase project**
   - What we know: The existing `CustomerLogin` does not handle the no-session case, suggesting email confirmation may be disabled in the Supabase project settings.
   - What's unclear: Cannot confirm Supabase dashboard settings from code alone.
   - Recommendation: The registration form MUST handle both cases (session returned vs. confirmation email required). Show a success message with instructions if session is null. This is defensive coding regardless.

2. **Fields for "datos del negocio" (REQ-002)**
   - What we know: REQ-002 says "nombre, email, contraseña, teléfono y datos del negocio" but does not specify exactly which business fields are needed.
   - What's unclear: Is "datos del negocio" just a business name, or does it include RFC, address, etc.?
   - Recommendation: Implement with `nombreNegocio` (business name) as the minimum. The planner can add more fields if specified. Keep the Zod schema extensible.

3. **`phone` vs `telefono` field name in user_metadata**
   - What we know: `UserProfile` type has no `phone` field — only `uid`, `name`, `email`, `role`, `partnerId`, `branchId`. Extra metadata fields are stored in Supabase but not exposed by `buildUserProfile`.
   - What's unclear: Whether a future phase will need to read `phone` or `business_name` from the profile.
   - Recommendation: Store as `phone` and `business_name` in user_metadata for now (snake_case matches Supabase convention). These can be added to `UserProfile` interface in a future phase.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected (no jest/vitest config found per STACK.md) |
| Config file | None — Wave 0 must create |
| Quick run command | `npx vitest run --reporter=verbose` (after Wave 0 setup) |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-001 | `/socio/registro` renders without redirect for unauthenticated user | smoke/manual | Manual browser check | ❌ Wave 0 |
| REQ-002 | Form validates all required fields (nombre, email, password, telefono, nombreNegocio) | unit | `npx vitest run tests/socio-register-form.test.ts` | ❌ Wave 0 |
| REQ-003 | `signUp` called with `role: 'Socio'` in options.data | unit (mock supabase) | `npx vitest run tests/socio-register-form.test.ts` | ❌ Wave 0 |
| REQ-004 | After successful signUp with session, no manual redirect is coded (relies on AuthProvider) | unit | `npx vitest run tests/auth-provider.test.ts` | ❌ Wave 0 |
| REQ-005 | Link to `/socio/registro` visible in TiendaHeader when userProfile is null | unit (component) | `npx vitest run tests/tienda-header.test.ts` | ❌ Wave 0 |
| REQ-006 | Zod schema rejects invalid email, short password, missing required fields | unit | `npx vitest run tests/socio-register-schema.test.ts` | ❌ Wave 0 |
| REQ-007 | Error from signUp shown to user via toast or inline error | unit (mock supabase error) | `npx vitest run tests/socio-register-form.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/socio-register-schema.test.ts` (schema unit tests, < 5s)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before marking phase complete

### Wave 0 Gaps
- [ ] `vitest.config.ts` — framework setup
- [ ] `tests/socio-register-schema.test.ts` — covers REQ-002, REQ-006
- [ ] `tests/socio-register-form.test.ts` — covers REQ-003, REQ-007
- [ ] `tests/tienda-header.test.ts` — covers REQ-005
- [ ] Framework install: `npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom` — if none detected

---

## Sources

### Primary (HIGH confidence)
- `src/components/auth/AuthProvider.tsx` — isPublicPath logic, buildUserProfile, getPostLoginRedirect
- `src/components/tienda/auth/CustomerLogin.tsx` — direct precedent for signUp with role in user_metadata
- `src/components/auth/LoginClient.tsx` — react-hook-form + zod pattern, useToast pattern
- `src/lib/supabaseClient.ts` — anon client used for auth.signUp
- `src/app/socio/dashboard/page.tsx` — confirms /socio/dashboard exists and expects Socio role
- `src/app/(tienda)/layout.tsx` — confirms TiendaHeader is inside tienda group only
- `src/types/index.ts` — UserProfile interface with role: 'Socio' confirmed
- `.planning/codebase/ARCHITECTURE.md` — dual client strategy, AuthProvider behavior
- `.planning/codebase/STACK.md` — confirms react-hook-form, zod, no test framework

### Secondary (MEDIUM confidence)
- Supabase JS `signUp` API: `options.data` maps directly to `user.user_metadata` — consistent with how `buildUserProfile` reads it (verified by tracing code)

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in package.json and used in codebase
- Architecture: HIGH — route decision and component patterns verified from actual files
- Pitfalls: HIGH (auth redirect, email confirmation) / MEDIUM (TiendaHeader useAuth availability)
- Validation: MEDIUM — no test framework exists; framework choice is a recommendation

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable dependencies; Supabase JS API very stable)
