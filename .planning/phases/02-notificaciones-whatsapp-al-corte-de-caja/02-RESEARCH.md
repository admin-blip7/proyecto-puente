# Phase 2: Notificaciones WhatsApp al Corte de Caja - Research

**Researched:** 2026-03-10
**Domain:** WhatsApp Business API + Next.js API Routes + Supabase branches table
**Confidence:** HIGH

---

## Summary

This phase sends an automatic WhatsApp summary to the socio's configured number every time a cashier runs `handleCloseDrawer` in `POSClient.tsx`. The existing corte flow already gathers all the data needed (sales, expenses, incomes, session totals) inside `printCashCloseTicket` — the WhatsApp trigger must reuse the exact same data fetch pattern and run **fire-and-forget** after the PDF print, so a failure never blocks the cashier.

The socio's WhatsApp number must be stored per-branch in the existing `branches` Supabase table (one new column: `whatsapp_number`). The settings UI follows the existing tab pattern in `src/app/admin/settings/page.tsx` — a new **"Notificaciones"** tab backed by a small client component. The API transport layer uses **Twilio's Node.js SDK** via a Next.js API route (`POST /api/whatsapp/corte`), called with `fetch` (no `await` — fire-and-forget) from the client after the session close succeeds.

For free-tier development, Twilio's sandbox is the correct choice: no Meta business account approval is needed, join code takes 30 seconds, and the Node.js SDK is `npm install twilio` (4 MB). Production graduation requires registering the business phone number with Meta through the Twilio console — no code change needed. Meta Cloud API direct is equally viable but requires a Facebook Business Account setup upfront, making it slower to start.

