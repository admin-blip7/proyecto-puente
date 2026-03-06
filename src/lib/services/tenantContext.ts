// Tipos y helpers sincrónicos - se pueden importar del cliente
// NO usar "next/headers" en este archivo

export type TenantContext =
  | {
      type: "global";
      partnerId: null;
      branchId: null;
      userId: string;
      role: string;
    }
  | {
      type: "tenant";
      partnerId: string;
      branchId: string | null;
      userId: string;
      role: string;
    };

const SELECTED_BRANCH_COOKIE_PREFIX = "selected_branch_";

// Helper sincrónico - NO es un Server Action
export const getSelectedBranchCookieName = (userId: string) =>
  `${SELECTED_BRANCH_COOKIE_PREFIX}${userId}`;

export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 dias
