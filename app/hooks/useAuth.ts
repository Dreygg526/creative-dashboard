"use client";
import { useState, useEffect, useCallback } from "react";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export function useAuth(supabase: any) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string, userEmail: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle(); // use maybeSingle instead of single — won't error if not found

      if (data) {
        setProfile(data);
      } else {
        // No profile found — create one
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert([{
            id: userId,
            email: userEmail,
            full_name: userEmail.split("@")[0],
            role: "Editor",
            is_active: true
          }])
          .select()
          .maybeSingle();

        if (newProfile) setProfile(newProfile);
        if (insertError) console.error("Insert profile error:", insertError);
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
          await fetchProfile(session.user.id, session.user.email);
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
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id, session.user.email);
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
  }, [supabase, fetchProfile]);

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
    updateUserRole, deactivateUser
  };
}