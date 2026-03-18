"use client";
import { useState } from "react";
import { Member } from "../../hooks/useMembers";

interface Props {
  members: Member[];
  onAdd: (name: string, role: string) => void;
  onDelete: (id: string) => void;
  currentUser: string;
}

const ROLES = ["Editor", "Copywriter", "Graphic Designer"];

const ROLE_STYLES: Record<string, string> = {
  "Editor": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Copywriter": "bg-violet-100 text-violet-700 border-violet-200",
  "Graphic Designer": "bg-amber-100 text-amber-700 border-amber-200"
};

export default function MembersView({ members, onAdd, onDelete, currentUser }: Props) {
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("Editor");
  const canManage = currentUser === "Founder" || currentUser === "Strategist";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAdd(newName.trim(), newRole);
    setNewName("");
    setNewRole("Editor");
  };

  return (
    <div className="flex-1 p-6 md:p-10 overflow-y-auto max-w-[900px] mx-auto w-full">

      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-800 mb-1">Team Members</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">
          Manage your creative team roster
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-8">
        {ROLES.map(role => (
          <div key={role} className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-center shadow-sm flex-1">
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">{role}</p>
            <p className="text-xl font-black text-slate-800">
              {members.filter(m => m.role === role).length}
            </p>
          </div>
        ))}
      </div>

      {/* Add Member Form */}
      {canManage && (
        <form onSubmit={handleSubmit} className="bg-white border-2 border-slate-100 rounded-[28px] p-6 mb-8 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Add New Member</p>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              required
              type="text"
              placeholder="Full name..."
              className="flex-1 border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-medium outline-none focus:border-indigo-400 transition-all placeholder:text-slate-300"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <select
              className="border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-black outline-none focus:border-indigo-400 transition-all md:w-52"
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
            >
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
            <button
              type="submit"
              className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm"
            >
              + Add
            </button>
          </div>
        </form>
      )}

      {/* Members List by Role */}
      {ROLES.map(role => {
        const roleMembers = members.filter(m => m.role === role);
        return (
          <div key={role} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${ROLE_STYLES[role]}`}>
                {role}
              </span>
              <span className="text-[10px] font-black text-slate-400">{roleMembers.length} members</span>
            </div>

            {roleMembers.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-[20px] p-8 text-center text-slate-300 font-bold text-sm">
                No {role}s added yet
              </div>
            ) : (
              <div className="space-y-3">
                {roleMembers.map(member => (
                  <div
                    key={member.id}
                    className="bg-white border-2 border-slate-100 rounded-[20px] p-5 flex items-center justify-between hover:border-slate-200 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-600 text-sm">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-slate-800">{member.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{member.role}</p>
                      </div>
                    </div>
                    {canManage && (
                      <button
                        onClick={() => onDelete(member.id)}
                        className="text-[10px] font-black text-slate-300 hover:text-rose-500 px-3 py-2 rounded-xl hover:bg-rose-50 transition-all uppercase tracking-widest"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}