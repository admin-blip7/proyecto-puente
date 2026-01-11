"use client";

import { createContext, useState, useEffect, ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabaseClient";
import { UserProfile } from "@/types";
import { getLogger } from "@/lib/logger";

const log = getLogger("AuthProvider");

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const buildUserProfile = (user: User | null): UserProfile | null => {
  if (!user) return null;
  const metadata = user.user_metadata ?? {};
  const name = (metadata.name as string) || (metadata.full_name as string) || user.email?.split("@")[0] || "Usuario";
  const metaRole = (metadata.role as string) || "Admin";
  const role: UserProfile["role"] = metaRole === "Cajero" ? "Cajero" : "Admin";

  return {
    uid: user.id,
    name,
    email: user.email ?? "",
    role,
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!supabase) {
      log.error("Supabase client is not configured");
      setLoading(false);
      return;
    }

    const syncSession = async () => {
      if (!supabase) {
        log.error("Supabase client is not available");
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        log.error("Error fetching session", error);

        // Si hay error de refresh token, limpiar la sesión
        if (error.message?.includes("Invalid Refresh Token") || error.message?.includes("Refresh Token Not Found")) {
          await supabase.auth.signOut({ scope: "local" });
        }

        setUser(null);
        setUserProfile(null);
        setLoading(false);
        if (pathname !== "/login" && pathname !== "/reset-password") {
          router.push("/login");
        }
        return;
      }

      const currentSession = data.session ?? null;
      const supabaseUser = currentSession?.user ?? null;
      setUser(supabaseUser);
      setUserProfile(buildUserProfile(supabaseUser));
      setLoading(false);

      if (supabaseUser && pathname === "/login") {
        router.push("/pos");
      }
      if (!supabaseUser && pathname !== "/login" && pathname !== "/reset-password" && pathname !== "/" && !pathname.startsWith("/products/")) {
        router.push("/login");
      }
    };

    syncSession();

    if (!supabase) {
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const supabaseUser = newSession?.user ?? null;
      setUser(supabaseUser);
      setUserProfile(buildUserProfile(supabaseUser));
      setLoading(false);

      // Si Supabase inicia una sesión de recuperación de contraseña, redirigimos a la página de restablecer
      if (_event === "PASSWORD_RECOVERY") {
        router.push("/reset-password");
        return;
      }

      if (supabaseUser) {
        if (pathname === "/login") {
          router.push("/pos");
        }
      } else if (pathname !== "/login" && pathname !== "/reset-password" && pathname !== "/" && !pathname.startsWith("/products/")) {
        router.push("/login");
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [router, pathname]);

  const signOut = async () => {
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      router.push("/login");
    } catch (error) {
      log.error("Error signing out", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="w-full max-w-sm space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
