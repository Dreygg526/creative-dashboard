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

const ROLES = ["Founder", "Strategist", "Editor", "Graphic Designer", "Content Coordinator", "VA", "Media Buyer"];

const ROLE_STYLES: Record<string, string> = {
  "Founder": "bg-green-100 text-green-700 border-green-200",
  "Strategist": "bg-violet-100 text-violet-700 border-violet-200",
  "Editor": "bg-amber-100 text-amber-700 border-amber-200",
  "Graphic Designer": "bg-blue-100 text-blue-700 border-blue-200",
  "Content Coordinator": "bg-rose-100 text-rose-700 border-rose-200",
  "VA": "bg-gray-100 text-gray-600 border-gray-200",
  "Media Buyer": "bg-cyan-100 text-cyan-700 border-cyan-200",
};

export default function SettingsView({ currentProfile, onInviteUser, onUpdateRole, onDeactivateUser, getAllUsers, supabase }: Props) {
  const isFounder = currentProfile.role === "Founder";
  const isStrategist = currentProfile.role === "Strategist";
  const isMediaBuyer = currentProfile.role === "Media Buyer";

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

  // ── Whitelisting Pages ──
  const [whitelistPages, setWhitelistPages] = useState<string[]>([]);
  const [newWhitelistPage, setNewWhitelistPage] = useState("");
  const [isSavingWhitelist, setIsSavingWhitelist] = useState(false);
  const [whitelistMsg, setWhitelistMsg] = useState("");

  useEffect(() => {
    loadWhitelistPages();
    if (isFounder) { loadUsers(); loadProducts(); }
  }, []);

  const loadUsers = async () => { const data = await getAllUsers(); setUsers(data); };

  const loadProducts = async () => {
    if (!supabase) return;
    const { data } = await supabase.from("settings").select("value").eq("key", "products").single();
    if (data?.value) setProducts(Array.isArray(data.value) ? data.value : []);
  };

  const loadWhitelistPages = async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase.from("settings").select("value").eq("key", "whitelisting_pages").single();
      if (data?.value) setWhitelistPages(Array.isArray(data.value) ? data.value : []);
    } catch { setWhitelistPages([]); }
  };

  const saveProducts = async (updated: string[]) => {
    if (!supabase) return;
    setIsSavingProduct(true);
    await supabase.from("settings").upsert({ key: "products", value: updated, updated_at: new Date().toISOString() });
    setProducts(updated);
    setIsSavingProduct(false);
    setProductMsg("Saved!");
    setTimeout(() => setProductMsg(""), 2000);
  };

  const saveWhitelistPages = async (updated: string[]) => {
    if (!supabase) return;
    setIsSavingWhitelist(true);
    await supabase.from("settings").upsert({ key: "whitelisting_pages", value: updated, updated_at: new Date().toISOString() });
    setWhitelistPages(updated);
    setIsSavingWhitelist(false);
    setWhitelistMsg("Saved!");
    setTimeout(() => setWhitelistMsg(""), 2000);
  };

  const handleAddWhitelistPage = async () => {
    const trimmed = newWhitelistPage.trim();
    if (!trimmed || whitelistPages.includes(trimmed)) return;
    setNewWhitelistPage("");
    await saveWhitelistPages([...whitelistPages, trimmed]);
  };

  const handleRemoveWhitelistPage = async (page: string) => {
    if (!confirm(`Remove "${page}"?`)) return;
    await saveWhitelistPages(whitelistPages.filter(p => p !== page));
  };

  const handleAddProduct = async () => {
    const trimmed = newProduct.trim();
    if (!trimmed || products.includes(trimmed)) return;
    setNewProduct("");
    await saveProducts([...products, trimmed]);
  };

  const handleRemoveProduct = async (product: string) => {
    if (!confirm(`Remove "${product}"?`)) return;
    await saveProducts(products.filter(p => p !== product));
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setInviteError("");
    try {
      await onInviteUser(inviteEmail, inviteFullName, inviteRole);
      setInviteSuccess(true);
      setInviteEmail(""); setInviteFullName(""); setInviteRole("Editor");
      await loadUsers();
      setTimeout(() => { setInviteSuccess(false); setIsInviteOpen(false); }, 2000);
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
    if (!confirm("Deactivate this user?")) return;
    await onDeactivateUser(userId);
    await loadUsers();
  };

  const handleSaveName = async (userId: string) => {
    if (!editingNameValue.trim()) return;
    setIsSavingName(true);
    const oldName = users.find(u => u.id === userId)?.full_name || "";
    const newName = editingNameValue.trim();
    await supabase.from("profiles").update({ full_name: newName }).eq("id", userId);
    if (oldName && oldName !== newName) {
      await supabase.from("ads").update({ assigned_editor: newName }).eq("assigned_editor", oldName);
      await supabase.from("ads").update({ assigned_copywriter: newName }).eq("assigned_copywriter", oldName);
    }
    setEditingNameId(null);
    setEditingNameValue("");
    setIsSavingName(false);
    await loadUsers();
    if (userId === currentProfile.id) window.location.reload();
  };

  const inputClass = "w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm font-medium outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all placeholder:text-gray-300 text-gray-800";
  const selectClass = "w-full border border-gray-200 bg-white p-3 rounded-xl text-sm font-black outline-none focus:border-green-500 text-gray-700";

  // ── WHITELISTING PAGES SECTION (shared between all roles) ──
  const WhitelistingSection = () => (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Whitelisting Pages</p>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Facebook/Instagram pages used to run ads from</p>
        </div>
        {whitelistMsg && <span className="text-[10px] font-black text-green-700 bg-green-100 border border-green-200 px-3 py-1 rounded-full">✓ {whitelistMsg}</span>}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {whitelistPages.length === 0 ? (
          <p className="text-[11px] text-gray-300 font-bold italic">No whitelisting pages added yet</p>
        ) : (
          whitelistPages.map(p => (
            <div key={p} className="flex items-center gap-1.5 bg-cyan-50 border border-cyan-200 px-3 py-1.5 rounded-xl group">
              <span className="text-[11px] font-black text-cyan-700">{p}</span>
              <button onClick={() => handleRemoveWhitelistPage(p)} className="text-[9px] text-gray-300 hover:text-red-500 font-black opacity-0 group-hover:opacity-100 transition-all ml-1">✕</button>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add page name (e.g. Healthy Men 40+)"
          className={inputClass}
          value={newWhitelistPage}
          onChange={e => setNewWhitelistPage(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddWhitelistPage(); } }}
        />
        <button
          onClick={handleAddWhitelistPage}
          disabled={!newWhitelistPage.trim() || isSavingWhitelist}
          className="bg-green-700 text-white px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-800 transition-all disabled:opacity-40"
        >
          {isSavingWhitelist ? "..." : "Add"}
        </button>
      </div>
    </div>
  );

  // ── LIMITED VIEW for Strategist and Media Buyer ──
  if (!isFounder) {
    return (
      <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[900px] mx-auto w-full">
        <div className="mb-6">
          <h2 className="text-2xl font-black text-gray-900">Settings</h2>
          <p className="text-gray-400 text-sm font-medium mt-0.5">Manage whitelisting pages</p>
        </div>
        <WhitelistingSection />
      </div>
    );
  }

  // ── FOUNDER FULL VIEW ──
  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[900px] mx-auto w-full">
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Settings</h2>
          <p className="text-gray-400 text-sm font-medium mt-0.5">Manage team accounts and access</p>
        </div>
        <button onClick={() => setIsInviteOpen(!isInviteOpen)} className="bg-green-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-800 transition-all shadow-sm">
          + Invite User
        </button>
      </div>

      {/* Product Manager */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Product List</p>
            <p className="text-xs text-gray-400 font-medium mt-0.5">These appear as dropdown options when creating ads</p>
          </div>
          {productMsg && <span className="text-[10px] font-black text-green-700 bg-green-100 border border-green-200 px-3 py-1 rounded-full">✓ {productMsg}</span>}
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {products.length === 0 ? (
            <p className="text-[11px] text-gray-300 font-bold italic">No products added yet</p>
          ) : (
            products.map(p => (
              <div key={p} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl group">
                <span className="text-[11px] font-black text-gray-700">{p}</span>
                <button onClick={() => handleRemoveProduct(p)} className="text-[9px] text-gray-300 hover:text-red-500 font-black opacity-0 group-hover:opacity-100 transition-all ml-1">✕</button>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add new product (e.g. NAC)"
            className={inputClass}
            value={newProduct}
            onChange={e => setNewProduct(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddProduct(); } }}
          />
          <button onClick={handleAddProduct} disabled={!newProduct.trim() || isSavingProduct} className="bg-green-700 text-white px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-800 transition-all disabled:opacity-40">
            {isSavingProduct ? "..." : "Add"}
          </button>
        </div>
      </div>

      {/* Whitelisting Pages */}
      <WhitelistingSection />

      {/* Invite Form */}
      {isInviteOpen && (
        <form onSubmit={handleInvite} className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 shadow-sm">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Invite New Team Member</p>
          {inviteSuccess && <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4"><p className="text-green-700 font-black text-sm">✓ Invite sent successfully!</p></div>}
          {inviteError && <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4"><p className="text-red-600 font-bold text-sm">{inviteError}</p></div>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Full Name</label>
              <input required type="text" placeholder="John Doe" className={inputClass} value={inviteFullName} onChange={e => setInviteFullName(e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Email</label>
              <input required type="email" placeholder="john@example.com" className={inputClass} value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Role</label>
              <select className={selectClass} value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={() => setIsInviteOpen(false)} className="text-sm font-bold text-gray-400 px-4 py-2 hover:bg-gray-100 rounded-xl">Cancel</button>
            <button type="submit" disabled={isInviting} className="bg-green-700 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-800 transition-all disabled:opacity-50">
              {isInviting ? "Sending..." : "Send Invite"}
            </button>
          </div>
        </form>
      )}

      {/* Users List */}
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3">Team Members ({users.length})</p>
        {users.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400 font-bold">No team members yet</div>
        ) : (
          users.map(u => (
            <div key={u.id} className={`bg-white border rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${!u.is_active ? "opacity-50" : "border-gray-100 hover:border-green-200 hover:shadow-sm"}`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${ROLE_STYLES[u.role] || "bg-gray-100 text-gray-600"}`}>
                  {u.full_name?.charAt(0)?.toUpperCase() || u.email?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  {editingNameId === u.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        className="border border-green-400 bg-gray-50 px-3 py-1.5 rounded-xl text-sm font-black outline-none text-gray-800 w-40"
                        value={editingNameValue}
                        onChange={e => setEditingNameValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleSaveName(u.id);
                          if (e.key === "Escape") { setEditingNameId(null); setEditingNameValue(""); }
                        }}
                      />
                      <button onClick={() => handleSaveName(u.id)} disabled={isSavingName} className="text-[10px] font-black text-white bg-green-700 px-3 py-1.5 rounded-xl hover:bg-green-800 transition-all disabled:opacity-40">
                        {isSavingName ? "..." : "Save"}
                      </button>
                      <button onClick={() => { setEditingNameId(null); setEditingNameValue(""); }} className="text-[10px] font-black text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-xl">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <p className="font-black text-gray-800">{u.full_name || "No name"}</p>
                      <button onClick={() => { setEditingNameId(u.id); setEditingNameValue(u.full_name || ""); }} className="text-[9px] text-gray-300 hover:text-green-600 opacity-0 group-hover:opacity-100 transition-all font-black" title="Edit name">✏️</button>
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400 font-medium">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!u.is_active && <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-gray-100 text-gray-400 border border-gray-200">Deactivated</span>}
                {u.id !== currentProfile.id ? (
                  <>
                    <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)} className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border-2 outline-none cursor-pointer bg-white ${ROLE_STYLES[u.role] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      {ROLES.map(r => <option key={r}>{r}</option>)}
                    </select>
                    {u.is_active && (
                      <button onClick={() => handleDeactivate(u.id)} className="text-[10px] font-black text-gray-300 hover:text-red-500 px-3 py-2 rounded-xl hover:bg-red-50 transition-all uppercase tracking-widest">
                        Remove
                      </button>
                    )}
                  </>
                ) : (
                  <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border-2 ${ROLE_STYLES[u.role] || "bg-gray-100 text-gray-600 border-gray-200"}`}>{u.role}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}