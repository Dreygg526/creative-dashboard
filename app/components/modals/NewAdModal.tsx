import { useMemo } from "react";
import { Ad, NewAdForm } from "../../types";

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
  subAvatars?: string[];
  angles?: string[];
  concepts?: string[];
  ads?: Ad[];
}

function getWeekLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((day + 6) % 7));
  return monday.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function NewAdModal({
  newAd, setNewAd, onSubmit, onClose,
  editors, currentRole, currentUser, allEditorProfiles = [],
  allStrategistProfiles = [], products = [], whitelistPages = [], destinationUrls = [],
  subAvatars = [], angles = [], concepts = [], ads = []
}: Props) {
  const isFounder = currentRole === "Founder";
  const isStrategist = currentRole === "Strategist";
  const isEditor = currentRole === "Editor" || currentRole === "Graphic Designer";
  const defaultStrategist = (isFounder || isStrategist) ? currentUser || "" : "";

  const inputClass = "w-full border border-gray-700 bg-[#0d0d0f] p-3.5 rounded-xl text-sm font-medium outline-none focus:border-gray-500 transition-all placeholder:text-gray-600 text-gray-100";
  const selectClass = "w-full border border-gray-700 bg-[#1a1a1d] p-3.5 rounded-xl text-sm font-black outline-none focus:border-gray-500 transition-all text-gray-200";
  const labelClass = "block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest";

  // ── DUPLICATE DETECTION ──
  const duplicateMatches = useMemo(() => {
    if (!newAd.concept && !newAd.sub_avatar) return [];
    return ads.filter(ad => {
      const conceptMatch = newAd.concept && ad.concept && ad.concept === newAd.concept;
      const subAvatarMatch = newAd.sub_avatar && ad.sub_avatar && ad.sub_avatar === newAd.sub_avatar;
      return conceptMatch && subAvatarMatch;
    });
  }, [ads, newAd.concept, newAd.sub_avatar]);

  const duplicateWarning = useMemo(() => {
    if (duplicateMatches.length === 0) return null;
    const tested = duplicateMatches.filter(a => ["Testing", "Winner", "Killed"].includes(a.status));
    const winners = duplicateMatches.filter(a => a.result === "Winner" || a.status === "Winner");
    const losers = duplicateMatches.filter(a => a.result === "Loser");
    return { matches: duplicateMatches, tested, winners, losers };
  }, [duplicateMatches]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#141416] rounded-2xl w-full max-w-lg shadow-2xl max-h-[95vh] overflow-y-auto border border-gray-800">
        <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-100">New Creative Concept</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#1a1a1d] text-gray-500 hover:text-gray-300 transition-all font-black">✕</button>
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
                <option>New</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Awareness</label>
              <select className={selectClass} value={newAd.awareness || ""} onChange={e => setNewAd({ ...newAd, awareness: e.target.value })}>
                <option value="">— Select Awareness —</option>
                <option value="Unaware">Unaware</option>
                <option value="Problem aware">Problem aware</option>
                <option value="Solution aware">Solution aware</option>
                <option value="Product aware">Product aware</option>
                <option value="Most aware">Most aware</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Sub Avatar</label>
              <select className={selectClass} value={newAd.sub_avatar || ""} onChange={e => setNewAd({ ...newAd, sub_avatar: e.target.value })}>
                <option value="">— Select Sub Avatar —</option>
                {subAvatars.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}>Angle</label>
              <select className={selectClass} value={newAd.angle || ""} onChange={e => setNewAd({ ...newAd, angle: e.target.value })}>
                <option value="">— Select Angle —</option>
                {angles.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Concept</label>
              <select className={selectClass} value={newAd.concept || ""} onChange={e => setNewAd({ ...newAd, concept: e.target.value })}>
                <option value="">— Select Concept —</option>
                {concepts.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* ── DUPLICATE WARNING ── */}
            {duplicateWarning && (
              <div className="md:col-span-2">
                <div className={`rounded-2xl p-4 border-2 ${
                  duplicateWarning.winners.length > 0
                    ? "bg-green-950/30 border-green-800"
                    : duplicateWarning.losers.length > 0
                    ? "bg-red-950/30 border-red-800"
                    : "bg-amber-950/30 border-amber-800"
                }`}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl shrink-0">
                      {duplicateWarning.winners.length > 0 ? "🏆" : duplicateWarning.losers.length > 0 ? "⚠️" : "🔁"}
                    </span>
                    <div className="flex-1">
                      <p className={`text-[11px] font-black uppercase tracking-widest mb-2 ${
                        duplicateWarning.winners.length > 0 ? "text-green-400" :
                        duplicateWarning.losers.length > 0 ? "text-red-400" :
                        "text-amber-400"
                      }`}>
                        {duplicateWarning.winners.length > 0
                          ? "This combo already produced a winner!"
                          : duplicateWarning.losers.length > 0
                          ? "This combo was already tested and lost"
                          : "This concept + sub avatar combo was already used"}
                      </p>
                      <div className="space-y-1.5">
                        {duplicateWarning.matches.slice(0, 3).map(ad => (
                          <div key={ad.id} className="bg-[#141416] rounded-xl px-3 py-2 border border-gray-700 flex items-center justify-between gap-2">
                            <div>
                              {ad.imprint_number && (
                                <span className="text-[9px] font-black font-mono text-amber-500 mr-2">DTC #{ad.imprint_number}</span>
                              )}
                              <span className="text-[11px] font-black text-gray-100">{ad.concept_name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {ad.result && (
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                  ad.result === "Winner" ? "bg-green-950 text-green-400" :
                                  ad.result === "Loser" ? "bg-red-950 text-red-400" :
                                  "bg-[#0d0d0f] text-gray-500"
                                }`}>{ad.result}</span>
                              )}
                              <span className="text-[9px] font-bold text-gray-500">
                                {ad.created_at ? `Week of ${getWeekLabel(ad.created_at)}` : ""}
                              </span>
                            </div>
                          </div>
                        ))}
                        {duplicateWarning.matches.length > 3 && (
                          <p className="text-[10px] font-bold text-gray-500 pl-1">+{duplicateWarning.matches.length - 3} more</p>
                        )}
                      </div>
                      {duplicateWarning.winners.length > 0 && (
                        <p className="text-[10px] font-bold text-green-500 mt-2">Consider iterating on this instead of starting fresh.</p>
                      )}
                      {duplicateWarning.losers.length > 0 && duplicateWarning.winners.length === 0 && (
                        <p className="text-[10px] font-bold text-red-400 mt-2">Are you sure you want to test this combo again?</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(isFounder || isStrategist) && (
              <div>
                <label className={labelClass}>Priority</label>
                <select className={selectClass} value={newAd.priority} onChange={e => setNewAd({ ...newAd, priority: e.target.value })}>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
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
                <label className={labelClass}>Strategist <span className="text-gray-600 normal-case font-medium">(optional)</span></label>
                {isStrategist ? (
                  <input disabled className="w-full border border-gray-800 bg-[#0d0d0f] p-3.5 rounded-xl text-sm font-bold text-gray-500 cursor-not-allowed" value={`${currentUser || ""} (${currentRole})`} />
                ) : (
                  <select className={selectClass} value={newAd.assigned_copywriter || defaultStrategist} onChange={e => setNewAd({ ...newAd, assigned_copywriter: e.target.value })}>
                    <option value="">— Select Strategist —</option>
                    {allStrategistProfiles.map(p => <option key={p.full_name} value={p.full_name}>{p.full_name} ({p.role})</option>)}
                  </select>
                )}
              </div>
            )}

            <div>
              <label className={labelClass}>Editor <span className="text-gray-600 normal-case font-medium">(optional)</span></label>
              {isEditor ? (
                <input disabled className="w-full border border-gray-800 bg-[#0d0d0f] p-3.5 rounded-xl text-sm font-bold text-gray-500 cursor-not-allowed" value={`${currentUser || ""} (${currentRole})`} />
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
              <label className={labelClass}>Due Date <span className="text-gray-600 normal-case font-medium">(optional)</span></label>
              <input type="date" className={inputClass} value={newAd.due_date ? newAd.due_date.split("T")[0] : ""} onChange={e => setNewAd({ ...newAd, due_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Brief Link (Milanote)</label>
              <input type="url" className={inputClass} placeholder="Optional" value={newAd.brief_link} onChange={e => setNewAd({ ...newAd, brief_link: e.target.value })} />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Destination URLs <span className="text-gray-600 normal-case font-medium">(landing pages — add multiple for A/B test)</span></label>
              <div className="space-y-2">
                {(newAd.destination_url || []).map((url, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="url"
                      list="destination-url-suggestions"
                      className={inputClass}
                      placeholder="https://..."
                      value={url}
                      onChange={e => {
                        const updated = [...(newAd.destination_url || [])];
                        updated[i] = e.target.value;
                        setNewAd({ ...newAd, destination_url: updated });
                      }}
                    />
                    <button type="button" onClick={() => {
                      const updated = (newAd.destination_url || []).filter((_, idx) => idx !== i);
                      setNewAd({ ...newAd, destination_url: updated });
                    }} className="text-red-400 hover:text-red-300 font-black px-2">✕</button>
                  </div>
                ))}
                <datalist id="destination-url-suggestions">
                  {(destinationUrls || []).map(url => <option key={url} value={url} />)}
                </datalist>
                <button type="button" onClick={() => setNewAd({ ...newAd, destination_url: [...(newAd.destination_url || []), ""] })}
                  className="text-[10px] font-black text-gray-300 hover:text-white uppercase tracking-widest">
                  + Add URL
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Whitelisting Pages <span className="text-gray-600 normal-case font-medium">(FB/IG pages — add multiple for A/B test)</span></label>
              <div className="space-y-2">
                {(newAd.whitelisting_page || []).map((page, i) => (
                  <div key={i} className="flex gap-2">
                    <select className={selectClass} value={page} onChange={e => {
                      const updated = [...(newAd.whitelisting_page || [])];
                      updated[i] = e.target.value;
                      setNewAd({ ...newAd, whitelisting_page: updated });
                    }}>
                      <option value="">— Select Page —</option>
                      {whitelistPages.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <button type="button" onClick={() => {
                      const updated = (newAd.whitelisting_page || []).filter((_, idx) => idx !== i);
                      setNewAd({ ...newAd, whitelisting_page: updated });
                    }} className="text-red-400 hover:text-red-300 font-black px-2">✕</button>
                  </div>
                ))}
                <button type="button" onClick={() => setNewAd({ ...newAd, whitelisting_page: [...(newAd.whitelisting_page || []), ""] })}
                  className="text-[10px] font-black text-gray-300 hover:text-white uppercase tracking-widest">
                  + Add Page
                </button>
              </div>
            </div>

          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <button type="button" onClick={onClose} className="text-sm font-bold text-gray-400 px-4 py-2.5 hover:bg-[#1a1a1d] rounded-xl transition-all">Cancel</button>
            <button type="submit" className="bg-gray-100 text-gray-900 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white transition-all shadow-sm">
              Submit to Pipeline
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}