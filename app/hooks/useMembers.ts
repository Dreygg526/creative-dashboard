import { useState, useCallback } from "react";

export interface Member {
  id: string;
  name: string;
  role: string;
  created_at: string;
}

export function useMembers(supabase: any) {
  const [members, setMembers] = useState<Member[]>([]);

  const fetchMembers = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .order("created_at", { ascending: true });
    if (!error) setMembers(data || []);
  }, [supabase]);

  const addMember = async (name: string, role: string) => {
    if (!supabase || !name.trim()) return;
    const { error } = await supabase.from("members").insert([{
      name: name.trim(),
      role
    }]);
    if (!error) fetchMembers();
  };

  const deleteMember = async (id: string) => {
    if (!supabase) return;
    await supabase.from("members").delete().eq("id", id);
    fetchMembers();
  };

  const membersByRole = (role: string) =>
    members.filter(m => m.role === role);

  const editors = members.filter(m => m.role === "Editor").map(m => m.name);
  const copywriters = members.filter(m => m.role === "Copywriter").map(m => m.name);
  const designers = members.filter(m => m.role === "Graphic Designer").map(m => m.name);

  return {
    members, fetchMembers,
    addMember, deleteMember,
    membersByRole,
    editors, copywriters, designers
  };
}