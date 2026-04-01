"use client";
import { UserProfile } from "../../hooks/useAuth";

interface Props {
  profiles: UserProfile[];
  currentUser: string;
}

const ROLE_STYLES: Record<string, string> = {
  "Founder": "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  "Strategist": "bg-violet-500/20 text-violet-300 border-violet-500/30",
  "Editor": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "Graphic Designer": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "Content Coordinator": "bg-rose-500/20 text-rose-300 border-rose-500/30",
  "VA": "bg-white/10 text-slate-400 border-white/10",
};

const ROLE_ORDER = ["Founder", "Strategist", "Content Coordinator", "Editor", "Graphic Designer", "VA"];

export default function MembersView({ profiles, currentUser }: Props) {
  const sorted = [...profiles].sort((a, b) => {
    const aIdx = ROLE_ORDER.indexOf(a.role) ?? 99;
    const bIdx = ROLE_ORDER.indexOf(b.role) ?? 99;
    return aIdx - bIdx;
  });

  const activeMembers = sorted.filter(p => p.is_active);
  const inactiveMembers = sorted.filter(p => !p.is_active);

  return (
    <div className="flex-1 p-6 md:p-10 overflow-y-auto max-w-[900px] mx-auto w-full">

      <div className="mb-8">
        <h2 className="text-3xl font-black text-white mb-1">Team Members</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">
          Your creative team — manage roles in Settings
        </p>
      </div>

      <div className="flex gap-3 mb-8 flex-wrap">
        {ROLE_ORDER.filter(r => r !== "Founder").map(role => {
          const count = activeMembers.filter(m => m.role === role).length;
          if (count === 0) return null;
          return (
            <div key={role} className={`rounded-2xl px-4 py-3 text-center border flex-1 min-w-[100px] ${ROLE_STYLES[role] || "bg-white/10 text-slate-400 border-white/10"}`}>
              <p className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-70">{role}</p>
              <p className="text-xl font-black">{count}</p>
            </div>
          );
        })}
      </div>

      <div className="space-y-3 mb-8">
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4">
          Active ({activeMembers.length})
        </p>
        {activeMembers.length === 0 ? (
          <div className="border-2 border-dashed border-white/10 rounded-[20px] p-12 text-center text-slate-600 font-bold">
            No active members yet — invite them from Settings
          </div>
        ) : (
          activeMembers.map(member => (
            <div
              key={member.id}
              className="bg-white/5 border border-white/10 rounded-[20px] p-5 flex items-center justify-between hover:border-white/20 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${ROLE_STYLES[member.role] || "bg-white/10 text-slate-400"}`}>
                  {member.full_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="font-black text-slate-100">
                    {member.full_name}
                    {member.email === profiles.find(p => p.full_name === currentUser)?.email && (
                      <span className="ml-2 text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">You</span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">{member.email}</p>
                </div>
              </div>
              <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border-2 ${ROLE_STYLES[member.role] || "bg-white/10 text-slate-400 border-white/10"}`}>
                {member.role}
              </span>
            </div>
          ))
        )}
      </div>

      {inactiveMembers.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4">
            Deactivated ({inactiveMembers.length})
          </p>
          {inactiveMembers.map(member => (
            <div
              key={member.id}
              className="bg-white/5 border border-white/5 rounded-[20px] p-5 flex items-center justify-between opacity-40"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-black text-slate-500 text-sm">
                  {member.full_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="font-black text-slate-400">{member.full_name}</p>
                  <p className="text-[11px] text-slate-500 font-medium">{member.email}</p>
                </div>
              </div>
              <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-white/5 text-slate-500 border border-white/10">
                Deactivated
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}