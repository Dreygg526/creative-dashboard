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
  "Founder": "bg-green-950 text-green-400 border-green-900",
  "Strategist": "bg-violet-950 text-violet-400 border-violet-900",
  "Editor": "bg-amber-950 text-amber-400 border-amber-900",
  "Graphic Designer": "bg-blue-950 text-blue-400 border-blue-900",
  "Content Coordinator": "bg-rose-950 text-rose-400 border-rose-900",
  "VA": "bg-[#1f1f23] text-gray-400 border-gray-700",
  "Media Buyer": "bg-cyan-950 text-cyan-400 border-cyan-900",
};

const inputClass = "w-full border border-gray-700 bg-[#0d0d0f] p-3 rounded-xl text-sm font-medium outline-none focus:border-gray-500 transition-all placeholder:text-gray-600 text-gray-100";

// ── REUSABLE LIST SECTION — defined outside to prevent re-render on keystroke ──
function ListSection({ title, description, items, newValue, setNewValue, isSaving, msg, color, onAdd, onRemove, placeholder }: {
  title: string; description: string; items: string[]; newValue: string; setNewValue: (v: string) => void;
  isSaving: boolean; msg: string; color: string; onAdd: () => void; onRemove: (v: string) => void; placeholder: string;
}) {
  return (
    <div className="bg-[#141416] border border-gray-800 rounded-2xl p-6 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{title}</p>
          <p className="text-xs text-gray-500 font-medium mt-0.5">{description}</p>
        </div>
        {msg && <span className="text-[10px] font-black text-green-400 bg-green-950 border border-green-900 px-3 py-1 rounded-full">✓ {msg}</span>}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {items.length === 0 ? (
          <p className="text-[11px] text-gray-600 font-bold italic">No {title.toLowerCase()} added yet</p>
        ) : (
          items.map(p => (
            <div key={p} className={`flex items-center gap-1.5 ${color} px-3 py-1.5 rounded-xl group`}>
              <span className="text-[11px] font-black">{p}</span>
              <button onClick={() => onRemove(p)} className="text-[9px] text-gray-500 hover:text-red-400 font-black opacity-0 group-hover:opacity-100 transition-all ml-1">✕</button>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <input type="text" placeholder={placeholder} className={inputClass} value={newValue} onChange={e => setNewValue(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }} />
        <button onClick={onAdd} disabled={!newValue.trim() || isSaving}
          className="bg-gray-100 text-gray-900 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white transition-all disabled:opacity-40">
          {isSaving ? "..." : "Add"}
        </button>
      </div>
    </div>
  );
}

// ── WHITELISTING SECTION — defined outside to prevent re-render on keystroke ──
function WhitelistingSection({ whitelistPages, newWhitelistPage, setNewWhitelistPage, isSavingWhitelist, whitelistMsg, onAdd, onRemove }: {
  whitelistPages: string[]; newWhitelistPage: string; setNewWhitelistPage: (v: string) => void;
  isSavingWhitelist: boolean; whitelistMsg: string; onAdd: () => void; onRemove: (page: string) => void;
}) {
  return (
    <div className="bg-[#141416] border border-gray-800 rounded-2xl p-6 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Whitelisting Pages</p>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Facebook/Instagram pages used to run ads from</p>
        </div>
        {whitelistMsg && <span className="text-[10px] font-black text-green-400 bg-green-950 border border-green-900 px-3 py-1 rounded-full">✓ {whitelistMsg}</span>}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {whitelistPages.length === 0 ? (
          <p className="text-[11px] text-gray-600 font-bold italic">No whitelisting pages added yet</p>
        ) : (
          whitelistPages.map(p => (
            <div key={p} className="flex items-center gap-1.5 bg-cyan-950 border border-cyan-900 px-3 py-1.5 rounded-xl group">
              <span className="text-[11px] font-black text-cyan-400">{p}</span>
              <button onClick={() => onRemove(p)} className="text-[9px] text-gray-500 hover:text-red-400 font-black opacity-0 group-hover:opacity-100 transition-all ml-1">✕</button>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <input type="text" placeholder="Add page name (e.g. Healthy Men 40+)" className={inputClass} value={newWhitelistPage}
          onChange={e => setNewWhitelistPage(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }} />
        <button onClick={onAdd} disabled={!newWhitelistPage.trim() || isSavingWhitelist}
          className="bg-gray-100 text-gray-900 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white transition-all disabled:opacity-40">
          {isSavingWhitelist ? "..." : "Add"}
        </button>
      </div>
    </div>
  );
}

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

  const [whitelistPages, setWhitelistPages] = useState<string[]>([]);
  const [newWhitelistPage, setNewWhitelistPage] = useState("");
  const [isSavingWhitelist, setIsSavingWhitelist] = useState(false);
  const [whitelistMsg, setWhitelistMsg] = useState("");

  const [subAvatars, setSubAvatars] = useState<string[]>([]);
  const [newSubAvatar, setNewSubAvatar] = useState("");
  const [isSavingSubAvatar, setIsSavingSubAvatar] = useState(false);
  const [subAvatarMsg, setSubAvatarMsg] = useState("");

  const [angles, setAngles] = useState<string[]>([]);
  const [newAngle, setNewAngle] = useState("");
  const [isSavingAngle, setIsSavingAngle] = useState(false);
  const [angleMsg, setAngleMsg] = useState("");

  const [concepts, setConcepts] = useState<string[]>([]);
  const [newConcept, setNewConcept] = useState("");
  const [isSavingConcept, setIsSavingConcept] = useState(false);
  const [conceptMsg, setConceptMsg] = useState("");

  const [personas, setPersonas] = useState<string[]>([]);
  const [newPersona, setNewPersona] = useState("");
  const [isSavingPersona, setIsSavingPersona] = useState(false);
  const [personaMsg, setPersonaMsg] = useState("");

  const [coreEmotions, setCoreEmotions] = useState<string[]>([]);
  const [newCoreEmotion, setNewCoreEmotion] = useState("");
  const [isSavingCoreEmotion, setIsSavingCoreEmotion] = useState(false);
  const [coreEmotionMsg, setCoreEmotionMsg] = useState("");

  const [problems, setProblems] = useState<string[]>([]);
  const [newProblem, setNewProblem] = useState("");
  const [isSavingProblem, setIsSavingProblem] = useState(false);
  const [problemMsg, setProblemMsg] = useState("");

  const selectClass = "w-full border border-gray-700 bg-[#1a1a1d] p-3 rounded-xl text-sm font-black outline-none focus:border-gray-500 text-gray-200";

  useEffect(() => {
    loadWhitelistPages();
    loadSubAvatars();
    loadAngles();
    loadConcepts();
    loadPersonas();
    loadCoreEmotions();
    loadProblems();
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

  const loadSubAvatars = async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase.from("settings").select("value").eq("key", "sub_avatars").single();
      if (data?.value) setSubAvatars(Array.isArray(data.value) ? data.value : []);
    } catch { setSubAvatars([]); }
  };

  const loadAngles = async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase.from("settings").select("value").eq("key", "angles").single();
      if (data?.value) setAngles(Array.isArray(data.value) ? data.value : []);
    } catch { setAngles([]); }
  };

  const loadConcepts = async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase.from("settings").select("value").eq("key", "concepts").single();
      if (data?.value) setConcepts(Array.isArray(data.value) ? data.value : []);
    } catch { setConcepts([]); }
  };

  const loadPersonas = async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase.from("settings").select("value").eq("key", "personas").single();
      if (data?.value) setPersonas(Array.isArray(data.value) ? data.value : []);
    } catch { setPersonas([]); }
  };

  const loadCoreEmotions = async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase.from("settings").select("value").eq("key", "core_emotions").single();
      if (data?.value) setCoreEmotions(Array.isArray(data.value) ? data.value : []);
    } catch { setCoreEmotions([]); }
  };

  const loadProblems = async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase.from("settings").select("value").eq("key", "problems").single();
      if (data?.value) setProblems(Array.isArray(data.value) ? data.value : []);
    } catch { setProblems([]); }
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

  const saveSubAvatars = async (updated: string[]) => {
    if (!supabase) return;
    setIsSavingSubAvatar(true);
    await supabase.from("settings").upsert({ key: "sub_avatars", value: updated, updated_at: new Date().toISOString() });
    setSubAvatars(updated);
    setIsSavingSubAvatar(false);
    setSubAvatarMsg("Saved!");
    setTimeout(() => setSubAvatarMsg(""), 2000);
  };

  const saveAngles = async (updated: string[]) => {
    if (!supabase) return;
    setIsSavingAngle(true);
    await supabase.from("settings").upsert({ key: "angles", value: updated, updated_at: new Date().toISOString() });
    setAngles(updated);
    setIsSavingAngle(false);
    setAngleMsg("Saved!");
    setTimeout(() => setAngleMsg(""), 2000);
  };

  const saveConcepts = async (updated: string[]) => {
    if (!supabase) return;
    setIsSavingConcept(true);
    await supabase.from("settings").upsert({ key: "concepts", value: updated, updated_at: new Date().toISOString() });
    setConcepts(updated);
    setIsSavingConcept(false);
    setConceptMsg("Saved!");
    setTimeout(() => setConceptMsg(""), 2000);
  };

  const savePersonas = async (updated: string[]) => {
    if (!supabase) return;
    setIsSavingPersona(true);
    await supabase.from("settings").upsert({ key: "personas", value: updated, updated_at: new Date().toISOString() });
    setPersonas(updated);
    setIsSavingPersona(false);
    setPersonaMsg("Saved!");
    setTimeout(() => setPersonaMsg(""), 2000);
  };

  const saveCoreEmotions = async (updated: string[]) => {
    if (!supabase) return;
    setIsSavingCoreEmotion(true);
    await supabase.from("settings").upsert({ key: "core_emotions", value: updated, updated_at: new Date().toISOString() });
    setCoreEmotions(updated);
    setIsSavingCoreEmotion(false);
    setCoreEmotionMsg("Saved!");
    setTimeout(() => setCoreEmotionMsg(""), 2000);
  };

  const saveProblems = async (updated: string[]) => {
    if (!supabase) return;
    setIsSavingProblem(true);
    await supabase.from("settings").upsert({ key: "problems", value: updated, updated_at: new Date().toISOString() });
    setProblems(updated);
    setIsSavingProblem(false);
    setProblemMsg("Saved!");
    setTimeout(() => setProblemMsg(""), 2000);
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

  // ── Analytics tagging lists, shared between Founder + limited views ──
  const analyticsListsBlock = (
    <>
      <ListSection title="Personas" description="High-level target personas (e.g. Busy Mom, Preventive Millennial)" items={personas} newValue={newPersona} setNewValue={setNewPersona} isSaving={isSavingPersona} msg={personaMsg} color="bg-emerald-950 border border-emerald-900 text-emerald-400"
        onAdd={async () => { const t = newPersona.trim(); if (!t || personas.includes(t)) return; setNewPersona(""); await savePersonas([...personas, t]); }}
        onRemove={async (v) => { if (!confirm(`Remove "${v}"?`)) return; await savePersonas(personas.filter(x => x !== v)); }}
        placeholder="e.g. Preventive Millennial" />
      <ListSection title="Core Emotions" description="Primary emotional driver for the persona (e.g. Security / Safety)" items={coreEmotions} newValue={newCoreEmotion} setNewValue={setNewCoreEmotion} isSaving={isSavingCoreEmotion} msg={coreEmotionMsg} color="bg-pink-950 border border-pink-900 text-pink-400"
        onAdd={async () => { const t = newCoreEmotion.trim(); if (!t || coreEmotions.includes(t)) return; setNewCoreEmotion(""); await saveCoreEmotions([...coreEmotions, t]); }}
        onRemove={async (v) => { if (!confirm(`Remove "${v}"?`)) return; await saveCoreEmotions(coreEmotions.filter(x => x !== v)); }}
        placeholder="e.g. Security / Safety" />
      <ListSection title="Problems" description="The core problem the ad addresses (e.g. Hair Thinning)" items={problems} newValue={newProblem} setNewValue={setNewProblem} isSaving={isSavingProblem} msg={problemMsg} color="bg-yellow-950 border border-yellow-900 text-yellow-400"
        onAdd={async () => { const t = newProblem.trim(); if (!t || problems.includes(t)) return; setNewProblem(""); await saveProblems([...problems, t]); }}
        onRemove={async (v) => { if (!confirm(`Remove "${v}"?`)) return; await saveProblems(problems.filter(x => x !== v)); }}
        placeholder="e.g. Hair Thinning" />
    </>
  );

  // ── LIMITED VIEW for Strategist and Media Buyer ──
  if (!isFounder) {
    return (
      <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[900px] mx-auto w-full">
        <div className="mb-6">
          <h2 className="text-2xl font-black text-gray-100">Settings</h2>
          <p className="text-gray-500 text-sm font-medium mt-0.5">Manage lists and whitelisting pages</p>
        </div>
        <WhitelistingSection
          whitelistPages={whitelistPages} newWhitelistPage={newWhitelistPage} setNewWhitelistPage={setNewWhitelistPage}
          isSavingWhitelist={isSavingWhitelist} whitelistMsg={whitelistMsg}
          onAdd={handleAddWhitelistPage} onRemove={handleRemoveWhitelistPage}
        />
        {(isStrategist || isMediaBuyer) && <>
          <ListSection title="Sub Avatars" description="Target audience sub-personas for ads" items={subAvatars} newValue={newSubAvatar} setNewValue={setNewSubAvatar} isSaving={isSavingSubAvatar} msg={subAvatarMsg} color="bg-violet-950 border border-violet-900 text-violet-400"
            onAdd={async () => { const t = newSubAvatar.trim(); if (!t || subAvatars.includes(t)) return; setNewSubAvatar(""); await saveSubAvatars([...subAvatars, t]); }}
            onRemove={async (v) => { if (!confirm(`Remove "${v}"?`)) return; await saveSubAvatars(subAvatars.filter(x => x !== v)); }}
            placeholder="e.g. Occasional drinker of wine" />
          <ListSection title="Angles" description="Ad angles for targeting" items={angles} newValue={newAngle} setNewValue={setNewAngle} isSaving={isSavingAngle} msg={angleMsg} color="bg-orange-950 border border-orange-900 text-orange-400"
            onAdd={async () => { const t = newAngle.trim(); if (!t || angles.includes(t)) return; setNewAngle(""); await saveAngles([...angles, t]); }}
            onRemove={async (v) => { if (!confirm(`Remove "${v}"?`)) return; await saveAngles(angles.filter(x => x !== v)); }}
            placeholder="e.g. 30 Days Transformation" />
          <ListSection title="Concepts" description="Ad concepts for organizing campaigns" items={concepts} newValue={newConcept} setNewValue={setNewConcept} isSaving={isSavingConcept} msg={conceptMsg} color="bg-blue-950 border border-blue-900 text-blue-400"
            onAdd={async () => { const t = newConcept.trim(); if (!t || concepts.includes(t)) return; setNewConcept(""); await saveConcepts([...concepts, t]); }}
            onRemove={async (v) => { if (!confirm(`Remove "${v}"?`)) return; await saveConcepts(concepts.filter(x => x !== v)); }}
            placeholder="e.g. Hungover" />
          {analyticsListsBlock}
        </>}
      </div>
    );
  }

  // ── FOUNDER FULL VIEW ──
  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[900px] mx-auto w-full">
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-100">Settings</h2>
          <p className="text-gray-500 text-sm font-medium mt-0.5">Manage team accounts and access</p>
        </div>
        <button onClick={() => setIsInviteOpen(!isInviteOpen)} className="bg-gray-100 text-gray-900 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white transition-all shadow-sm">
          + Invite User
        </button>
      </div>

      {/* Product Manager */}
      <div className="bg-[#141416] border border-gray-800 rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Product List</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">These appear as dropdown options when creating ads</p>
          </div>
          {productMsg && <span className="text-[10px] font-black text-green-400 bg-green-950 border border-green-900 px-3 py-1 rounded-full">✓ {productMsg}</span>}
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {products.length === 0 ? (
            <p className="text-[11px] text-gray-600 font-bold italic">No products added yet</p>
          ) : (
            products.map(p => (
              <div key={p} className="flex items-center gap-1.5 bg-[#0d0d0f] border border-gray-700 px-3 py-1.5 rounded-xl group">
                <span className="text-[11px] font-black text-gray-200">{p}</span>
                <button onClick={() => handleRemoveProduct(p)} className="text-[9px] text-gray-500 hover:text-red-400 font-black opacity-0 group-hover:opacity-100 transition-all ml-1">✕</button>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <input type="text" placeholder="Add new product (e.g. NAC)" className={inputClass} value={newProduct}
            onChange={e => setNewProduct(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddProduct(); } }} />
          <button onClick={handleAddProduct} disabled={!newProduct.trim() || isSavingProduct} className="bg-gray-100 text-gray-900 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white transition-all disabled:opacity-40">
            {isSavingProduct ? "..." : "Add"}
          </button>
        </div>
      </div>

      {/* Whitelisting Pages */}
      <WhitelistingSection
        whitelistPages={whitelistPages} newWhitelistPage={newWhitelistPage} setNewWhitelistPage={setNewWhitelistPage}
        isSavingWhitelist={isSavingWhitelist} whitelistMsg={whitelistMsg}
        onAdd={handleAddWhitelistPage} onRemove={handleRemoveWhitelistPage}
      />

      {/* Sub Avatars */}
      <ListSection title="Sub Avatars" description="Target audience sub-personas for ads" items={subAvatars} newValue={newSubAvatar} setNewValue={setNewSubAvatar} isSaving={isSavingSubAvatar} msg={subAvatarMsg} color="bg-violet-950 border border-violet-900 text-violet-400"
        onAdd={async () => { const t = newSubAvatar.trim(); if (!t || subAvatars.includes(t)) return; setNewSubAvatar(""); await saveSubAvatars([...subAvatars, t]); }}
        onRemove={async (v) => { if (!confirm(`Remove "${v}"?`)) return; await saveSubAvatars(subAvatars.filter(x => x !== v)); }}
        placeholder="e.g. Occasional drinker of wine" />

      {/* Angles */}
      <ListSection title="Angles" description="Ad angles for targeting" items={angles} newValue={newAngle} setNewValue={setNewAngle} isSaving={isSavingAngle} msg={angleMsg} color="bg-orange-950 border border-orange-900 text-orange-400"
        onAdd={async () => { const t = newAngle.trim(); if (!t || angles.includes(t)) return; setNewAngle(""); await saveAngles([...angles, t]); }}
        onRemove={async (v) => { if (!confirm(`Remove "${v}"?`)) return; await saveAngles(angles.filter(x => x !== v)); }}
        placeholder="e.g. 30 Days Transformation" />

      {/* Concepts */}
      <ListSection title="Concepts" description="Ad concepts for organizing campaigns" items={concepts} newValue={newConcept} setNewValue={setNewConcept} isSaving={isSavingConcept} msg={conceptMsg} color="bg-blue-950 border border-blue-900 text-blue-400"
        onAdd={async () => { const t = newConcept.trim(); if (!t || concepts.includes(t)) return; setNewConcept(""); await saveConcepts([...concepts, t]); }}
        onRemove={async (v) => { if (!confirm(`Remove "${v}"?`)) return; await saveConcepts(concepts.filter(x => x !== v)); }}
        placeholder="e.g. Hungover" />

      {/* Analytics tagging lists: Personas / Core Emotions / Problems */}
      {analyticsListsBlock}

      {/* Invite Form */}
      {isInviteOpen && (
        <form onSubmit={handleInvite} className="bg-[#141416] border border-gray-800 rounded-2xl p-6 mb-6 shadow-sm">
          <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-4">Invite New Team Member</p>
          {inviteSuccess && <div className="bg-green-950/30 border border-green-900 rounded-xl p-4 mb-4"><p className="text-green-400 font-black text-sm">✓ Invite sent successfully!</p></div>}
          {inviteError && <div className="bg-red-950/30 border border-red-900 rounded-xl p-4 mb-4"><p className="text-red-400 font-bold text-sm">{inviteError}</p></div>}
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
            <button type="button" onClick={() => setIsInviteOpen(false)} className="text-sm font-bold text-gray-400 px-4 py-2 hover:bg-[#1a1a1d] rounded-xl">Cancel</button>
            <button type="submit" disabled={isInviting} className="bg-gray-100 text-gray-900 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50">
              {isInviting ? "Sending..." : "Send Invite"}
            </button>
          </div>
        </form>
      )}

      {/* Users List */}
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-3">Team Members ({users.length})</p>
        {users.length === 0 ? (
          <div className="border-2 border-dashed border-gray-800 rounded-2xl p-12 text-center text-gray-500 font-bold">No team members yet</div>
        ) : (
          users.map(u => (
            <div key={u.id} className={`bg-[#141416] border rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${!u.is_active ? "opacity-50 border-gray-800" : "border-gray-800 hover:border-gray-700 hover:shadow-sm"}`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border ${ROLE_STYLES[u.role] || "bg-[#1f1f23] text-gray-400 border-gray-700"}`}>
                  {u.full_name?.charAt(0)?.toUpperCase() || u.email?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  {editingNameId === u.id ? (
                    <div className="flex items-center gap-2">
                      <input autoFocus className="border border-gray-500 bg-[#0d0d0f] px-3 py-1.5 rounded-xl text-sm font-black outline-none text-gray-100 w-40"
                        value={editingNameValue} onChange={e => setEditingNameValue(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleSaveName(u.id); if (e.key === "Escape") { setEditingNameId(null); setEditingNameValue(""); } }} />
                      <button onClick={() => handleSaveName(u.id)} disabled={isSavingName} className="text-[10px] font-black text-gray-900 bg-gray-100 px-3 py-1.5 rounded-xl hover:bg-white transition-all disabled:opacity-40">
                        {isSavingName ? "..." : "Save"}
                      </button>
                      <button onClick={() => { setEditingNameId(null); setEditingNameValue(""); }} className="text-[10px] font-black text-gray-500 hover:text-gray-300 px-2 py-1.5 rounded-xl">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <p className="font-black text-gray-100">{u.full_name || "No name"}</p>
                      <button onClick={() => { setEditingNameId(u.id); setEditingNameValue(u.full_name || ""); }} className="text-[9px] text-gray-600 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-all font-black" title="Edit name">✏️</button>
                    </div>
                  )}
                  <p className="text-[11px] text-gray-500 font-medium">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!u.is_active && <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-[#1f1f23] text-gray-500 border border-gray-700">Deactivated</span>}
                {u.id !== currentProfile.id ? (
                  <>
                    <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)} className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border-2 outline-none cursor-pointer ${ROLE_STYLES[u.role] || "bg-[#1f1f23] text-gray-400 border-gray-700"}`}>
                      {ROLES.map(r => <option key={r}>{r}</option>)}
                    </select>
                    {u.is_active && (
                      <button onClick={() => handleDeactivate(u.id)} className="text-[10px] font-black text-gray-600 hover:text-red-400 px-3 py-2 rounded-xl hover:bg-red-950 transition-all uppercase tracking-widest">
                        Remove
                      </button>
                    )}
                  </>
                ) : (
                  <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full border-2 ${ROLE_STYLES[u.role] || "bg-[#1f1f23] text-gray-400 border-gray-700"}`}>{u.role}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}