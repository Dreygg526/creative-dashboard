import { NewAdForm } from "../../types";

interface EditorProfile {
  full_name: string;
  role: string;
}

interface Props {
  newAd: NewAdForm;
  setNewAd: (v: NewAdForm) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  editors: string[];
  copywriters: string[];
  currentRole?: string;
  currentUser?: string;
  allEditorProfiles?: EditorProfile[];
  allStrategistProfiles?: EditorProfile[];
  products?: string[];
}

export default function NewAdModal({
  newAd, setNewAd, onSubmit, onClose,
  editors, currentRole, currentUser, allEditorProfiles = [],
  allStrategistProfiles = [], products = []
}: Props) {
  const isFounder = currentRole === "Founder";
  const isStrategist = currentRole === "Strategist";
  const isEditor = currentRole === "Editor" || currentRole === "Graphic Designer";

  const defaultStrategist = (isFounder || isStrategist) ? currentUser || "" : "";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 md:p-4">
      <div className="bg-[#1e1f20] border border-white/10 p-6 md:p-8 rounded-[32px] w-full max-w-lg shadow-2xl max-h-[95vh] overflow-y-auto">
        <h2 className="text-2xl font-black text-slate-100 mb-6">New Creative Concept</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Concept Name */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Concept Name</label>
              <input
                required
                type="text"
                className="w-full border-2 border-white/10 p-4 rounded-2xl text-sm outline-none focus:border-indigo-500 bg-white/5 font-bold transition-all text-slate-100 placeholder:text-slate-600"
                value={newAd.concept_name}
                onChange={e => setNewAd({ ...newAd, concept_name: e.target.value })}
              />
            </div>

            {/* Ad Type */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Ad Type</label>
              <select
                className="w-full border-2 border-white/10 p-4 rounded-2xl text-sm outline-none bg-[#2a2b2c] font-bold text-slate-100"
                value={newAd.ad_type}
                onChange={e => setNewAd({ ...newAd, ad_type: e.target.value })}
              >
                <option>Iteration</option>
                <option>Ideation</option>
                <option>Imitation</option>
              </select>
            </div>

            {/* Priority — Founder only */}
            {isFounder && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Priority</label>
                <select
                  className="w-full border-2 border-white/10 p-4 rounded-2xl text-sm outline-none bg-[#2a2b2c] font-bold text-slate-100"
                  value={newAd.priority}
                  onChange={e => setNewAd({ ...newAd, priority: e.target.value })}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
            )}

            {/* Content Source */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Content Source</label>
              <select
                className="w-full border-2 border-white/10 p-4 rounded-2xl text-sm outline-none bg-[#2a2b2c] font-bold text-slate-100"
                value={newAd.content_source}
                onChange={e => setNewAd({ ...newAd, content_source: e.target.value })}
              >
                <option>Internal Team</option>
                <option>UGC Creator</option>
                <option>AI Generated</option>
              </select>
            </div>

            {/* Format */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Format</label>
              <select
                className="w-full border-2 border-white/10 p-4 rounded-2xl text-sm outline-none bg-[#2a2b2c] font-bold text-slate-100"
                value={newAd.ad_format}
                onChange={e => setNewAd({ ...newAd, ad_format: e.target.value })}
              >
                <option>Video Ad</option>
                <option>Static Ad</option>
                <option>Native Ad</option>
              </select>
            </div>

            {/* Product */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Product</label>
              <select
                required
                className="w-full border-2 border-white/10 p-4 rounded-2xl text-sm outline-none focus:border-indigo-500 bg-[#2a2b2c] font-bold transition-all text-slate-100"
                value={newAd.product}
                onChange={e => setNewAd({ ...newAd, product: e.target.value })}
              >
                <option value="">— Select Product —</option>
                {products.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Strategist — shown for Founder, auto-filled for Strategist */}
            {(isFounder || isStrategist) && (
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">
                  Strategist <span className="text-slate-600 normal-case font-medium">(optional)</span>
                </label>
                {isStrategist ? (
                  <input
                    disabled
                    className="w-full border-2 border-white/5 p-4 rounded-2xl text-sm bg-white/5 font-bold text-slate-400 cursor-not-allowed"
                    value={`${currentUser || ""} (${currentRole})`}
                  />
                ) : (
                  <select
                    className="w-full border-2 border-white/10 p-4 rounded-2xl text-sm outline-none bg-[#2a2b2c] font-bold text-slate-100"
                    value={newAd.assigned_copywriter || defaultStrategist}
                    onChange={e => setNewAd({ ...newAd, assigned_copywriter: e.target.value })}
                  >
                    <option value="">— Select Strategist —</option>
                    {allStrategistProfiles.map(p => (
                      <option key={p.full_name} value={p.full_name}>
                        {p.full_name} ({p.role})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Editor */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">
                Editor <span className="text-slate-600 normal-case font-medium">(optional)</span>
              </label>
              {isEditor ? (
                <input
                  disabled
                  className="w-full border-2 border-white/5 p-4 rounded-2xl text-sm bg-white/5 font-bold text-slate-400 cursor-not-allowed"
                  value={`${currentUser || ""} (${currentRole})`}
                />
              ) : (
                <select
                  className="w-full border-2 border-white/10 p-4 rounded-2xl text-sm outline-none bg-[#2a2b2c] font-bold text-slate-100"
                  value={newAd.assigned_editor}
                  onChange={e => setNewAd({ ...newAd, assigned_editor: e.target.value })}
                >
                  <option value="">— Select Editor —</option>
                  {allEditorProfiles.length > 0
                    ? allEditorProfiles.map(p => (
                        <option key={p.full_name} value={p.full_name}>
                          {p.full_name} ({p.role})
                        </option>
                      ))
                    : editors.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))
                  }
                </select>
              )}
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">
                Due Date <span className="text-slate-600 normal-case font-medium">(optional)</span>
              </label>
              <input
                type="date"
                className="w-full border-2 border-white/10 p-4 rounded-2xl text-sm outline-none focus:border-indigo-500 bg-[#2a2b2c] font-bold transition-all text-slate-100"
                value={newAd.due_date ? newAd.due_date.split("T")[0] : ""}
                onChange={e => setNewAd({ ...newAd, due_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
              />
            </div>

            {/* Brief Link */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Brief Link (Milanote)</label>
              <input
                type="url"
                className="w-full border-2 border-white/10 p-4 rounded-2xl text-sm outline-none focus:border-indigo-500 bg-white/5 font-bold transition-all text-slate-100 placeholder:text-slate-600"
                placeholder="Optional"
                value={newAd.brief_link}
                onChange={e => setNewAd({ ...newAd, brief_link: e.target.value })}
              />
            </div>

          </div>
          <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/10">
            <button type="button" onClick={onClose} className="text-sm font-bold text-slate-500 px-4 py-2 hover:bg-white/5 rounded-xl">
              Cancel
            </button>
            <button type="submit" className="bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-400 transition-all text-xs uppercase tracking-widest">
              Submit to Pipeline
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}