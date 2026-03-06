#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[verify] Checking required multi-branch files..."
required_files=(
  "src/lib/services/tenantContextService.ts"
  "src/lib/services/tenantQueryService.ts"
  "src/contexts/BranchContext.tsx"
  "src/components/branches/BranchSelectorDialog.tsx"
  "src/components/branches/BranchCard.tsx"
  "src/app/socio/seleccionar-sucursal/page.tsx"
  "supabase/migrations/20260222000001_create_user_branch_sessions.sql"
  "supabase/migrations/20260222000002_branch_context_and_stock_sync.sql"
)

for f in "${required_files[@]}"; do
  [[ -f "$f" ]] || { echo "[verify][error] Missing file: $f"; exit 1; }
done

echo "[verify] Checking key SQL objects..."
rg -n "CREATE TABLE IF NOT EXISTS public.user_branch_sessions" supabase/migrations/20260222000001_create_user_branch_sessions.sql >/dev/null
rg -n "CREATE OR REPLACE VIEW public.stock_actual" supabase/migrations/20260222000002_branch_context_and_stock_sync.sql >/dev/null
rg -n "CREATE TRIGGER trg_sync_branch_stock_from_kardex" supabase/migrations/20260222000002_branch_context_and_stock_sync.sql >/dev/null
rg -n "CREATE OR REPLACE FUNCTION public.set_branch_context" supabase/migrations/20260222000002_branch_context_and_stock_sync.sql >/dev/null

echo "[verify] Checking tenant-aware service coverage..."
services=(
  "src/lib/services/productService.ts"
  "src/lib/services/salesService.ts"
  "src/lib/services/cashSessionService.ts"
  "src/lib/services/kardexService.ts"
  "src/lib/services/financeService.ts"
  "src/lib/services/incomeService.ts"
  "src/lib/services/repairService.ts"
  "src/lib/services/crmService.ts"
  "src/lib/services/accountService.ts"
  "src/lib/services/debtService.ts"
  "src/lib/services/transferService.ts"
  "src/lib/services/warrantyService.ts"
  "src/lib/services/purchaseOrderService.ts"
)

for s in "${services[@]}"; do
  rg -n "branch_id|branchId" "$s" >/dev/null || {
    echo "[verify][error] No branch context usage found in $s"
    exit 1
  }
done

echo "[verify] Multi-branch checks passed."
