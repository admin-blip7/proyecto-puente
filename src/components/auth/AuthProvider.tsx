"use client";

import { createContext, useState, useEffect, ReactNode, useRef } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabaseClient";
import { UserProfile } from "@/types";
import { getLogger } from "@/lib/logger";

const log = getLogger("AuthProvider");

// Track if we've already redirected to login to avoid loops
let hasRedirectedToLogin = false;
const ADMIN_ACCESS_TOKEN_COOKIE = "tienda_admin_access_token";

const syncAdminAccessCookie = (session: Session | null) => {
  if (typeof document === "undefined") return;

  if (!session?.access_token) {
    document.cookie = `${ADMIN_ACCESS_TOKEN_COOKIE}=; path=/; max-age=0; samesite=lax`;
    return;
  }

  document.cookie = `${ADMIN_ACCESS_TOKEN_COOKIE}=${encodeURIComponent(
    session.access_token
  )}; path=/; max-age=28800; samesite=lax`;
};

const getPostLoginRedirect = (role?: string) => {
  if (typeof window === "undefined") return "/pos";
  const nextParam = new URLSearchParams(window.location.search).get("next");
  if (nextParam && nextParam.startsWith("/")) {
    return nextParam;
  }

  if (role === 'Socio') {
    return "/socio/dashboard";
  }

  if (role === 'Cliente') {
    return "/tienda/cuenta/perfil";
  }

  return "/pos";
};

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
  const metadataRole = String(metadata.role || "").toLowerCase();
  const appRole = String(user.app_metadata?.role || "").toLowerCase();
  const resolvedRole = metadataRole || appRole || "admin";
  let role: UserProfile["role"] = "Admin";

  if (resolvedRole === "cajero") role = "Cajero";
  if (resolvedRole === "cliente") role = "Cliente";
  if (resolvedRole === "socio") role = "Socio";

  const partnerId =
    (metadata.partner_id as string | undefined) ||
    (user.app_metadata?.partner_id as string | undefined);
  const branchId =
    (metadata.branch_id as string | undefined) ||
    (user.app_metadata?.branch_id as string | undefined);

  return {
    uid: user.id,
    name,
    email: user.email ?? "",
    role,
    partnerId,
    branchId,
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const authCheckDone = useRef(false);
  const retryCount = useRef(0);
  const MAX_RETRIES = 2;

  // Public paths that don't require authentication
  const isPublicPath = pathname === "/login" ||
    pathname === "/reset-password" ||
    pathname === "/" ||
    pathname.startsWith("/products/") ||
    pathname === "/socio/registro";

  useEffect(() => {
    if (!supabase) {
      log.error("Supabase client is not configured");
      setLoading(false);
      setConnectionError(true);
      return;
    }

    const syncSession = async () => {
      if (authCheckDone.current && retryCount.current >= MAX_RETRIES) {
        return;
      }

      if (!supabase) {
        log.error("Supabase client is not available");
        setLoading(false);
        setConnectionError(true);
        return;
      }

      // Only show loading spinner on the very first auth check.
      // On subsequent runs (e.g. pathname changes), refresh silently so the
      // existing page content is not unmounted/remounted on every navigation.
      if (!authCheckDone.current) {
        setLoading(true);
      }
      setConnectionError(false);

      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          log.error("Error fetching session", error);
          syncAdminAccessCookie(null);

          // Si hay error de refresh token o de conexión, limpiar la sesión localmente
          if (error.message?.includes("Invalid Refresh Token") ||
            error.message?.includes("Refresh Token Not Found") ||
            error.message?.includes("Failed to fetch")) {
            // Solo limpiar storage local, no hacer logout en el servidor si no hay conexión
            if (typeof window !== 'undefined') {
              localStorage.removeItem(`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, '').replace(/\..*$/, '')}-auth-token`);
            }
          }

          setUser(null);
          setUserProfile(null);
          retryCount.current++;

          // Solo redirigir si no es un path público y no hemos redirigido ya
          if (!isPublicPath && !hasRedirectedToLogin) {
            hasRedirectedToLogin = true;
            router.push("/login");
          }
        } else {
          const currentSession = data.session ?? null;
          const supabaseUser = currentSession?.user ?? null;
          syncAdminAccessCookie(currentSession);
          setUser(supabaseUser);
          setUserProfile(buildUserProfile(supabaseUser));
          setConnectionError(false);

          if (supabaseUser && pathname === "/login") {
            const profile = buildUserProfile(supabaseUser);
            router.push(getPostLoginRedirect(profile?.role));
          }
          // Solo redirigir si no hay usuario, no es path público, y no hemos redirigido
          else if (!supabaseUser && !isPublicPath && !hasRedirectedToLogin) {
            hasRedirectedToLogin = true;
            router.push("/login");
          }
        }
      } catch (err) {
        log.error("Unexpected error during session sync", err);
        setConnectionError(true);
      } finally {
        setLoading(false);
        authCheckDone.current = true;
      }
    };

    syncSession();

    if (!supabase) {
      return;
    }

    // Debounce the auth state change handler to prevent rapid calls
    let authChangeTimeout: NodeJS.Timeout;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      clearTimeout(authChangeTimeout);
      authChangeTimeout = setTimeout(() => {
        const supabaseUser = newSession?.user ?? null;
        syncAdminAccessCookie(newSession ?? null);
        setUser(supabaseUser);
        setUserProfile(buildUserProfile(supabaseUser));
        setConnectionError(false);

        // Si Supabase inicia una sesión de recuperación de contraseña, redirigimos a la página de restablecer
        if (_event === "PASSWORD_RECOVERY") {
          router.push("/reset-password");
          return;
        }

        if (supabaseUser) {
          hasRedirectedToLogin = false;
          if (pathname === "/login") {
            const profile = buildUserProfile(supabaseUser);
            router.push(getPostLoginRedirect(profile?.role));
          }
        } else if (!isPublicPath && !hasRedirectedToLogin) {
          hasRedirectedToLogin = true;
          router.push("/login");
        }
      }, 100);
    });

    return () => {
      clearTimeout(authChangeTimeout);
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
