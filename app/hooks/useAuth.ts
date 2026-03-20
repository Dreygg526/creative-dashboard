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
        .single();

      if (error || !data) {
        // Profile doesn't exist yet — create a default one
        const { data: newProfile } = await supabase
          .from("profiles")
          .insert([{
            id: userId,
            email: userEmail,
            full_name: userEmail.split("@")[0],
            role: "Editor",
            is_active: true
          }])
          .select()
          .single();
        if (newProfile) setProfile(newProfile);
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error("fetchProfile error:", err);
    }
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;

    // Safety timeout — never stay stuck loading
const timeout = setTimeout(() => {
  setAuthLoading(false);
}, 3000);

supabase.auth.getSession().then(({ data: { session } }: any) => {
  clearTimeout(timeout);
  setUser(session?.user ?? null);
  if (session?.user) {
    fetchProfile(session.user.id, session.user.email).finally(() => {
      setAuthLoading(false);
    });
  } else {
    setAuthLoading(false);
  }
});

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: any) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email);
        } else {
          setProfile(null);
        }
        setAuthLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

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