**Primary recommendation:** Use Twilio WhatsApp SDK for both dev (sandbox) and production. Store `whatsapp_number` on the `branches` table. Trigger from a Next.js API route called fire-and-forget from `handleCloseDrawer` after `printCashCloseTicket` resolves.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REQ-008 | Campo de número WhatsApp configurable en el perfil/settings de cada socio por sucursal | Add `whatsapp_number TEXT` column to `branches` table; settings UI in new "Notificaciones" tab |
| REQ-009 | Integración con API de WhatsApp para envío de mensajes | Twilio Node.js SDK (`twilio` package); `POST /api/whatsapp/corte` API route |
| REQ-010 | Al cerrar sesión de caja, disparar envío automático al número del socio | Fire-and-forget `fetch` call in `handleCloseDrawer` after `printCashCloseTicket` resolves |
| REQ-011 | Mensaje incluye fecha/hora, cajero, ventas efectivo, ventas tarjeta, total, detalle productos | Build from `CashSession` + `Sale[]` data; template in `whatsappNotificationService.ts` |
| REQ-012 | UI en configuraciones para guardar número WhatsApp con formato internacional | New `NotificacionesSettingsClient.tsx` using shadcn `Input` + E.164 validation via Zod |
| REQ-013 | Errores no bloquean el flujo del corte; solo toast de advertencia | Fire-and-forget pattern; API route catches all errors and returns `{ ok: false }`; client shows toast |
| REQ-014 | Historial/log de notificaciones enviadas (opcional, visible en dashboard del socio) | New `whatsapp_notification_log` Supabase table; read in socio dashboard card |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `twilio` | ^5.x | WhatsApp message dispatch via Twilio Messaging API | Free sandbox, no Meta business approval needed for dev; Node.js SDK maintained by Twilio |
| `zod` | ^3.24 (already installed) | Phone number format validation in settings UI | Already used project-wide for form validation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/supabase-js` | ^2.45 (already installed) | Read `whatsapp_number` from `branches` table; write notification log | Already used project-wide |
| `react-hook-form` | ^7.54 (already installed) | Settings form for phone number input | Already used in registration form |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Twilio | Meta Cloud API direct | Meta requires Facebook Business Manager setup + app review before first test message; Twilio sandbox works in 2 minutes |
| Twilio | WAHA (self-hosted) | WAHA runs a WhatsApp Web session in Docker — no server to run, this is a Vercel/hosted Next.js app; not viable |
| Twilio | `wa.me` deep link | A link requires the cashier to tap manually; does not satisfy REQ-010 (automatic send) |
| API route | Server action | Server actions have a 30-second timeout on Vercel hobby plan; fine for fire-and-forget but API routes are more explicit and easier to test |

**Installation:**
```bash
npm install twilio
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/api/whatsapp/
│   └── corte/
│       └── route.ts           # POST handler — calls Twilio, writes log
├── lib/services/
│   └── whatsappNotificationService.ts  # message template builder + Twilio send
├── components/admin/settings/
│   └── NotificacionesSettingsClient.tsx  # new tab — phone number form
supabase/migrations/
└── 20260310000000_add_whatsapp_to_branches.sql
└── 20260310000001_create_whatsapp_notification_log.sql
```

### Pattern 1: Fire-and-Forget Trigger in handleCloseDrawer
**What:** After `await printCashCloseTicket(closedSession)` resolves, call the API route with `fetch` but do NOT `await` it. Wrap in try/catch so the cashier never sees an error from WhatsApp.
**When to use:** Any notification that is secondary to the primary business flow.
**Example:**
```typescript
// In handleCloseDrawer, AFTER printCashCloseTicket:
// Fire-and-forget: do not await, do not block
try {
  fetch('/api/whatsapp/corte', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: closedSession.id,
      branchId: userProfile.branchId ?? null,
    }),
  }).then(async (res) => {
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      if (json?.error) {
        toast({ title: "WhatsApp", description: "No se pudo enviar la notificación.", variant: "destructive" });
      }
    }
  }).catch(() => {
    toast({ title: "WhatsApp", description: "No se pudo enviar la notificación.", variant: "destructive" });
  });
} catch {
  // intentionally swallowed — never block the corte
}
```

### Pattern 2: API Route — Fetch branch number, build message, send
**What:** The route handler looks up `branches.whatsapp_number` for the given `branchId`, fetches sales/expenses/session data, builds the text message, and calls Twilio.
**When to use:** Keeps Twilio credentials server-side; client never touches the API keys.
**Example:**
```typescript
// src/app/api/whatsapp/corte/route.ts
import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, branchId } = await req.json();

    const supabase = getSupabaseServerClient();

    // 1. Get branch WhatsApp number
    const { data: branch } = await supabase
      .from('branches')
      .select('whatsapp_number, name')
      .eq('id', branchId)
      .maybeSingle();

    if (!branch?.whatsapp_number) {
      return NextResponse.json({ ok: false, error: 'no_number' }, { status: 200 });
    }

    // 2. Get session + sales data
    const { data: session } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    // 3. Build message text (see whatsappNotificationService.ts)
    const { buildCorteMessage } = await import('@/lib/services/whatsappNotificationService');
    const messageBody = buildCorteMessage({ session, branchName: branch.name });

    // 4. Send via Twilio
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
      to: `whatsapp:${branch.whatsapp_number}`,
      body: messageBody,
    });

    // 5. Log notification (optional, REQ-014)
    await supabase.from('whatsapp_notification_log').insert({
      branch_id: branchId,
      session_id: sessionId,
      phone_to: branch.whatsapp_number,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[whatsapp/corte] error:', error?.message);
    return NextResponse.json({ ok: false, error: error?.message }, { status: 200 });
  }
}
```

### Pattern 3: Message Template Builder
**What:** A pure function that takes `CashSession` + `Sale[]` and returns a formatted string. Keep it in a service file so it is easy to unit test.
**Example:**
```typescript
// src/lib/services/whatsappNotificationService.ts
import { CashSession, Sale } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BuildCorteMessageOptions {
  session: CashSession;
  sales?: Sale[];
  branchName: string;
}

