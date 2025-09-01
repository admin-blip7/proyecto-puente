"use client";

import { createContext, useState, useEffect, ReactNode } from "react";
import { User } from "firebase/auth";
import { UserProfile } from "@/types";
import { usePathname, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MOCK_USER: User = {
  uid: 'mock-user-uid',
  email: 'admin@tienda.com',
  displayName: 'Admin de Tienda',
  photoURL: null,
  phoneNumber: null,
  providerId: 'password',
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  refreshToken: '',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => '',
  getIdTokenResult: async () => ({} as any),
  reload: async () => {},
  toJSON: () => ({}),
};

const MOCK_USER_PROFILE: UserProfile = {
  uid: 'mock-user-uid',
  name: 'Admin de Tienda',
  email: 'admin@tienda.com',
  role: 'Admin',
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Simulate user being logged in
    setLoading(true);
    setUser(MOCK_USER);
    setUserProfile(MOCK_USER_PROFILE);
    if (pathname === '/login') {
      router.push('/');
    }
    setLoading(false);
  }, [router, pathname]);

  const signOut = async () => {
    // For mock, just clear state and redirect
    setUser(null);
    setUserProfile(null);
    router.push("/login");
  };

  if (loading && pathname !== '/login') {
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

  // A special case for login page to avoid redirect loop
  if (pathname === '/login' && !user) {
    return (
        <AuthContext.Provider value={{ user, userProfile, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    )
  }
  
  // If we are not on login page and not logged in, we do nothing to let the login page handle it
  // This logic is simplified because we are mocking the auth state.
  if (!user && pathname !== '/login') {
      router.push('/login');
      return null;
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading: false, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
