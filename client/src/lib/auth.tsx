import { createContext, useContext, ReactNode, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "./queryClient";
import { useLocation } from "wouter";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  orgId: string;
  mfaEnabled: boolean;
  lastLogin: string | null;
  isSuperAdmin?: boolean;
};

type License = {
  id: string;
  orgId: string;
  plan: string;
  status: string;
  maxAssets: number;
  maxModels: number;
  maxConnectors: number;
  maxUsers: number;
  maxPolicies: number;
  maxProjects: number;
  startsAt: string;
  expiresAt: string;
  activatedBy: string | null;
  createdAt: string;
  notes: string | null;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  permissions: string[];
  accessibleProjectIds: string[];
  isSuperAdmin: boolean;
  impersonating: boolean;
  license: License | null;
  licenseStatus: "active" | "expired" | "none";
  login: (email: string, password: string, mfaCode?: string) => Promise<any>;
  signup: (data: { name: string; email: string; password: string; orgName: string }) => Promise<any>;
  logout: () => Promise<void>;
  stopImpersonation: () => Promise<void>;
  refetch: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: authData, isLoading, refetch } = useQuery<{ user: User; organization: any; permissions: string[]; accessibleProjectIds: string[]; isSuperAdmin: boolean; impersonating: boolean; license: License | null; licenseStatus: "active" | "expired" | "none" } | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const user = authData?.user ?? null;
  const permissions = authData?.permissions ?? [];
  const accessibleProjectIds = authData?.accessibleProjectIds ?? [];
  const isSuperAdmin = authData?.isSuperAdmin ?? false;
  const impersonating = authData?.impersonating ?? false;
  const license = authData?.license ?? null;
  const licenseStatus = authData?.licenseStatus ?? "none";

  const loginMutation = useMutation({
    mutationFn: async ({ email, password, mfaCode }: { email: string; password: string; mfaCode?: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", { email, password, mfaCode });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; password: string; orgName: string }) => {
      const res = await apiRequest("POST", "/api/auth/signup", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const login = async (email: string, password: string, mfaCode?: string) => {
    return loginMutation.mutateAsync({ email, password, mfaCode });
  };

  const signup = async (data: { name: string; email: string; password: string; orgName: string }) => {
    return signupMutation.mutateAsync(data);
  };

  const logout = async () => {
    await apiRequest("POST", "/api/auth/logout");
    queryClient.clear();
    setLocation("/login");
  };

  const stopImpersonation = async () => {
    await apiRequest("POST", "/api/superadmin/stop-impersonation");
    queryClient.clear();
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    setLocation("/superadmin");
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, permissions, accessibleProjectIds, isSuperAdmin, impersonating, license, licenseStatus, login, signup, logout, stopImpersonation, refetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function usePermission(permission: string): boolean {
  const { permissions } = useAuth();
  return useMemo(() => permissions.includes(permission), [permissions, permission]);
}

export function useHasAnyPermission(...perms: string[]): boolean {
  const { permissions } = useAuth();
  return useMemo(() => perms.some(p => permissions.includes(p)), [permissions, ...perms]);
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading, licenseStatus, isSuperAdmin } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [isLoading, user, setLocation]);

  useEffect(() => {
    if (!isLoading && user && licenseStatus === "expired" && !isSuperAdmin && location !== "/license-expired") {
      setLocation("/license-expired");
    }
  }, [isLoading, user, licenseStatus, isSuperAdmin, location, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
