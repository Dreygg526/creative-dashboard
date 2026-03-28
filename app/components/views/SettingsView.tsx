"use client";
import { useState, useEffect } from "react";
import { UserProfile } from "../../hooks/useAuth";

interface Props {
  currentProfile: UserProfile;
  onInviteUser: (email: string, fullName: string, role: string) => Promise<void>;
  onUpdateRole: (userId: string, role: string) => Promise<void>;
  onDeactivateUser: (userId: string) => Promise<void>;
  getAllUsers: () => Promise<UserProfile[]>;
  supabase: any;
}

const ROLES = ["Founder", "Strategist", "Editor", "Graphic Designer", "Content Coordinator", "VA"];

const ROLE_STYLES: Record<string, string> = {
  "Founder": "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  "Strategist": "bg-violet-500/20 text-violet-300 border-violet-500/30",
  "Editor": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "Graphic Designer": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "Content Coordinator": "bg-rose-500/20 text-rose-300 border-rose-500/30",
  "VA": "bg-white/10 text-slate-400 border-white/10",
};

export default function SettingsView({
  currentProfile, onInviteUser, onUpdateRole,
  onDeactivateUser, getAllUsers, supabase
}: Props) {
  const isFounder = currentProfile.role === "Founder";

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteRole, setInviteRole] = useState("Editor");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const [products, setProducts] = useState<string[]>([]);
  const [newProduct, setNewProduct] = useState("");
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [productMsg, setProductMsg] = useState("");

  useEffect(() => {
    loadUsers();
    loadProducts();
  }, []);

  const loadUsers = async () => {
    const data = await getAllUsers();
    setUsers(data);
  };

  const loadProducts = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "products")
      .single();
    if (data?.value) {
      setProducts(Array.isArray(data.value) ? data.value : []);
    }
  };

  const saveProducts = async (updated: string[]) => {
    if (!supabase) return;
    setIsSavingProduct(true);
    await supabase
      .from("settings")
      .upsert({ key: "products", value: updated, updated_at: new Date().toISOString() });
    setProducts(updated);
    setIsSavingProduct(false);
    setProductMsg("Saved!");
    setTimeout(() => setProductMsg(""), 2000);
  };

  const handleAddProduct = async () => {
    const trimmed = newProduct.trim();
    if (!trimmed || products.includes(trimmed)) return;
    const updated = [...products, trimmed];
    setNewProduct("");
    await saveProducts(updated);
  };

  const handleRemoveProduct = async (product: string) => {
    if (!confirm(`Remove "${product}" from the product list?`)) return;
    const updated = products.filter(p => p !== product);
    await saveProducts(updated);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setInviteError("");
    try {
      await onInviteUser(inviteEmail, inviteFullName, inviteRole);
      setInviteSuccess(true);
      setInviteEmail("");
      setInviteFullName("");
      setInviteRole("Editor");
      await loadUsers();
      setTimeout(() => {
        setInviteSuccess(false);
        setIsInviteOpen(false);
      }, 2000);
    } catch (err: any) {
      setInviteError(err.message || "Failed to invite user");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    await onUpdateRole(userId, role);
    await loadUsers();
  };

  const handleDeactivate = async (userId: string) => {
    if (!confirm("Are you sure you want to deactivate this user?")) return;
    await onDeactivateUser(userId);
    await loadUsers();
  };

  const handleSaveName = async (userId: string) => {
    if (!editingNameValue.trim()) return;
    setIsSavingName(true);

    const oldName = users.find(u => u.id === userId)?.full_name || "";
    const newName = editingNameValue.trim();

    // Update profile name
    await supabase
      .from("profiles")
      .update({ full_name: newName })
      .eq("id", userId);

    // Sync all ads that reference the old name
    if (oldName && oldName !== newName) {
      await supabase.from("ads").update({ assigned_editor: newName }).eq("assigned_editor", oldName);
      await supabase.from("ads").update({ assigned_copywriter: newName }).eq("assigned_copywriter", oldName);
    }

    setEditingNameId(null);
    setEditingNameValue("");
    setIsSavingName(false);
    await loadUsers();

    // If founder changed their own name, reload to refresh currentUser
    if (userId === currentProfile.id) {
      window.location.reload();
    }
  };

  return (
    <div className="flex-1 p-6 md:p-10 overflow-y-auto max-w-[900px] mx-auto w-full">

      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white mb-1">Settings</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">
            Manage team accounts and access
          </p>
        </div>
        {isFounder && (
          <button
            onClick={() => setIsInviteOpen(!isInviteOpen)}
            className="bg-indigo-500 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-400 transition-all shadow-sm"
          >
            + Invite User
          </button>
        )}
      </div>

      {/* ── PRODUCT MANAGER ── */}
      {isFounder && (
        <div className="bg-white/5 border border-white/10 rounded-[28px] p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Product List</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">These appear as dropdown options when creating or editing ads</p>
            </div>
            {productMsg && (
              <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                ✓ {productMsg}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {products.length === 0 ? (
              <p className="text-[11px] text-slate-600 font-bold italic">No products added yet</p>
            ) : (
              products.map(p => (
                <div key={p} className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl group">
                  <span className="text-[11px] font-black text-slate-300">{p}</span>
                  <button
                    onClick={() => handleRemoveProduct(p)}
                    className="text-[9px] text-slate-600 hover:text-rose-400 font-black opacity-0 group-hover:opacity-100 transition-all ml-1"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add new product (e.g. NAC)"
              className="flex-1 border-2 border-white/10 bg-white/5 p-3 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600 text-slate-100"
              value={newProduct}
              onChange={e => setNewProduct(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddProduct(); } }}
            />
            <button
              onClick={handleAddProduct}
              disabled={!newProduct.trim() || isSavingProduct}
              className="bg-indigo-500 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-400 transition-all disabled:opacity-40 shadow-sm"
            >
              {isSavingProduct ? "..." : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* Invite Form */}
      {isInviteOpen && isFounder && (
        <form onSubmit={handleInvite} className="bg-white/5 border border-white/10 rounded-[28px] p-6 mb-8">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">
            Invite New Team Member
          </p>

          {inviteSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 mb-4">
              <p className="text-emerald-400 font-black text-sm">
                ✓ Invite sent! They will receive an email to set their password.
              </p>
            </div>
          )}

          {inviteError && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mb-4">
              <p className="text-rose-400 font-bold text-sm">{inviteError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Full Name</label>
              <input
                required
                type="text"
                placeholder="John Doe"
                className="w-full border-2 border-white/10 bg-white/5 p-3 rounded-2xl text-sm font-medium outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600 text-slate-100"
                value={inviteFullName}
                onChange={e => setInviteFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Email</label>
              <input
                required
                type="email"
                placeholder="john@example.com"
                className="w-full border-2 border-white/10 bg-white/5 p-3 rounded-2xl text-sm font-medium outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600 text-slate-100"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Role</label>
              <select
                className="w-full border-2 border-white/10 bg-[#2a2b2c] p-3 rounded-2xl text-sm font-black outline-none focus:border-indigo-500 transition-all text-slate-100"
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
              >
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => setIsInviteOpen(false)}
              className="text-sm font-bold text-slate-500 px-4 py-2 hover:bg-white/5 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isInviting}
              className="bg-indigo-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-400 transition-all disabled:opacity-50"
            >
              {isInviting ? "Sending..." : "Send Invite"}
            </button>
          </div>
        </form>
      )}

      {/* Users List */}
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4">
          Team Members ({users.length})
        </p>
        {users.length === 0 ? (
          <div className="border-2 border-dashed border-white/10 rounded-[20px] p-12 text-center text-slate-600 font-bold">
            No team members yet
          </div>
        ) : (
          users.map(u => (
            <div
              key={u.id}
              className={`border rounded-[20px] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                !u.is_active
                  ? "opacity-50 bg-white/5 border-white/5"
                  : "bg-white/5 border-white/10 hover:border-white/20"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center font-black text-indigo-400 text-sm">
                  {u.full_name?.charAt(0)?.toUpperCase() || u.email?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  {editingNameId === u.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        className="border-2 border-indigo-500 bg-white/5 px-3 py-1.5 rounded-xl text-sm font-black outline-none text-slate-100 w-40"
                        value={editingNameValue}
                        onChange={e => setEditingNameValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleSaveName(u.id);
                          if (e.key === "Escape") { setEditingNameId(null); setEditingNameValue(""); }
                        }}
                      />
                      <button
                        onClick={() => handleSaveName(u.id)}
                        disabled={isSavingName}
                        className="text-[10px] font-black text-white bg-indigo-500 px-3 py-1.5 rounded-xl hover:bg-indigo-400 transition-all disabled:opacity-40"
                      >
                        {isSavingName ? "..." : "Save"}
                      </button>
                      <button
                        onClick={() => { setEditingNameId(null); setEditingNameValue(""); }}
                        className="text-[10px] font-black text-slate-500 hover:text-slate-300 px-2 py-1.5 rounded-xl"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <p className="font-black text-slate-100">{u.full_name || "No name"}</p>
                      {isFounder && (
                        <button
                          onClick={() => { setEditingNameId(u.id); setEditingNameValue(u.full_name || ""); }}
                          className="text-[9px] text-slate-600 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all font-black"
                          title="Edit name"
                        >
                          ✏️
                        </button>
                      )}
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500 font-medium">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!u.is_active && (
                  <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-white/5 text-slate-500 border border-white/10">
                    Deactivated
                  </span>
                )}
                {isFounder && u.id !== currentProfile.id ? (
                  <>
                    <select
                      value={u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border-2 outline-none cursor-pointer bg-[#2a2b2c] ${ROLE_STYLES[u.role] || "text-slate-400 border-white/10"}`}
                    >
                      {ROLES.map(r => <option key={r}>{r}</option>)}
                    </select>
                    {u.is_active && (
                      <button
                        onClick={() => handleDeactivate(u.id)}
                        className="text-[10px] font-black text-slate-600 hover:text-rose-400 px-3 py-2 rounded-xl hover:bg-rose-500/10 transition-all uppercase tracking-widest"
                      >
                        Remove
                      </button>
                    )}
                  </>
                ) : (
                  <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border-2 ${ROLE_STYLES[u.role] || "text-slate-400 border-white/10"}`}>
                    {u.role}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}