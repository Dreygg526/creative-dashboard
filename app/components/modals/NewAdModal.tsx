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
  whitelistPages?: string[];
  destinationUrls?: string[];
}

export default function NewAdModal({
  newAd, setNewAd, onSubmit, onClose,
  editors, currentRole, currentUser, allEditorProfiles = [],
  allStrategistProfiles = [],  products = [], whitelistPages = [], destinationUrls = []
}: Props) {
  const isFounder = currentRole === "Founder";
  const isStrategist = currentRole === "Strategist";
  const isEditor = currentRole === "Editor" || currentRole === "Graphic Designer";
  const defaultStrategist = (isFounder || isStrategist) ? currentUser || "" : "";

  const inputClass = "w-full border border-gray-200 bg-gray-50 p-3.5 rounded-xl text-sm font-medium outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all placeholder:text-gray-300 text-gray-800";
  const selectClass = "w-full border border-gray-200 bg-white p-3.5 rounded-xl text-sm font-black outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all text-gray-700";
  const labelClass = "block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[95vh] overflow-y-auto border border-gray-200">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900">New Creative Concept</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all font-black">✕</button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="md:col-span-2">
              <label className={labelClass}>Concept Name</label>
              <input required type="text" className={inputClass} placeholder="Enter concept name..." value={newAd.concept_name} onChange={e => setNewAd({ ...newAd, concept_name: e.target.value })} />
            </div>

            <div>
              <label className={labelClass}>Ad Type</label>
              <select className={selectClass} value={newAd.ad_type} onChange={e => setNewAd({ ...newAd, ad_type: e.target.value })}>
                <option>Iteration</option>
                <option>Ideation</option>
                <option>Imitation</option>
              </select>
            </div>

            {isFounder && (
              <div>
                <label className={labelClass}>Priority</label>
                <select className={selectClass} value={newAd.priority} onChange={e => setNewAd({ ...newAd, priority: e.target.value })}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
            )}

            <div className="md:col-span-2">
              <label className={labelClass}>Content Source</label>
              <select className={selectClass} value={newAd.content_source} onChange={e => setNewAd({ ...newAd, content_source: e.target.value })}>
                <option>Internal Team</option>
                <option>UGC Creator</option>
                <option>AI Generated</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Format</label>
              <select className={selectClass} value={newAd.ad_format} onChange={e => setNewAd({ ...newAd, ad_format: e.target.value })}>
                <option>Video Ad</option>
                <option>Static Ad</option>
                <option>Native Ad</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Product</label>
              <select required className={selectClass} value={newAd.product} onChange={e => setNewAd({ ...newAd, product: e.target.value })}>
                <option value="">— Select Product —</option>
                {products.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {(isFounder || isStrategist) && (
              <div className="md:col-span-2">
                <label className={labelClass}>Strategist <span className="text-gray-300 normal-case font-medium">(optional)</span></label>
                {isStrategist ? (
                  <input disabled className="w-full border border-gray-100 bg-gray-50 p-3.5 rounded-xl text-sm font-bold text-gray-400 cursor-not-allowed" value={`${currentUser || ""} (${currentRole})`} />
                ) : (
                  <select className={selectClass} value={newAd.assigned_copywriter || defaultStrategist} onChange={e => setNewAd({ ...newAd, assigned_copywriter: e.target.value })}>
                    <option value="">— Select Strategist —</option>
                    {allStrategistProfiles.map(p => <option key={p.full_name} value={p.full_name}>{p.full_name} ({p.role})</option>)}
                  </select>
                )}
              </div>
            )}

            <div>
              <label className={labelClass}>Editor <span className="text-gray-300 normal-case font-medium">(optional)</span></label>
              {isEditor ? (
                <input disabled className="w-full border border-gray-100 bg-gray-50 p-3.5 rounded-xl text-sm font-bold text-gray-400 cursor-not-allowed" value={`${currentUser || ""} (${currentRole})`} />
              ) : (
                <select className={selectClass} value={newAd.assigned_editor} onChange={e => setNewAd({ ...newAd, assigned_editor: e.target.value })}>
                  <option value="">— Select Editor —</option>
                  {allEditorProfiles.length > 0
                    ? allEditorProfiles.map(p => <option key={p.full_name} value={p.full_name}>{p.full_name} ({p.role})</option>)
                    : editors.map(name => <option key={name} value={name}>{name}</option>)
                  }
                </select>
              )}
            </div>

            <div>
              <label className={labelClass}>Due Date <span className="text-gray-300 normal-case font-medium">(optional)</span></label>
              <input type="date" className={inputClass} value={newAd.due_date ? newAd.due_date.split("T")[0] : ""} onChange={e => setNewAd({ ...newAd, due_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Brief Link (Milanote)</label>
              <input type="url" className={inputClass} placeholder="Optional" value={newAd.brief_link} onChange={e => setNewAd({ ...newAd, brief_link: e.target.value })} />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Destination URL <span className="text-gray-300 normal-case font-medium">(landing page for the ad)</span></label>
              <input type="url" list="destination-url-suggestions" className={inputClass} placeholder="https://..." value={newAd.destination_url || ""} onChange={e => setNewAd({ ...newAd, destination_url: e.target.value })} />
              <datalist id="destination-url-suggestions">
                {(destinationUrls || []).map(url => <option key={url} value={url} />)}
              </datalist>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Whitelisting Page <span className="text-gray-300 normal-case font-medium">(Facebook/Instagram page to run from)</span></label>
              <select className={selectClass} value={newAd.whitelisting_page || ""} onChange={e => setNewAd({ ...newAd, whitelisting_page: e.target.value })}>
                <option value="">— Select Whitelisting Page —</option>
                {whitelistPages.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="text-sm font-bold text-gray-400 px-4 py-2.5 hover:bg-gray-100 rounded-xl transition-all">Cancel</button>
            <button type="submit" className="bg-green-700 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-800 transition-all shadow-sm">
              Submit to Pipeline
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}