"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserRole } from "@/types";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
  avatar_url?: string;
}

interface UseAuthResult {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

/**
 * Hook for accessing the current authenticated user.
 * Falls back to a demo user when Supabase is not configured.
 */
export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Try to get session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        setUser({
          id: u.id,
          email: u.email ?? "",
          role: (u.user_metadata?.role as UserRole) ?? "purchasing_staff",
          full_name: u.user_metadata?.full_name,
          avatar_url: u.user_metadata?.avatar_url,
        });
      } else {
        // Fallback demo user for development
        setUser({
          id: "demo-user-id",
          email: "demo@wit.id",
          role: "purchasing_admin",
          full_name: "Demo Admin",
        });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user;
        setUser({
          id: u.id,
          email: u.email ?? "",
          role: (u.user_metadata?.role as UserRole) ?? "purchasing_staff",
          full_name: u.user_metadata?.full_name,
          avatar_url: u.user_metadata?.avatar_url,
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  }

  return { user, loading, signOut };
}