export function buildCorteMessage({ session, sales = [], branchName }: BuildCorteMessageOptions): string {
  const dateStr = format(
    new Date(session.closedAt ?? session.openedAt),
    "dd/MM/yyyy HH:mm",
    { locale: es }
  );

  const total = (session.totalCashSales ?? 0) + (session.totalCardSales ?? 0);

  // Aggregate product lines
  const productMap: Record<string, { qty: number; total: number }> = {};
  for (const sale of sales) {
    if (sale.status === 'cancelled') continue;
    for (const item of sale.items) {
      if (!productMap[item.name]) productMap[item.name] = { qty: 0, total: 0 };
      productMap[item.name].qty += item.quantity;
      productMap[item.name].total += item.priceAtSale * item.quantity;
    }
  }

  const productLines = Object.entries(productMap)
    .map(([name, v]) => `  • ${v.qty}x ${name.substring(0, 25)}: $${v.total.toFixed(2)}`)
    .join('\n');

  return [
    `*CORTE DE CAJA - ${branchName}*`,
    `Fecha: ${dateStr}`,
    `Cajero: ${session.openedByName}`,
    ``,
    `*Ventas:*`,
    `  Efectivo: $${(session.totalCashSales ?? 0).toFixed(2)}`,
    `  Tarjeta:  $${(session.totalCardSales ?? 0).toFixed(2)}`,
    `  *Total:   $${total.toFixed(2)}*`,
    ``,
    productLines ? `*Productos vendidos:*\n${productLines}` : '',
    ``,
    `_Mensaje automático generado al cerrar turno._`,
  ].filter(Boolean).join('\n');
}
```

### Pattern 4: Settings Tab for WhatsApp Phone Number
**What:** New "Notificaciones" tab in `/admin/settings` following the exact pattern of the other tabs (async server page loads initial data, passes to client component).
**When to use:** For any branch-level configuration following the existing `settings` page tab pattern.
```typescript
// In settings/page.tsx — add to TabsList and TabsContent:
// <TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>
// <TabsContent value="notificaciones"><WhatsAppSettingsClient initialBranches={initialBranches} /></TabsContent>

