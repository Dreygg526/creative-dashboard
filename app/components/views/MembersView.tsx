"use client";
import { UserProfile } from "../../hooks/useAuth";

interface Props {
  profiles: UserProfile[];
  currentUser: string;
}

const ROLE_STYLES: Record<string, string> = {
  "Founder": "bg-green-100 text-green-700 border-green-200",
  "Strategist": "bg-violet-100 text-violet-700 border-violet-200",
  "Editor": "bg-amber-100 text-amber-700 border-amber-200",
  "Graphic Designer": "bg-blue-100 text-blue-700 border-blue-200",
  "Content Coordinator": "bg-rose-100 text-rose-700 border-rose-200",
  "VA": "bg-gray-100 text-gray-600 border-gray-200",
  "Media Buyer": "bg-cyan-100 text-cyan-700 border-cyan-200",
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
        <h2 className="text-2xl font-black text-gray-900">Team Members</h2>
        <p className="text-gray-400 text-sm font-medium mt-0.5">Your creative team — manage roles in Settings</p>
      </div>

      {/* Role stats */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {ROLE_ORDER.filter(r => r !== "Founder").map(role => {
          const count = activeMembers.filter(m => m.role === role).length;
          if (count === 0) return null;
          return (
            <div key={role} className={`rounded-2xl px-4 py-3 text-center border flex-1 min-w-[100px] ${ROLE_STYLES[role] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
              <p className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-70">{role}</p>
              <p className="text-xl font-black">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Active Members */}
      <div className="space-y-3 mb-6">
        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3">Active ({activeMembers.length})</p>
        {activeMembers.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400 font-bold">
            No active members yet — invite them from Settings
          </div>
        ) : (
          activeMembers.map(member => (
            <div key={member.id} className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center justify-between hover:border-green-200 hover:shadow-sm transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${ROLE_STYLES[member.role] || "bg-gray-100 text-gray-600"}`}>
                  {member.full_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="font-black text-gray-800">
                    {member.full_name}
                    {member.email === profiles.find(p => p.full_name === currentUser)?.email && (
                      <span className="ml-2 text-[9px] font-black text-green-700 bg-green-100 px-2 py-0.5 rounded-full">You</span>
                    )}
                  </p>
                  <p className="text-[11px] text-gray-400 font-medium">{member.email}</p>
                </div>
              </div>
              <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border ${ROLE_STYLES[member.role] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                {member.role}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Inactive Members */}
      {inactiveMembers.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3">Deactivated ({inactiveMembers.length})</p>
          {inactiveMembers.map(member => (
            <div key={member.id} className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center justify-between opacity-40">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-black text-gray-400 text-sm">
                  {member.full_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="font-black text-gray-500">{member.full_name}</p>
                  <p className="text-[11px] text-gray-400 font-medium">{member.email}</p>
                </div>
              </div>
              <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-gray-100 text-gray-400 border border-gray-200">Deactivated</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}