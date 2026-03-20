import { Ad, TimeLogEntry } from "../../types";
import { ALLOWED_TRANSITIONS } from "../../constants";
import { getPriorityBadge, getDaysLeftInTesting } from "../../utils/helpers";

interface Props {
  selectedAd: Ad;
  ads: Ad[];
  manualLogNote: string;
  setManualLogNote: (v: string) => void;
  setSelectedAd: (ad: Ad | null) => void;
  onUpdate: (e: React.FormEvent) => void;
  onDelete: () => void;
  currentRole: string;
  currentUser: string;
  allEditors?: string[];
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().split("T")[0];
}

function isOverdue(dateStr?: string) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export default function AdDetailModal({
  selectedAd, ads, manualLogNote, setManualLogNote,
  setSelectedAd, onUpdate, onDelete,
  currentRole, currentUser, allEditors = []
}: Props) {
  const daysLeft = getDaysLeftInTesting(selectedAd.live_date);
  const isLocked = selectedAd.status === "Testing" && daysLeft > 0;
  const revisionLimitReached = selectedAd.status === "Ad Revision" && (selectedAd.revision_count || 0) >= 2;
  const originalAdStatus = ads.find(a => a.id === selectedAd.id)?.status || selectedAd.status;
  const overdue = isOverdue(selectedAd.due_date) && !["Completed", "Killed"].includes(selectedAd.status);

  const isFounder = currentRole === "Founder";
  const isStrategist = currentRole === "Strategist";
  const isEditor = currentRole === "Editor" || currentRole === "Graphic Designer";
  const isVA = currentRole === "VA";
  const isContentCoord = currentRole === "Content Coordinator";

  const getAllowedTransitions = () => {
    if (isFounder) {
      return [
        "Idea", "Writing Brief", "Brief Revision Required", "Brief Approved",
        "Preparing Content", "Content Revision Required", "Content Ready",
        "Editor Assigned", "In Progress", "Ad Revision", "Pending Upload",
        "Testing", "Completed", "Killed"
      ].filter(s => s !== originalAdStatus);
    }
    const transitions = ALLOWED_TRANSITIONS[originalAdStatus] || [];
    return transitions.filter(s => !(s === "Ad Revision" && revisionLimitReached));
  };

  const canMoveStage = () => {
    if (isFounder) return true;
    if (isStrategist && (selectedAd.assigned_copywriter === currentUser || ["Ad Revision", "Testing"].includes(originalAdStatus))) return true;
    if (isEditor && selectedAd.assigned_editor === currentUser) return true;
    if (isVA && originalAdStatus === "Pending Upload") return true;
    if (isContentCoord && ["Preparing Content", "Content Revision Required"].includes(originalAdStatus)) return true;
    return false;
  };

  const canDelete = isFounder;
  const canReassign = isFounder;
  const stageMovable = canMoveStage() && !isLocked;
  const allowedTransitions = getAllowedTransitions();

  let activityLog: TimeLogEntry[] = [];
  try { activityLog = JSON.parse(selectedAd.time_log || "[]"); } catch { activityLog = []; }

  // ── EDITOR VIEW ──
  if (isEditor) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 md:p-4">
        <div className="bg-white rounded-[32px] w-full max-w-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
          <div className="flex-1 p-6 md:p-8 overflow-y-auto border-r border-slate-100">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-slate-800 mb-2">{selectedAd.concept_name}</h2>
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full uppercase border border-indigo-100">{selectedAd.status}</span>
                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${getPriorityBadge(selectedAd.priority)}`}>{selectedAd.priority} Priority</span>
                {overdue && (
                  <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-rose-100 text-rose-600 border border-rose-200 animate-pulse">
                    ⚠️ Overdue
                  </span>
                )}
              </div>
              {selectedAd.due_date && (
                <p className={`text-[10px] font-black mt-2 uppercase ${overdue ? "text-rose-500" : "text-slate-400"}`}>
                  Due: {new Date(selectedAd.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>

            <form onSubmit={onUpdate} className="space-y-4">
              {isLocked && (
                <div className="bg-rose-50 border-2 border-rose-100 p-5 rounded-3xl flex items-start gap-3">
                  <span className="text-2xl">🔒</span>
                  <div>
                    <p className="text-sm font-black text-rose-900 uppercase">Testing Lock Active</p>
                    <p className="text-xs text-rose-700 font-bold italic">Unlocks in {daysLeft} days.</p>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Move Stage</label>
                <select
                  disabled={!stageMovable}
                  className={`w-full border-2 p-3 rounded-2xl text-sm font-black transition-all ${!stageMovable ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "border-slate-100 bg-slate-50 text-slate-800 focus:border-indigo-500"}`}
                  value={selectedAd.status}
                  onChange={e => setSelectedAd({ ...selectedAd, status: e.target.value })}
                >
                  <option value={originalAdStatus}>{originalAdStatus} (Current)</option>
                  {stageMovable && allowedTransitions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Review Link (Frame.io)</label>
                <input
                  type="url"
                  className="w-full border-2 border-slate-100 bg-slate-50 p-3 rounded-2xl text-sm font-bold outline-none focus:border-indigo-400 text-slate-900"
                  placeholder="Paste Frame.io link..."
                  value={selectedAd.review_link || ""}
                  onChange={e => setSelectedAd({ ...selectedAd, review_link: e.target.value })}
                />
              </div>
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Internal Note</label>
                <textarea
                  rows={2}
                  className="w-full border-2 border-white p-3 rounded-xl text-sm outline-none focus:border-indigo-400 bg-white font-medium shadow-sm"
                  placeholder="Explain action taken..."
                  value={manualLogNote}
                  onChange={e => setManualLogNote(e.target.value)}
                />
              </div>
              <div className="flex justify-between items-center mt-6 pt-4 border-t-2 border-slate-100">
                <button type="button" onClick={() => { setSelectedAd(null); setManualLogNote(""); }} className="text-xs font-black text-slate-400 uppercase tracking-widest px-4 py-2 hover:bg-slate-50 rounded-xl">Close</button>
                <button type="submit" className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-700 text-xs uppercase tracking-widest">Save Changes</button>
              </div>
            </form>
          </div>
          <div className="w-full md:w-72 bg-slate-50 p-6 flex flex-col max-h-full">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Time Log</h3>
            <div className="flex-1 overflow-y-auto space-y-4">
              {[...activityLog].reverse().map((log, idx) => (
                <div key={idx} className="relative pl-5 border-l-2 border-indigo-100">
                  <div className="absolute w-2.5 h-2.5 bg-indigo-500 rounded-full -left-[6px] top-0.5 border-2 border-white shadow-sm"></div>
                  <p className="text-[11px] font-black text-slate-800 mb-0.5">{log.action}</p>
                  <p className="text-[10px] text-slate-500 font-bold mb-1">by {log.user}</p>
                  {log.note && <div className="bg-white p-2 rounded-lg border border-slate-100 mb-1"><p className="text-[11px] text-indigo-700 font-bold italic">"{log.note}"</p></div>}
                  <p className="text-[9px] text-slate-400 uppercase tracking-tighter">{new Date(log.timestamp).toLocaleDateString()} • {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── VA VIEW ──
  if (isVA) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 md:p-4">
        <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl p-8">
          <h2 className="text-2xl font-black text-slate-800 mb-2">{selectedAd.concept_name}</h2>
          <div className="flex gap-2 mb-6">
            <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full uppercase border border-indigo-100">{selectedAd.status}</span>
          </div>
          <form onSubmit={onUpdate} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Move Stage</label>
              <select
                className="w-full border-2 border-slate-100 bg-slate-50 p-3 rounded-2xl text-sm font-black text-slate-900"
                value={selectedAd.status}
                onChange={e => setSelectedAd({ ...selectedAd, status: e.target.value })}
              >
                <option value="Pending Upload">Pending Upload (Current)</option>
                <option value="Testing">Testing</option>
              </select>
            </div>
            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
              <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Upload Note</label>
              <textarea rows={2} className="w-full border-2 border-white p-3 rounded-xl text-sm outline-none focus:border-indigo-400 bg-white font-medium" placeholder="Log upload details..." value={manualLogNote} onChange={e => setManualLogNote(e.target.value)} />
            </div>
            <div className="flex justify-between items-center pt-4 border-t-2 border-slate-100">
              <button type="button" onClick={() => { setSelectedAd(null); setManualLogNote(""); }} className="text-xs font-black text-slate-400 uppercase tracking-widest px-4 py-2 hover:bg-slate-50 rounded-xl">Close</button>
              <button type="submit" className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-700 text-xs uppercase tracking-widest">Mark as Uploaded</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── CONTENT COORDINATOR VIEW ──
  if (isContentCoord) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 md:p-4">
        <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl p-8">
          <h2 className="text-2xl font-black text-slate-800 mb-2">{selectedAd.concept_name}</h2>
          <div className="flex gap-2 mb-6">
            <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full uppercase border border-indigo-100">{selectedAd.status}</span>
          </div>
          <form onSubmit={onUpdate} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Move Stage</label>
              <select
                disabled={!stageMovable}
                className={`w-full border-2 p-3 rounded-2xl text-sm font-black ${!stageMovable ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "border-slate-100 bg-slate-50 text-slate-900"}`}
                value={selectedAd.status}
                onChange={e => setSelectedAd({ ...selectedAd, status: e.target.value })}
              >
                <option value={originalAdStatus}>{originalAdStatus} (Current)</option>
                {stageMovable && allowedTransitions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
              <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Note</label>
              <textarea rows={2} className="w-full border-2 border-white p-3 rounded-xl text-sm outline-none focus:border-indigo-400 bg-white font-medium" placeholder="Add a note..." value={manualLogNote} onChange={e => setManualLogNote(e.target.value)} />
            </div>
            <div className="flex justify-between items-center pt-4 border-t-2 border-slate-100">
              <button type="button" onClick={() => { setSelectedAd(null); setManualLogNote(""); }} className="text-xs font-black text-slate-400 uppercase px-4 py-2 hover:bg-slate-50 rounded-xl">Close</button>
              <button type="submit" className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-700 text-xs uppercase tracking-widest">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── FOUNDER / STRATEGIST FULL VIEW ──
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 md:p-4">
      <div className="bg-white rounded-[32px] w-full max-w-5xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
        <div className="flex-1 p-6 md:p-8 overflow-y-auto border-r border-slate-100 bg-white">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-800 leading-tight mb-2">{selectedAd.concept_name}</h2>
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full uppercase border border-indigo-100">{selectedAd.status}</span>
              <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${getPriorityBadge(selectedAd.priority)}`}>{selectedAd.priority} Priority</span>
              {overdue && (
                <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-rose-100 text-rose-600 border border-rose-200 animate-pulse">
                  ⚠️ Overdue
                </span>
              )}
            </div>
          </div>

          <form onSubmit={onUpdate} className="space-y-5">
            {isLocked && !isFounder && (
              <div className="bg-rose-50 border-2 border-rose-100 p-5 rounded-3xl flex items-start gap-3 animate-pulse">
                <span className="text-2xl">🔒</span>
                <div>
                  <p className="text-sm font-black text-rose-900 uppercase">Testing Lock Active</p>
                  <p className="text-xs text-rose-700 font-bold italic">Pipeline movement disabled. Unlocks in {daysLeft} days.</p>
                </div>
              </div>
            )}
            {isFounder && isLocked && (
              <div className="bg-amber-50 border-2 border-amber-100 p-4 rounded-3xl flex items-center gap-3">
                <span className="text-xl">⚡</span>
                <p className="text-sm font-black text-amber-800">Founder Override — Testing lock bypassed</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Move Stage</label>
                <select
                  className="w-full border-2 border-slate-100 bg-slate-50 p-3 rounded-2xl text-sm font-black focus:border-indigo-500 text-slate-900"
                  value={selectedAd.status}
                  onChange={e => setSelectedAd({ ...selectedAd, status: e.target.value })}
                >
                  <option value={originalAdStatus}>{originalAdStatus} (Current)</option>
                  {allowedTransitions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Content Source</label>
                <select
                  className="w-full border-2 p-3 rounded-2xl text-sm font-black border-slate-100 bg-slate-50 text-slate-900"
                  value={selectedAd.content_source}
                  onChange={e => setSelectedAd({ ...selectedAd, content_source: e.target.value })}
                >
                  <option>Internal Team</option><option>UGC Creator</option><option>AI Generated</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Editor {!canReassign && <span className="text-slate-300 normal-case">(locked)</span>}
                </label>
                {canReassign ? (
                  <select
                    className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm bg-slate-50 font-bold outline-none focus:border-indigo-400 text-slate-900"
                    value={selectedAd.assigned_editor || ""}
                    onChange={e => setSelectedAd({ ...selectedAd, assigned_editor: e.target.value })}
                  >
                    <option value="">— Unassigned —</option>
                    {allEditors.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                ) : (
                  <input disabled className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm bg-slate-100 font-bold text-slate-400 cursor-not-allowed" value={selectedAd.assigned_editor || "Unassigned"} />
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Result</label>
                <select
                  className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm bg-slate-50 font-bold outline-none focus:border-indigo-400 text-slate-900"
                  value={selectedAd.result || ""}
                  onChange={e => setSelectedAd({ ...selectedAd, result: e.target.value })}
                >
                  <option value="">— No Result —</option>
                  <option>Winner</option><option>Loser</option><option>Inconclusive</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Review Link (Frame.io)</label>
                <input
                  type="url"
                  className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm outline-none focus:border-indigo-400 bg-slate-50 font-bold text-slate-900"
                  placeholder="Optional"
                  value={selectedAd.review_link || ""}
                  onChange={e => setSelectedAd({ ...selectedAd, review_link: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  className={`w-full border-2 p-3 rounded-xl text-sm outline-none focus:border-indigo-400 bg-slate-50 font-bold text-slate-900 ${overdue ? "border-rose-300 bg-rose-50" : "border-slate-100"}`}
                  value={formatDate(selectedAd.due_date)}
                  onChange={e => setSelectedAd({ ...selectedAd, due_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                />
                {overdue && <p className="text-[9px] font-black text-rose-500 mt-1">⚠️ This ad is overdue!</p>}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Notes</label>
              <textarea
                rows={2}
                className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm outline-none focus:border-indigo-400 bg-slate-50 font-medium resize-none text-slate-900"
                placeholder="Optional notes..."
                value={selectedAd.notes || ""}
                onChange={e => setSelectedAd({ ...selectedAd, notes: e.target.value })}
              />
            </div>

            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
              <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Internal Note (Appends to Log)</label>
              <textarea
                rows={2}
                className="w-full border-2 border-white p-3 rounded-xl text-sm outline-none focus:border-indigo-400 bg-white font-medium shadow-sm"
                placeholder="Explain action taken..."
                value={manualLogNote}
                onChange={e => setManualLogNote(e.target.value)}
              />
            </div>

            <div className="flex justify-between items-center mt-8 pt-5 border-t-2 border-slate-100">
              <div className="flex gap-2">
                <button type="button" onClick={() => { setSelectedAd(null); setManualLogNote(""); }} className="text-xs font-black text-slate-400 uppercase tracking-widest px-4 py-2 hover:bg-slate-50 rounded-xl">Close</button>
                {canDelete && (
                  <button type="button" onClick={onDelete} className="text-xs font-black text-rose-500 hover:text-rose-700 uppercase tracking-widest px-4 py-2 hover:bg-rose-50 rounded-xl">Delete Ad</button>
                )}
              </div>
              <button type="submit" className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-700 text-xs uppercase tracking-widest">Save Changes</button>
            </div>
          </form>
        </div>

        {/* Time Log */}
        <div className="w-full md:w-80 bg-slate-50 border-l border-slate-100 p-6 flex flex-col max-h-full">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Time Log</h3>
          <div className="flex-1 overflow-y-auto space-y-6">
            {[...activityLog].reverse().map((log, idx) => (
              <div key={idx} className="relative pl-5 border-l-2 border-indigo-100">
                <div className="absolute w-2.5 h-2.5 bg-indigo-500 rounded-full -left-[6px] top-0.5 border-2 border-white shadow-sm"></div>
                <p className="text-[11px] font-black text-slate-800 mb-0.5">{log.action}</p>
                <p className="text-[10px] text-slate-500 font-bold mb-1.5">by {log.user}</p>
                {log.note && (
                  <div className="bg-white p-2 rounded-lg border border-slate-100 mb-2">
                    <p className="text-[11px] text-indigo-700 font-bold italic">"{log.note}"</p>
                  </div>
                )}
                <p className="text-[9px] text-slate-400 font-medium uppercase tracking-tighter">
                  {new Date(log.timestamp).toLocaleDateString()} • {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}