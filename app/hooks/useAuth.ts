"use client";
import { useState, useEffect, useCallback } from "react";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

const PROFILE_KEY = "creative_ops_profile";

function loadCachedProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

function saveCachedProfile(p: UserProfile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {}
}

function clearCachedProfile() {
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch {}
}

export function useAuth(supabase: any) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfileState] = useState<UserProfile | null>(loadCachedProfile);
  const [authLoading, setAuthLoading] = useState(true);

  const setProfile = useCallback((p: UserProfile | null) => {
    setProfileState(p);
    if (p) saveCachedProfile(p);
    else clearCachedProfile();
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .limit(1);

      if (error) {
        console.error("fetchProfile error:", error);
        return;
      }

      if (data && data.length > 0) {
        setProfile(data[0]);
      }
    } catch (err) {
      console.error("fetchProfile catch:", err);
    } finally {
      setAuthLoading(false);
    }
  }, [supabase, setProfile]);

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
          // If we already have cached profile for this user, use it immediately
          const cached = loadCachedProfile();
          if (cached && cached.id === session.user.id) {
            setProfileState(cached);
            setAuthLoading(false);
            // Still fetch in background to update
            fetchProfile(session.user.id);
          } else {
            await fetchProfile(session.user.id);
          }
        } else {
          setUser(null);
          setProfile(null);
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
          setAuthLoading(false);
          return;
        }

        if (event === "INITIAL_SESSION") return;
        if (event === "TOKEN_REFRESHED") return;

        if (session?.user) {
          setUser(session.user);
          const cached = loadCachedProfile();
          if (cached && cached.id === session.user.id) {
            setProfileState(cached);
            setAuthLoading(false);
          } else {
            await fetchProfile(session.user.id);
          }
        } else {
          setUser(null);
          setProfile(null);
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
  }, [supabase, fetchProfile, setProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
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
    signIn, signOut, resetPassword,
    inviteUser, getAllUsers,
    updateUserRole, deactivateUser,
    setProfile
  };
}