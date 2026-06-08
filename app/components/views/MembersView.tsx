"use client";
import { UserProfile } from "../../hooks/useAuth";

interface Props {
  profiles: UserProfile[];
  currentUser: string;
}

const ROLE_STYLES: Record<string, string> = {
  "Founder": "bg-green-950 text-green-400 border-green-900",
  "Strategist": "bg-violet-950 text-violet-400 border-violet-900",
  "Editor": "bg-amber-950 text-amber-400 border-amber-900",
  "Graphic Designer": "bg-blue-950 text-blue-400 border-blue-900",
  "Content Coordinator": "bg-rose-950 text-rose-400 border-rose-900",
  "VA": "bg-[#1f1f23] text-gray-400 border-gray-700",
  "Media Buyer": "bg-cyan-950 text-cyan-400 border-cyan-900",
};

const ROLE_ORDER = ["Founder", "Strategist", "Content Coordinator", "Editor", "Graphic Designer", "VA", "Media Buyer"];
export default function MembersView({ profiles, currentUser }: Props) {
  const sorted = [...profiles].sort((a, b) => {
    const aIdx = ROLE_ORDER.indexOf(a.role) ?? 99;
    const bIdx = ROLE_ORDER.indexOf(b.role) ?? 99;
    return aIdx - bIdx;
  });

  const activeMembers = sorted.filter(p => p.is_active);
  const inactiveMembers = sorted.filter(p => !p.is_active);

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[900px] mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-100">Team Members</h2>
        <p className="text-gray-500 text-sm font-medium mt-0.5">Your creative team — manage roles in Settings</p>
      </div>

      {/* Role stats */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {ROLE_ORDER.filter(r => r !== "Founder").map(role => {
          const count = activeMembers.filter(m => m.role === role).length;
          if (count === 0) return null;
          return (
            <div key={role} className={`rounded-2xl px-4 py-3 text-center border flex-1 min-w-[100px] ${ROLE_STYLES[role] || "bg-[#1f1f23] text-gray-400 border-gray-700"}`}>
              <p className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-70">{role}</p>
              <p className="text-xl font-black">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Active Members */}
      <div className="space-y-3 mb-6">
        <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-3">Active ({activeMembers.length})</p>
        {activeMembers.length === 0 ? (
          <div className="border-2 border-dashed border-gray-800 rounded-2xl p-12 text-center text-gray-500 font-bold">
            No active members yet — invite them from Settings
          </div>
        ) : (
          activeMembers.map(member => (
            <div key={member.id} className="bg-[#141416] border border-gray-800 rounded-2xl p-5 flex items-center justify-between hover:border-gray-700 hover:shadow-sm transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border ${ROLE_STYLES[member.role] || "bg-[#1f1f23] text-gray-400 border-gray-700"}`}>
                  {member.full_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="font-black text-gray-100">
                    {member.full_name}
                    {member.email === profiles.find(p => p.full_name === currentUser)?.email && (
                      <span className="ml-2 text-[9px] font-black text-gray-200 bg-[#1f1f23] px-2 py-0.5 rounded-full">You</span>
                    )}
                  </p>
                  <p className="text-[11px] text-gray-500 font-medium">{member.email}</p>
                </div>
              </div>
              <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border ${ROLE_STYLES[member.role] || "bg-[#1f1f23] text-gray-400 border-gray-700"}`}>
                {member.role}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Inactive Members */}
      {inactiveMembers.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-3">Deactivated ({inactiveMembers.length})</p>
          {inactiveMembers.map(member => (
            <div key={member.id} className="bg-[#141416] border border-gray-800 rounded-2xl p-5 flex items-center justify-between opacity-40">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#1f1f23] flex items-center justify-center font-black text-gray-500 text-sm">
                  {member.full_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="font-black text-gray-400">{member.full_name}</p>
                  <p className="text-[11px] text-gray-500 font-medium">{member.email}</p>
                </div>
              </div>
              <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-[#1f1f23] text-gray-500 border border-gray-700">Deactivated</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}