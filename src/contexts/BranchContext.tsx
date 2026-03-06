"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getBranches } from "@/lib/services/branchService";
import { useAuth } from "@/lib/hooks";
import type { Branch, Partner } from "@/types";

interface BranchContextType {
  selectedBranch: Branch | null;
  selectedPartner: Partner | null;
  setBranch: (branch: Branch) => Promise<void>;
  switchBranch: (branchId: string) => Promise<void>;
  availableBranches: Branch[];
  isLoading: boolean;
  refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

const COOKIE_PREFIX = "selected_branch_";
const STORAGE_PREFIX = "selected_branch_";
const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;

const getBranchCookieName = (userId: string) => `${COOKIE_PREFIX}${userId}`;
const getStorageKey = (userId: string) => `${STORAGE_PREFIX}${userId}`;

const getCookieValue = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const row = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`));
  if (!row) return null;
  return decodeURIComponent(row.split("=")[1] ?? "");
};

const saveBranchSelection = (userId: string, branchId: string) => {
  if (typeof window === "undefined") return;

  localStorage.setItem(getStorageKey(userId), branchId);
  document.cookie = `${getBranchCookieName(userId)}=${encodeURIComponent(
    branchId
  )}; path=/; max-age=${ONE_WEEK_SECONDS}; samesite=lax`;
};

const clearBranchSelection = (userId: string) => {
  if (typeof window === "undefined") return;

  localStorage.removeItem(getStorageKey(userId));
  document.cookie = `${getBranchCookieName(userId)}=; path=/; max-age=0; samesite=lax`;
};

const getPersistedBranchId = (userId: string): string | null => {
  if (typeof window === "undefined") return null;

  const fromStorage = localStorage.getItem(getStorageKey(userId));
  if (fromStorage) return fromStorage;

  return getCookieValue(getBranchCookieName(userId));
};

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { userProfile } = useAuth();
  const [availableBranches, setAvailableBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadBranches = useCallback(async () => {
    if (!userProfile?.uid || userProfile.role !== "Socio" || !userProfile.partnerId) {
      setAvailableBranches([]);
      setSelectedBranch(null);
      return;
    }

    setIsLoading(true);
    try {
      const branches = await getBranches(userProfile.partnerId);
      setAvailableBranches(branches);

      const persistedBranchId =
        userProfile.selectedBranchId ??
        getPersistedBranchId(userProfile.uid) ??
        userProfile.branchId ??
        null;

      const branchFromPersisted = branches.find((branch) => branch.id === persistedBranchId) ?? null;
      if (branchFromPersisted) {
        setSelectedBranch(branchFromPersisted);
        saveBranchSelection(userProfile.uid, branchFromPersisted.id);
        return;
      }

      if (branches.length === 1) {
        setSelectedBranch(branches[0]);
        saveBranchSelection(userProfile.uid, branches[0].id);
        return;
      }

      clearBranchSelection(userProfile.uid);
      setSelectedBranch(null);
    } finally {
      setIsLoading(false);
    }
  }, [userProfile?.uid, userProfile?.role, userProfile?.partnerId, userProfile?.selectedBranchId, userProfile?.branchId]);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  const setBranch = useCallback(
    async (branch: Branch) => {
      if (!userProfile?.uid) return;
      saveBranchSelection(userProfile.uid, branch.id);
      setSelectedBranch(branch);
    },
    [userProfile?.uid]
  );

  const switchBranch = useCallback(
    async (branchId: string) => {
      const branch = availableBranches.find((item) => item.id === branchId);
      if (!branch) {
        throw new Error("Sucursal no disponible para el usuario actual");
      }
      await setBranch(branch);
    },
    [availableBranches, setBranch]
  );

  const contextValue = useMemo<BranchContextType>(
    () => ({
      selectedBranch,
      selectedPartner: null,
      setBranch,
      switchBranch,
      availableBranches,
      isLoading,
      refreshBranches: loadBranches,
    }),
    [selectedBranch, setBranch, switchBranch, availableBranches, isLoading, loadBranches]
  );

  return <BranchContext.Provider value={contextValue}>{children}</BranchContext.Provider>;
}

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error("useBranch must be used within BranchProvider");
  }
  return context;
};
