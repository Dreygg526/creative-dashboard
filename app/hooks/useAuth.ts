"use client";
import { useState, useEffect, useCallback } from "react";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

const PROFILE_CACHE_KEY = "creative_ops_profile";

export function useAuth(supabase: any) {
  // Load cached profile immediately so UI never flashes
  const getCachedProfile = (): UserProfile | null => {
    if (typeof window === "undefined") return null;
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  };

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(getCachedProfile);
  const [authLoading, setAuthLoading] = useState(!getCachedProfile());

  const saveProfileToCache = (p: UserProfile) => {
    try {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p));
    } catch {}
  };

  const clearProfileCache = () => {
    try {
      localStorage.removeItem(PROFILE_CACHE_KEY);
    } catch {}
  };

  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .limit(1);

      if (data && data.length > 0) {
        setProfile(data[0]);
        saveProfileToCache(data[0]);
      }
    } catch (err) {
      console.error("fetchProfile error:", err);
    } finally {
      setAuthLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          clearProfileCache();
          setAuthLoading(false);
        }
      } catch (err) {
        console.error("initAuth error:", err);
        if (mounted) setAuthLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
        if (!mounted) return;

        if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          clearProfileCache();
          setAuthLoading(false);
          return;
        }

        if (event === "INITIAL_SESSION") return;

        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          clearProfileCache();
          setAuthLoading(false);
        }
      }
    );

    const timeout = setTimeout(() => {
      if (mounted) setAuthLoading(false);
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    clearProfileCache();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    if (error) throw error;
  };

  const inviteUser = async (email: string, fullName: string, role: string) => {
    if (!supabase) return;
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, role }
    });
    if (error) throw error;
    if (data?.user) {
      await supabase.from("profiles").insert([{
        id: data.user.id,
        email,
        full_name: fullName,
        role,
        is_active: true
      }]);
    }
  };

  const getAllUsers = async (): Promise<UserProfile[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) return [];
    return data || [];
  };

  const updateUserRole = async (userId: string, role: string) => {
    if (!supabase) return;
    await supabase.from("profiles").update({ role }).eq("id", userId);
  };

  const deactivateUser = async (userId: string) => {
    if (!supabase) return;
    await supabase.from("profiles").update({ is_active: false }).eq("id", userId);
  };

  return {
    user, profile, authLoading,
    signIn, setProfile,
    signOut, resetPassword,
    inviteUser, getAllUsers,
    updateUserRole, deactivateUser
  };
}