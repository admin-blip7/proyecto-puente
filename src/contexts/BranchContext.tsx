"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { sanitizeBranchTimeZone } from "@/lib/branchTimeZone";

interface Branch {
    id: string;
    name: string;
    isMain?: boolean;
    timezone?: string;
}

interface BranchContextType {
    selectedBranch: Branch | null;
    availableBranches: Branch[];
    isLoading: boolean;
    setBranch: (branch: Branch | null) => Promise<void>;
    setSelectedBranch: (branch: Branch | null) => void;
    reloadBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

const getBranchCookieKey = (userId: string) => `selected_branch_${userId}`;

const persistSelectedBranch = (userId: string, branchId: string | null) => {
    if (typeof window === "undefined") return;
    const key = getBranchCookieKey(userId);

    if (branchId) {
        window.localStorage.setItem(key, branchId);
        document.cookie = `${key}=${encodeURIComponent(branchId)}; path=/; max-age=2592000; samesite=lax`;
        return;
    }

    window.localStorage.removeItem(key);
    document.cookie = `${key}=; path=/; max-age=0; samesite=lax`;
};

export function BranchProvider({ children }: { children: ReactNode }) {
    const [selectedBranch, setSelectedBranchState] = useState<Branch | null>(null);
    const [availableBranches, setAvailableBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const reloadBranches = useCallback(async () => {
        setIsLoading(true);
        try {
            if (!supabase) {
                setAvailableBranches([]);
                setSelectedBranchState(null);
                return;
            }

            const { data: sessionData } = await supabase.auth.getSession();
            const user = sessionData.session?.user;

            if (!user) {
                setAvailableBranches([]);
                setSelectedBranchState(null);
                return;
            }

            const partnerId = user.user_metadata?.partner_id as string | undefined;
            if (!partnerId) {
                setAvailableBranches([]);
                setSelectedBranchState(null);
                return;
            }

            let { data, error } = await supabase
                .from("branches")
                .select("id, name, is_main, timezone")
                .eq("partner_id", partnerId)
                .eq("is_active", true)
                .order("is_main", { ascending: false })
                .order("name", { ascending: true });

            if (error && /timezone/i.test(error.message || "")) {
                const fallback = await supabase
                    .from("branches")
                    .select("id, name, is_main")
                    .eq("partner_id", partnerId)
                    .eq("is_active", true)
                    .order("is_main", { ascending: false })
                    .order("name", { ascending: true });

                data = fallback.data;
                error = fallback.error;
            }

            if (error) {
                throw error;
            }

            const branches: Branch[] = (data || []).map((row: any) => ({
                id: row.id,
                name: row.name,
                isMain: row.is_main ?? false,
                timezone: sanitizeBranchTimeZone(row.timezone),
            }));

            setAvailableBranches(branches);

            const key = getBranchCookieKey(user.id);
            const storedBranchId =
                typeof window !== "undefined" ? window.localStorage.getItem(key) : null;

            const nextBranch =
                branches.find((branch) => branch.id === storedBranchId) ||
                branches[0] ||
                null;

            setSelectedBranchState(nextBranch);
            persistSelectedBranch(user.id, nextBranch?.id ?? null);
        } catch (error) {
            console.error("Error loading branches:", error);
            setAvailableBranches([]);
            setSelectedBranchState(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void reloadBranches();

        if (!supabase) return;
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            void reloadBranches();
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [reloadBranches]);

    const setBranch = useCallback(async (branch: Branch | null) => {
        setSelectedBranchState(branch);
        try {
            if (!supabase) return;
            const { data: sessionData } = await supabase.auth.getSession();
            const userId = sessionData.session?.user?.id;
            if (!userId) return;
            persistSelectedBranch(userId, branch?.id ?? null);
        } catch (error) {
            console.error("Error persisting selected branch:", error);
        }
    }, []);

    const setSelectedBranch = useCallback((branch: Branch | null) => {
        void setBranch(branch);
    }, [setBranch]);

    return (
        <BranchContext.Provider
            value={{
                selectedBranch,
                availableBranches,
                isLoading,
                setBranch,
                setSelectedBranch,
                reloadBranches,
            }}
        >
            {children}
        </BranchContext.Provider>
    );
}

export function useBranch() {
    const context = useContext(BranchContext);
    if (!context) {
        throw new Error("useBranch must be used within a BranchProvider");
    }
    return context;
}