// NotificacionesSettingsClient.tsx renders a form per branch:
// - Branch name (read-only label)
// - WhatsApp number Input with placeholder "+521XXXXXXXXXX"
// - Save button calls server action to PATCH branches table
```

### Anti-Patterns to Avoid
- **Awaiting the fetch call in handleCloseDrawer:** Makes the cashier wait for Twilio's network round-trip (~500ms–2s). REQ-013 explicitly says it must not block.
- **Storing Twilio credentials client-side:** The API keys MUST stay in `.env.local` / Vercel env vars and never touch the browser bundle. Use an API route — never call Twilio from the client.
- **Using a WhatsApp template (Content SID) for the corte message:** Template messages are required only for business-initiated messages OUTSIDE the 24-hour customer service window. Since this is a utility notification (not marketing), a freeform message inside a session window works. For the production sandbox → production path, register a Utility template to guarantee delivery even when no session window is open.
- **Creating a separate `partner_whatsapp_settings` table:** The `branches` table already exists and is the natural owner of per-branch configuration. Adding a column is simpler than a join.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WhatsApp delivery | Custom HTTP client to WhatsApp Cloud API | `twilio` npm package | Handles retries, error codes, auth, phone format validation |
| Phone format validation | Custom regex | Zod `z.string().regex(/^\+[1-9]\d{7,14}$/)` | Covers all E.164 edge cases |
| Message scheduling/retry | Custom queue | Fire-and-forget is sufficient (REQ-013); Twilio handles delivery retry internally | Corte is a point-in-time event; no retry logic needed at app level |

---

## Common Pitfalls

### Pitfall 1: Sandbox join requirement
**What goes wrong:** Twilio sandbox messages only reach phones that have opted in by texting `join <code>` to the sandbox number. In production, clients/socios will NOT have done this.
**Why it happens:** Sandbox is a shared test environment requiring explicit consent.
**How to avoid:** Use sandbox ONLY for development. For production, register a dedicated WhatsApp Business number via Twilio console. The socio's number must message the sandbox code during testing.
**Warning signs:** Twilio returns `error 63016` (recipient not in sandbox).

### Pitfall 2: Missing `whatsapp:` prefix on phone numbers
**What goes wrong:** Twilio returns `error 21612` — "The 'To' number is not a valid phone number."
**Why it happens:** Twilio requires the `whatsapp:` scheme prefix for WhatsApp messages.
**How to avoid:** Always prepend `whatsapp:` to both `from` and `to` in the Twilio `messages.create` call. The number stored in the DB should be clean E.164 (`+521XXXXXXXXXX`); add the prefix in code, not in the DB.

### Pitfall 3: Blocking the corte flow
**What goes wrong:** `await fetch('/api/whatsapp/corte', ...)` inside `handleCloseDrawer` delays the UI and can cause a timeout error to surface to the cashier.
**Why it happens:** Network calls to third-party APIs (Twilio) can take 500ms–3s.
**How to avoid:** Use the fire-and-forget pattern (Pattern 1 above). Handle the Promise rejection with `.catch()` to show a non-blocking toast.

### Pitfall 4: `branches` table not having `whatsapp_number` column
**What goes wrong:** API route query returns `null` for `whatsapp_number`; message is silently skipped.
**Why it happens:** The migration was not applied.
**How to avoid:** Wave 0 task must apply the migration. API route should log clearly when no number is configured.

### Pitfall 5: Twilio env vars missing in production
**What goes wrong:** `TWILIO_ACCOUNT_SID` is undefined at runtime; Twilio client throws an error; notification silently fails.
**Why it happens:** Env vars not added to Vercel project settings.
**How to avoid:** Add env var validation at startup using Zod or a guard in the API route. Log a clear server-side error.

### Pitfall 6: `branchId` not available in POSClient
**What goes wrong:** The fire-and-forget fetch sends `branchId: null`; API route cannot look up the WhatsApp number.
**Why it happens:** `userProfile` type has `branchId?: string` (optional). Not all users have a branch assigned.
**How to avoid:** Read `branchId` from `userProfile.branchId` OR from the `BranchContext` (which already tracks `selectedBranch.id` for Socios). Prefer `BranchContext.selectedBranch.id` since POSClient already has the `useAuth` hook — add `useBranch()` call or pass branchId as prop.

---

## Code Examples

Verified patterns from official sources and codebase inspection:

### Twilio message send (server-side)
```typescript
// Source: https://www.twilio.com/docs/whatsapp/api
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const message = await client.messages.create({
  from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,  // e.g. whatsapp:+14155238886 (sandbox)
  to: `whatsapp:+521XXXXXXXXXX`,
  body: 'Your corte message here',
});

console.log(message.sid);
```

### Zod phone validation for settings UI
```typescript
// E.164 format: +[country code][number], 8–15 digits total
const WhatsAppSettingsSchema = z.object({
  whatsappNumber: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, 'Debe ser formato internacional, ej: +5215512345678')
    .or(z.literal('')),
});
```

### Supabase branch update (server action)
```typescript
'use server';
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';

export async function saveBranchWhatsAppNumber(branchId: string, number: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from('branches')
    .update({ whatsapp_number: number || null })
    .eq('id', branchId);
  if (error) throw new Error(error.message);
}
```

### Migration: add column to branches
```sql
-- supabase/migrations/20260310000000_add_whatsapp_to_branches.sql
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
```

### Migration: notification log table (REQ-014)
```sql
-- supabase/migrations/20260310000001_create_whatsapp_notification_log.sql
CREATE TABLE IF NOT EXISTS public.whatsapp_notification_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  session_id  UUID,
  phone_to    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'sent',  -- 'sent' | 'failed'
  error_msg   TEXT,
  sent_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_log_branch_id
  ON public.whatsapp_notification_log(branch_id);
