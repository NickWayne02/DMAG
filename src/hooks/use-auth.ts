import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "super_admin" | "admin" | "brigadier" | "employee";

export interface AuthState {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  onlineUsers: string[];
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [rolesLoadedFor, setRolesLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const uid = session?.user?.id ?? null;
    if (!uid) {
      setRoles([]);
      setRolesLoadedFor(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .then(({ data }) => {
        if (cancelled) return;
        setRoles((data ?? []).map((r) => r.role as AppRole));
        setRolesLoadedFor(uid);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const uid = session?.user?.id ?? null;
  const loading = sessionLoading || (!!uid && rolesLoadedFor !== uid);

  return {
    session,
    user: session?.user ?? null,
    roles,
    loading,
    onlineUsers: [],
  };
}

export function primaryRole(roles: AppRole[]): AppRole {
  if (roles.includes("super_admin")) return "super_admin";
  if (roles.includes("admin")) return "admin";
  if (roles.includes("brigadier")) return "brigadier";
  return "employee";
}
