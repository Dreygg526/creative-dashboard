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
}

export default function AdDetailModal({
  selectedAd, ads, manualLogNote, setManualLogNote,
  setSelectedAd, onUpdate, onDelete
}: Props) {
  const daysLeft = getDaysLeftInTesting(selectedAd.live_date);
  const isLocked = selectedAd.status === "Testing" && daysLeft > 0;
  const revisionLimitReached = selectedAd.status === "Ad Revision" && (selectedAd.revision_count || 0) >= 2;
  const originalAdStatus = ads.find(a => a.id === selectedAd.id)?.status || selectedAd.status;
  const possibleTransitions = ALLOWED_TRANSITIONS[originalAdStatus] || [];

  let activityLog: TimeLogEntry[] = [];
  try { activityLog = JSON.parse(selectedAd.time_log || "[]"); } catch { activityLog = []; }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 md:p-4">
      <div className="bg-white rounded-[32px] w-full max-w-5xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">

        {/* Left: Edit Form */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto border-r border-slate-100 bg-white">
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black text-slate-800 leading-tight mb-2 tracking-tight">{selectedAd.concept_name}</h2>
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full uppercase border border-indigo-100 tracking-wider">{selectedAd.status}</span>
                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${getPriorityBadge(selectedAd.priority)}`}>{selectedAd.priority} Priority</span>
              </div>
            </div>
          </div>

          <form onSubmit={onUpdate} className="space-y-5">
            {isLocked && (
              <div className="bg-rose-50 border-2 border-rose-100 p-5 rounded-3xl flex items-start gap-3 shadow-inner animate-pulse">
                <span className="text-2xl">🔒</span>
                <div>
                  <p className="text-sm font-black text-rose-900 uppercase tracking-wide">Testing Lock Active</p>
                  <p className="text-xs text-rose-700 font-bold italic">Pipeline movement disabled. Unlocks in {daysLeft} days.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Move Stage</label>
                <select
                  disabled={isLocked}
                  className={`w-full border-2 p-3 rounded-2xl text-sm font-black transition-all ${isLocked ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "border-slate-100 bg-slate-50 text-slate-800 focus:border-indigo-500"}`}
                  value={selectedAd.status}
                  onChange={e => setSelectedAd({ ...selectedAd, status: e.target.value })}
                >
                  <option value={originalAdStatus}>{originalAdStatus} (Current)</option>
                  {possibleTransitions
                    .filter(s => !(s === "Ad Revision" && revisionLimitReached))
                    .map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Content Source</label>
                <select className="w-full border-2 p-3 rounded-2xl text-sm font-black border-slate-100 bg-slate-50 text-slate-800" value={selectedAd.content_source} onChange={e => setSelectedAd({ ...selectedAd, content_source: e.target.value })}>
                  <option>Internal Team</option><option>UGC Creator</option><option>AI Generated</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Editor</label>
                <input type="text" list="editor-autocomplete" className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm outline-none focus:border-indigo-400 bg-slate-50 font-bold" value={selectedAd.assigned_editor || ""} onChange={e => setSelectedAd({ ...selectedAd, assigned_editor: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Copywriter</label>
                <input type="text" list="copywriter-autocomplete" className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm outline-none focus:border-indigo-400 bg-slate-50 font-bold" value={selectedAd.assigned_copywriter || ""} onChange={e => setSelectedAd({ ...selectedAd, assigned_copywriter: e.target.value })} />
              </div>
            </div>

            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
              <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Internal Note (Appends to Log)</label>
              <textarea rows={2} className="w-full border-2 border-white p-3 rounded-xl text-sm outline-none focus:border-indigo-400 bg-white font-medium shadow-sm" placeholder="Explain action taken..." value={manualLogNote} onChange={e => setManualLogNote(e.target.value)} />
            </div>

            <div className="flex justify-between items-center mt-8 pt-5 border-t-2 border-slate-100">
              <div className="flex gap-2">
                <button type="button" onClick={() => { setSelectedAd(null); setManualLogNote(""); }} className="text-xs font-black text-slate-400 uppercase tracking-widest px-4 py-2 hover:bg-slate-50 rounded-xl transition-all">Close</button>
                <button type="button" onClick={onDelete} className="text-xs font-black text-rose-500 hover:text-rose-700 uppercase tracking-widest px-4 py-2 hover:bg-rose-50 rounded-xl transition-all">Delete Ad</button>
              </div>
              <button type="submit" className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-700 text-xs uppercase tracking-widest transition-all">Save Changes</button>
            </div>
          </form>
        </div>

        {/* Right: Time Log */}
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
                    <p className="text-[11px] text-indigo-700 font-bold italic leading-tight">"{log.note}"</p>
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