```

---

## Where to Store the WhatsApp Number

**Decision: `branches.whatsapp_number` column (TEXT, nullable)**

Rationale:
- REQ-008 says "por sucursal" — the number is per-branch, not per-user.
- The `branches` table already exists and is read by `BranchContext`, `masterService`, and the API route.
- Adding a nullable TEXT column is the minimum migration surface. No new table or join needed.
- The `settingsService` pattern (key-value in the `settings` table) is only used for app-wide configuration. Branch-specific config belongs on the `branches` row.

Alternative rejected: storing in `settings` table with `id = "branch_whatsapp_{branchId}"` — works but creates non-obvious key proliferation and makes the settings page harder to reason about.

---

## How to Trigger After Corte

**Decision: fire-and-forget `fetch` from POSClient after `printCashCloseTicket` resolves**

The trigger point in `handleCloseDrawer` (line ~471 in POSClient.tsx):
```typescript
await printCashCloseTicket(closedSession);
// ← add fire-and-forget call here
```

Why not a Supabase database trigger (pg function):
- Would require a background job or Edge Function to call Twilio; adds infrastructure complexity.
- Can't access Twilio credentials from Postgres.
- Harder to debug.

Why not a Server Action:
- Server Actions have timeouts on Vercel serverless (30s default, fine for this) but are harder to call fire-and-forget from a client component than a plain `fetch`.
- API route is more explicit, testable with curl, and follows the existing pattern in `/api/repairs`, `/api/sales`, etc.

---

## Settings UI Integration

The existing `/admin/settings` page uses a 6-column `TabsList`:
```
General | Diseño de Tickets | Diseño de Etiquetas | Impresoras | Categorías | Descuentos
```

Add a 7th tab: **Notificaciones**. This requires:
1. Changing `grid-cols-6` to `grid-cols-7` in the `TabsList` className.
2. Adding `<TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>`.
3. Adding `<TabsContent value="notificaciones"><NotificacionesSettingsClient ... /></TabsContent>`.
4. The server component (`settings/page.tsx`) fetches branches via `getAllBranches()` from `masterService.ts` and passes them as `initialBranches` prop.

The `NotificacionesSettingsClient.tsx` renders one card per branch with a phone input and save button. The save calls a server action that patches `branches.whatsapp_number`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Conversation-based WhatsApp pricing | Per-message pricing (Meta) | July 2025 | Utility messages now very cheap (~$0.001); eliminates the "24-hour window" concern for most cases |
| Meta requires BSP (Business Solution Provider) approval | Meta Cloud API is self-serve via Meta for Developers | 2022 | Direct integration possible; Twilio still preferred for Node.js SDK quality |
| WhatsApp sandbox needs opt-in per recipient | Still required for sandbox | Current | Important pitfall for testing with socio numbers |

---

## Open Questions

1. **Does `POSClient` have access to `branchId` for the fire-and-forget call?**
   - What we know: `userProfile.branchId` exists as an optional field in `UserProfile`. `BranchContext` has `selectedBranch.id`.
   - What's unclear: Whether a cashier (role=Cajero, not Socio) will have `branchId` in their profile vs. the branch context.
   - Recommendation: Pass `branchId` from `BranchContext.selectedBranch?.id` inside `POSClient` — it already imports `useAuth`, just also add `useBranch()`.

2. **Does the Twilio free trial balance suffice for initial testing?**
   - What we know: Twilio gives ~$15 in trial credit. WhatsApp sandbox messages cost ~$0.005 each. That's ~3,000 test messages.
   - Recommendation: No issue for development. Document that production requires a paid Twilio account.

3. **Should the message include sales product detail (long list) or just totals?**
   - REQ-011 says "detalle de productos vendidos" is required.
   - Recommendation: Include the product list but cap at 20 lines to avoid WhatsApp message length limits (~65,000 chars, not a real concern) and readability. The `buildCorteMessage` template handles this.

---

## Validation Architecture

> `workflow.nyquist_validation` not found in `.planning/config.json` — treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no `jest.config.*`, `vitest.config.*`, or `__tests__/` found |
| Config file | None — see Wave 0 |
| Quick run command | N/A until framework installed |
| Full suite command | N/A until framework installed |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-008 | `whatsapp_number` column persists via server action | manual smoke | `curl PATCH branches` | Wave 0 |
| REQ-009 | Twilio send returns message SID without error | manual smoke (sandbox) | send to joined sandbox number | Wave 0 |
| REQ-010 | Fire-and-forget fetch is called after session close | unit (mock fetch) | Wave 0 | Wave 0 |
| REQ-011 | `buildCorteMessage` formats all required fields | unit | Wave 0 | Wave 0 |
| REQ-012 | Phone number Zod validation rejects invalid formats | unit | Wave 0 | Wave 0 |
| REQ-013 | API route returns `{ ok: false }` on Twilio error, does not throw 500 | unit | Wave 0 | Wave 0 |
| REQ-014 | Log row inserted in `whatsapp_notification_log` after send | manual smoke | query Supabase | Wave 0 |

### Wave 0 Gaps
- [ ] Install a test framework if unit tests are desired: `npm install -D vitest @vitest/ui` — covers `buildCorteMessage` unit tests
- [ ] `src/lib/services/__tests__/whatsappNotificationService.test.ts` — covers REQ-011, REQ-012
- [ ] Manual smoke test checklist: (1) join sandbox, (2) configure number, (3) run corte, (4) confirm receipt

*(Note: The project has no existing test infrastructure. The minimum viable validation for this phase is the manual smoke test against the Twilio sandbox. Unit tests for the pure `buildCorteMessage` function are low-cost to add and high-value.)*

---

## Environment Variables Required

Add to `.env.local` and Vercel project settings:
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_FROM=+14155238886   # Sandbox number; replace with registered number in production
```

