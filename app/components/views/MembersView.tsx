"use client";
import { UserProfile } from "../../hooks/useAuth";

interface Props {
  profiles: UserProfile[];
  currentUser: string;
}

const ROLE_STYLES: Record<string, string> = {
  "Founder": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Strategist": "bg-violet-100 text-violet-700 border-violet-200",
  "Editor": "bg-amber-100 text-amber-700 border-amber-200",
  "Graphic Designer": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Content Coordinator": "bg-rose-100 text-rose-700 border-rose-200",
  "VA": "bg-slate-100 text-slate-600 border-slate-200",
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

      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-800 mb-1">Team Members</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">
          Your creative team — manage roles in Settings
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-8 flex-wrap">
        {ROLE_ORDER.filter(r => r !== "Founder").map(role => {
          const count = activeMembers.filter(m => m.role === role).length;
          if (count === 0) return null;
          return (
            <div key={role} className={`rounded-2xl px-4 py-3 text-center border flex-1 min-w-[100px] ${ROLE_STYLES[role] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
              <p className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-70">{role}</p>
              <p className="text-xl font-black">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Active Members */}
      <div className="space-y-3 mb-8">
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">
          Active ({activeMembers.length})
        </p>
        {activeMembers.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-[20px] p-12 text-center text-slate-300 font-bold">
            No active members yet — invite them from Settings
          </div>
        ) : (
          activeMembers.map(member => (
            <div
              key={member.id}
              className="bg-white border-2 border-slate-100 rounded-[20px] p-5 flex items-center justify-between hover:border-slate-200 transition-all shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${ROLE_STYLES[member.role] || "bg-slate-100 text-slate-600"}`}>
                  {member.full_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="font-black text-slate-800">
                    {member.full_name}
                    {member.email === profiles.find(p => p.full_name === currentUser)?.email && (
                      <span className="ml-2 text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">You</span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">{member.email}</p>
                </div>
              </div>
              <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border-2 ${ROLE_STYLES[member.role] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                {member.role}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Inactive Members */}
      {inactiveMembers.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">
            Deactivated ({inactiveMembers.length})
          </p>
          {inactiveMembers.map(member => (
            <div
              key={member.id}
              className="bg-white border-2 border-slate-100 rounded-[20px] p-5 flex items-center justify-between opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 text-sm">
                  {member.full_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="font-black text-slate-500">{member.full_name}</p>
                  <p className="text-[11px] text-slate-400 font-medium">{member.email}</p>
                </div>
              </div>
              <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-400 border border-slate-200">
                Deactivated
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}