---

## Sources

### Primary (HIGH confidence)
- [Twilio WhatsApp API overview](https://www.twilio.com/docs/whatsapp/api) — message structure, `whatsapp:` prefix requirement, Node.js SDK
- [Twilio WhatsApp Quickstart](https://www.twilio.com/docs/whatsapp/sandbox) — sandbox join flow, credential setup
- [Meta WhatsApp Pricing (official)](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing) — per-message pricing as of July 2025

### Secondary (MEDIUM confidence)
- [Twilio + Next.js WhatsApp Integration Guide 2025](https://www.sent.dm/resources/twilio-node-js-next-js-whatsapp-integration) — API route patterns verified against official docs
- [WhatsApp Business API Pricing 2026](https://www.flowcall.co/blog/whatsapp-business-api-pricing-2026) — utility template pricing ~$0.001
- [Chatarmin: Twilio WhatsApp API Pricing 2026](https://chatarmin.com/en/blog/twilio-whats-app-api) — sandbox vs production distinction

### Tertiary (LOW — codebase inspection only)
- `src/contexts/BranchContext.tsx` — confirmed `branches` table structure: `id, name, is_main, is_active, partner_id`
- `src/lib/services/masterService.ts` — confirmed `getAllBranches()` pattern
- `src/components/pos/POSClient.tsx` — confirmed `handleCloseDrawer` + `printCashCloseTicket` call sequence
- `src/lib/services/cashClosePdfService.ts` — confirmed data shape: `{ session, sales, expenses, incomes }`

---

## Metadata

**Confidence breakdown:**
- Standard stack (Twilio SDK): HIGH — official docs verified, Node.js SDK widely used
- Architecture (fire-and-forget API route): HIGH — matches existing `/api/*` patterns in project
- Database (branches column): HIGH — `branches` table confirmed via `BranchContext.tsx` and `masterService.ts`
- Message template: HIGH — pure function, no external dependencies
- Settings UI: HIGH — follows identical pattern to existing settings tabs
- Pitfalls: HIGH — sandbox join requirement is official Twilio documented behavior

**Research date:** 2026-03-10
**Valid until:** 2026-06-10 (90 days — Twilio API is stable; Meta pricing model may change but won't affect code)
