import { useState, useEffect } from "react";
import { Ad, TimeLogEntry } from "../../types";
import { ALLOWED_TRANSITIONS } from "../../constants";
import { getDaysLeftInTesting } from "../../utils/helpers";
import { useComments } from "../../hooks/useComments";

interface EditorProfile {
  full_name: string;
  role: string;
}

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
  allEditorProfiles?: EditorProfile[];
  allStrategists?: string[];
  allStrategistProfiles?: EditorProfile[];
  supabase: any;
  activeSession?: { sessionId: string; elapsedSeconds: number; startedAt: string } | null;
  onFinishSession?: () => void;
  fetchSessionsForAd?: (adId: string) => Promise<any[]>;
  fetchAllSessions?: () => Promise<any[]>;
  formatTimer?: (seconds: number) => string;
  products?: string[];
  whitelistPages?: string[];
  destinationUrls?: string[];
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().split("T")[0];
}

function isOverdue(dateStr?: string) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function fmtDuration(seconds: number) {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function EditableTitle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const commit = () => { setEditing(false); if (draft.trim()) onChange(draft.trim()); else setDraft(value); };
  if (editing) {
    return (
      <input autoFocus className="text-2xl font-black text-gray-900 leading-tight mb-2 w-full border-b-2 border-green-500 bg-transparent outline-none"
        value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={commit} onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }} />
    );
  }
  return (
    <h2 className="text-2xl font-black text-gray-900 leading-tight mb-2 cursor-pointer hover:text-green-700 transition-colors group flex items-center gap-2"
      onClick={() => { setDraft(value); setEditing(true); }} title="Click to rename">
      {value}
      <span className="text-sm text-gray-300 group-hover:text-green-500 transition-colors">✏️</span>
    </h2>
  );
}

function canUserModify(ad: Ad, originalStatus: string, currentRole: string, currentUser: string): { allowed: boolean; reason: string } {
  if (currentRole === "Founder") return { allowed: true, reason: "" };
  if (currentRole === "Strategist") {
    if (ad.assigned_copywriter === currentUser || ["Ad Revision", "Testing", "Writing Brief", "Brief Revision Required", "Done, Waiting for Approval"].includes(originalStatus)) return { allowed: true, reason: "" };
    return { allowed: false, reason: `⛔ Access Denied — You are not the assigned strategist for this ad.` };
  }
  if (currentRole === "Editor" || currentRole === "Graphic Designer") {
    if (ad.assigned_editor === currentUser || originalStatus === "Done, Waiting for Approval") return { allowed: true, reason: "" };
    return { allowed: false, reason: `⛔ Access Denied — This ad is not assigned to you. Only ${ad.assigned_editor || "the assigned editor"} can make changes.` };
  }
  if (currentRole === "VA") {
    if (originalStatus === "Pending Upload") return { allowed: true, reason: "" };
    return { allowed: false, reason: `⛔ Access Denied — You can only update ads at Pending Upload stage.` };
  }
  if (currentRole === "Media Buyer") {
    if (["Pending Upload", "Testing"].includes(originalStatus)) return { allowed: true, reason: "" };
    return { allowed: false, reason: `⛔ Access Denied — You can only update ads at Pending Upload or Testing stage.` };
  }
  if (currentRole === "Content Coordinator") {
    if (["Preparing Content", "Content Revision Required"].includes(originalStatus)) return { allowed: true, reason: "" };
    return { allowed: false, reason: `⛔ Access Denied — You can only update ads at content stages.` };
  }
  return { allowed: false, reason: "⛔ Access Denied — You do not have permission to modify this ad." };
}

function CommentsSection({ adId, adName, assignedEditor, assignedCopywriter, currentUser, currentRole, supabase }: {
  adId: string; adName: string; assignedEditor: string; assignedCopywriter: string;
  currentUser: string; currentRole: string; supabase: any;
}) {
  const { comments, fetchComments, newComment, setNewComment, isSubmitting, submitComment, deleteComment } = useComments(supabase, currentUser);
  const isFounder = currentRole === "Founder";
  useEffect(() => { fetchComments(adId); }, [adId]);

  return (
    <div className="mt-2">
      <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-[11px] text-gray-400 font-bold italic text-center py-4">No comments yet</p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="bg-gray-50 rounded-xl p-3 group border border-gray-100">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center font-black text-green-700 text-[9px]">{comment.posted_by?.charAt(0)?.toUpperCase()}</div>
                    <span className="text-[10px] font-black text-gray-700">{comment.posted_by}</span>
                    <span className="text-[9px] text-gray-400">{new Date(comment.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                  </div>
                  <p className="text-[12px] text-gray-600 font-medium leading-snug pl-7">{comment.message}</p>
                </div>
                {(isFounder || comment.posted_by === currentUser) && (
                  <button onClick={() => deleteComment(comment.id, adId)} className="text-[9px] font-black text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all px-2 py-1 rounded-lg shrink-0">✕</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <input type="text" placeholder="Add a comment..." className="flex-1 border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm font-medium outline-none focus:border-green-500 transition-all placeholder:text-gray-300 text-gray-800" value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(adId, adName, assignedEditor, assignedCopywriter); } }} />
        <button onClick={() => submitComment(adId, adName, assignedEditor, assignedCopywriter)} disabled={isSubmitting || !newComment.trim()} className="bg-green-700 text-white px-4 py-3 rounded-xl font-black text-xs hover:bg-green-800 transition-all disabled:opacity-40 shrink-0">{isSubmitting ? "..." : "Post"}</button>
      </div>
    </div>
  );
}

function MonitoringTab({ adId, fetchSessionsForAd }: { adId: string; fetchSessionsForAd?: (adId: string) => Promise<any[]>; }) {
  const [sessions, setSessions] = useState<any[]>([]);
  useEffect(() => { if (fetchSessionsForAd) fetchSessionsForAd(adId).then(setSessions); }, [adId]);

  const summary: Record<string, { sessions: number; totalSeconds: number; lastSeen: string }> = {};
  sessions.forEach(s => {
    if (!summary[s.user_name]) summary[s.user_name] = { sessions: 0, totalSeconds: 0, lastSeen: s.started_at };
    summary[s.user_name].sessions += 1;
    summary[s.user_name].totalSeconds += s.total_seconds || 0;
    if (new Date(s.started_at) > new Date(summary[s.user_name].lastSeen)) summary[s.user_name].lastSeen = s.started_at;
  });

  return (
    <div className="flex-1 overflow-y-auto">
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
          <div className="text-4xl mb-2">👁️</div>
          <p className="text-[11px] font-bold text-center">No sessions recorded yet</p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Summary</p>
            <div className="space-y-2">
              {Object.entries(summary).map(([user, data]) => (
                <div key={user} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center font-black text-green-700 text-[9px]">{user.charAt(0).toUpperCase()}</div>
                      <span className="text-[11px] font-black text-gray-700">{user}</span>
                    </div>
                    <span className="text-[10px] font-black text-green-700">{fmtDuration(data.totalSeconds)}</span>
                  </div>
                  <div className="flex items-center justify-between pl-7">
                    <span className="text-[9px] text-gray-400">{data.sessions} session{data.sessions !== 1 ? "s" : ""}</span>
                    <span className="text-[9px] text-gray-400">Last: {new Date(data.lastSeen).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Session Log</p>
          <div className="space-y-2">
            {sessions.map((s, idx) => (
              <div key={idx} className="relative pl-4 border-l-2 border-gray-200">
                <div className="absolute w-2 h-2 bg-gray-300 rounded-full -left-[5px] top-1" />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-700">{s.user_name}</span>
                  <span className="text-[9px] font-bold text-gray-400">{s.user_role}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[9px] text-gray-400">{new Date(s.started_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${s.is_active ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-700"}`}>{s.is_active ? "Active" : fmtDuration(s.total_seconds)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-all font-black z-10 border border-gray-200 text-sm"
    >
      ✕
    </button>
  );
}

function AdSetNameBar({ selectedAd }: { selectedAd: Ad }) {
  const adSetName = [
    selectedAd.imprint_number ? `DTC #${String(selectedAd.imprint_number).padStart(4, "0")}` : "",
    selectedAd.ad_format || "",
    selectedAd.product || "",
    selectedAd.assigned_editor ? `Editor: ${selectedAd.assigned_editor}` : "",
    selectedAd.assigned_copywriter ? `Strategist: ${selectedAd.assigned_copywriter}` : "",
  ].filter(Boolean).join(" || ");

  return (
    <div className="px-4 py-2.5 border-b border-gray-100">
      <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">📋 Ad Set Name — Click to Select & Copy</p>
      <div className="inline-block bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 max-w-full">
        <input
          readOnly
          onFocus={e => e.target.select()}
          onClick={e => (e.target as HTMLInputElement).select()}
          className="text-[11px] font-black text-amber-700 bg-transparent outline-none cursor-pointer font-mono max-w-full"
          style={{ width: `${adSetName.length}ch` }}
          value={adSetName}
        />
      </div>
    </div>
  );
}

function ReadOnlyView({ selectedAd, setSelectedAd, setManualLogNote, currentUser, currentRole, supabase, reason }: {
  selectedAd: Ad; setSelectedAd: (ad: Ad | null) => void; setManualLogNote: (v: string) => void;
  currentUser: string; currentRole: string; supabase: any; reason: string;
}) {
  let activityLog: TimeLogEntry[] = [];
  try { activityLog = JSON.parse(selectedAd.time_log || "[]"); } catch { activityLog = []; }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative w-full max-w-3xl">
        <CloseButton onClose={() => { setSelectedAd(null); setManualLogNote(""); }} />
        <div className="bg-white rounded-2xl w-full shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh] border border-gray-200">
          <div className="flex-1 overflow-y-auto border-r border-gray-100">
            <div className="p-6">
              {selectedAd.imprint_number && (
                <div className="mb-3 bg-amber-50 rounded-xl px-3 py-2 border border-amber-200">
                  <p className="text-[10px] font-black font-mono text-amber-700 whitespace-nowrap tracking-wide">
                    DTC #{String(selectedAd.imprint_number).padStart(4, "0")} — {selectedAd.ad_format} | {selectedAd.concept_name}
                  </p>
                </div>
              )}
              <EditableTitle value={selectedAd.concept_name} onChange={v => setSelectedAd({ ...selectedAd, concept_name: v })} />
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-[10px] font-black text-green-700 bg-green-100 px-3 py-1 rounded-full uppercase border border-green-200">{selectedAd.status}</span>
                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                  selectedAd.priority === "High" ? "bg-red-100 text-red-600 border-red-200" :
                  selectedAd.priority === "Medium" ? "bg-amber-100 text-amber-600 border-amber-200" :
                  "bg-gray-100 text-gray-500 border-gray-200"
                }`}>{selectedAd.priority} Priority</span>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                <p className="text-[11px] font-black text-red-600 leading-relaxed">{reason}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Ad Type", value: selectedAd.ad_type },
                  { label: "Format", value: selectedAd.ad_format },
                  { label: "Strategist", value: selectedAd.assigned_copywriter },
                  { label: "Editor", value: selectedAd.assigned_editor },
                  ...(selectedAd.product ? [{ label: "Product", value: selectedAd.product }] : []),
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{item.label}</p>
                    <p className="text-sm font-black text-gray-700">{item.value || "—"}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Comments</p>
                <CommentsSection adId={selectedAd.id} adName={selectedAd.concept_name} assignedEditor={selectedAd.assigned_editor} assignedCopywriter={selectedAd.assigned_copywriter} currentUser={currentUser} currentRole={currentRole} supabase={supabase} />
              </div>
              <div className="pt-4 border-t border-gray-100 mt-4">
                <button type="button" onClick={() => { setSelectedAd(null); setManualLogNote(""); }} className="text-xs font-black text-gray-400 uppercase tracking-widest px-4 py-2 hover:bg-gray-100 rounded-xl">Close</button>
              </div>
            </div>
          </div>
          <div className="w-full md:w-64 bg-gray-50 p-5 flex flex-col max-h-full">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Activity Log</h3>
            <div className="flex-1 overflow-y-auto space-y-4">
              {[...activityLog].reverse().map((log, idx) => (
                <div key={idx} className="relative pl-4 border-l-2 border-green-200">
                  <div className="absolute w-2.5 h-2.5 bg-green-500 rounded-full -left-[6px] top-0.5 border-2 border-gray-50" />
                  <p className="text-[11px] font-black text-gray-700 mb-0.5">{log.action}</p>
                  <p className="text-[10px] text-gray-400 font-bold mb-1">by {log.user}</p>
                  {log.note && <div className="bg-white p-2 rounded-lg border border-gray-100 mb-1"><p className="text-[11px] text-green-700 font-bold italic">"{log.note}"</p></div>}
                  <p className="text-[9px] text-gray-300 uppercase tracking-tighter">{new Date(log.timestamp).toLocaleDateString()} • {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdDetailModal({
  selectedAd, ads, manualLogNote, setManualLogNote,
  setSelectedAd, onUpdate, onDelete,
  currentRole, currentUser, allEditors = [], allEditorProfiles = [],
  allStrategists = [], allStrategistProfiles = [], supabase,
  activeSession, onFinishSession, fetchSessionsForAd, fetchAllSessions, formatTimer,
  products = [],
  whitelistPages = [],
  destinationUrls = []
}: Props) {
  const daysLeft = getDaysLeftInTesting(selectedAd.live_date);
  const isLocked = selectedAd.status === "Testing" && daysLeft > 0;
  const originalAd = ads.find(a => a.id === selectedAd.id);
  const originalAdStatus = originalAd?.status || selectedAd.status;
  const revisionLimitReached = originalAdStatus === "Ad Revision" && (originalAd?.revision_count || 0) >= 2;
  const overdue = isOverdue(selectedAd.due_date) && !["Winner", "Killed"].includes(selectedAd.status);
  const showResult = ["Testing", "Winner"].includes(originalAdStatus);

  const isFounder = currentRole === "Founder";
  const isStrategist = currentRole === "Strategist";
  const isEditor = currentRole === "Editor" || currentRole === "Graphic Designer";
  const isVA = currentRole === "VA";
  const isContentCoord = currentRole === "Content Coordinator";
  const isMediaBuyer = currentRole === "Media Buyer";

  const { allowed, reason } = canUserModify(selectedAd, originalAdStatus, currentRole, currentUser);

  const getAllowedTransitions = () => {
    if (isFounder) {
      return ["Idea", "Writing Brief", "Brief Revision Required", "Brief Approved", "Editor Assigned", "In Progress", "Ad Revision", "Pending Upload", "Testing", "Winner", "Killed"]
        .filter(s => s !== originalAdStatus)
        .filter(s => !(s === "Ad Revision" && revisionLimitReached));
    }
    const transitions = ALLOWED_TRANSITIONS[originalAdStatus] || [];
    return transitions.filter(s => !(s === "Ad Revision" && revisionLimitReached)).filter(s => s !== "Killed");
  };

  const canDelete = isFounder;
  const canReassign = isFounder;
  const stageMovable = !isLocked || isFounder;
  const allowedTransitions = getAllowedTransitions();

  let activityLog: TimeLogEntry[] = [];
  try { activityLog = JSON.parse(selectedAd.time_log || "[]"); } catch { activityLog = []; }

  const [activeTab, setActiveTab] = useState<"log" | "comments" | "monitoring">("log");

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!allowed) { alert(reason); return; } onUpdate(e); };
  const handleClose = () => { setSelectedAd(null); setManualLogNote(""); };

  const inputClass = "w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none focus:border-green-500 text-gray-800";
  const labelClass = "block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1";
  const selectClass = "w-full border border-gray-200 bg-white p-3 rounded-xl text-sm font-bold outline-none focus:border-green-500 text-gray-700";

  const TimerBlock = () => (
    activeSession ? (
      <div className="bg-green-700 rounded-2xl p-4 flex items-center justify-between mb-2">
        <div>
          <p className="text-[9px] font-black text-green-200 uppercase tracking-widest mb-1">⏱️ Session Active</p>
          <p className="text-2xl font-black text-white font-mono">{formatTimer ? formatTimer(activeSession.elapsedSeconds) : "00:00:00"}</p>
          <p className="text-[9px] text-green-300 mt-1">Started {new Date(activeSession.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <button type="button" onClick={onFinishSession} className="bg-white text-green-700 font-black text-xs uppercase tracking-widest px-4 py-3 rounded-xl hover:bg-green-50 transition-all shadow-sm">✅ Finish</button>
      </div>
    ) : null
  );

  if (!isFounder && !isStrategist && !allowed) {
    return <ReadOnlyView selectedAd={selectedAd} setSelectedAd={setSelectedAd} setManualLogNote={setManualLogNote} currentUser={currentUser} currentRole={currentRole} supabase={supabase} reason={reason} />;
  }

  // ── EDITOR VIEW ──
  if (isEditor) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="relative w-full max-w-3xl">
          <CloseButton onClose={handleClose} />
          <div className="bg-white rounded-2xl w-full shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh] border border-gray-200">
            <div className="flex-1 p-6 overflow-y-auto border-r border-gray-100">
              <div className="mb-5">
                {selectedAd.imprint_number && (
                  <div className="mb-3 bg-amber-50 rounded-xl px-3 py-2 border border-amber-200">
                    <p className="text-[10px] font-black font-mono text-amber-700 tracking-wide">DTC #{String(selectedAd.imprint_number).padStart(4, "0")} — {selectedAd.ad_format}</p>
                  </div>
                )}
                <h2 className="text-xl font-black text-gray-900 mb-2">{selectedAd.concept_name}</h2>
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] font-black text-green-700 bg-green-100 px-3 py-1 rounded-full uppercase border border-green-200">{selectedAd.status}</span>
                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                    selectedAd.priority === "High" ? "bg-red-100 text-red-600 border-red-200" :
                    selectedAd.priority === "Medium" ? "bg-amber-100 text-amber-600 border-amber-200" :
                    "bg-gray-100 text-gray-500 border-gray-200"
                  }`}>{selectedAd.priority} Priority</span>
                  {overdue && <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-red-100 text-red-600 border border-red-200 animate-pulse">⚠️ Overdue</span>}
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <TimerBlock />
                {isLocked && (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-3">
                    <span className="text-xl">🔒</span>
                    <div>
                      <p className="text-sm font-black text-red-600 uppercase">Testing Lock Active</p>
                      <p className="text-xs text-red-400 font-bold">Unlocks in {daysLeft} days.</p>
                    </div>
                  </div>
                )}
                {selectedAd.brief_link && (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-green-700 uppercase tracking-widest mb-2">Brief (Milanote)</p>
                    <a href={selectedAd.brief_link} target="_blank" rel="noopener noreferrer" className="text-sm font-black text-green-700 hover:text-green-800 transition-colors">Open Brief ↗</a>
                  </div>
                )}
                <div>
                  <label className={labelClass}>Move Stage</label>
                  <select disabled={!stageMovable} className={`w-full border p-3 rounded-xl text-sm font-black transition-all ${!stageMovable ? "bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed" : "border-gray-200 bg-white text-gray-700 focus:border-green-500"}`} value={selectedAd.status} onChange={e => setSelectedAd({ ...selectedAd, status: e.target.value })}>
                    <option value={originalAdStatus}>{originalAdStatus} (Current)</option>
                    {stageMovable && allowedTransitions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Review Link (Frame.io)</label>
                  <input type="url" className={inputClass} placeholder="Paste Frame.io link..." value={selectedAd.review_link || ""} onChange={e => setSelectedAd({ ...selectedAd, review_link: e.target.value })} />
                </div>
                <div className="bg-green-50 p-4 rounded-2xl border border-green-200">
                  <label className="block text-[10px] font-black text-green-700 uppercase tracking-widest mb-2">Internal Note</label>
                  <textarea rows={2} className="w-full border border-green-200 p-3 rounded-xl text-sm outline-none focus:border-green-500 bg-white font-medium text-gray-800" placeholder="Explain action taken..." value={manualLogNote} onChange={e => setManualLogNote(e.target.value)} />
                </div>
                <CommentsSection adId={selectedAd.id} adName={selectedAd.concept_name} assignedEditor={selectedAd.assigned_editor} assignedCopywriter={selectedAd.assigned_copywriter} currentUser={currentUser} currentRole={currentRole} supabase={supabase} />
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <button type="button" onClick={handleClose} className="text-xs font-black text-gray-400 uppercase tracking-widest px-4 py-2 hover:bg-gray-100 rounded-xl">Close</button>
                  <button type="submit" className="bg-green-700 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-800 shadow-sm">Save Changes</button>
                </div>
              </form>
            </div>
            <div className="w-full md:w-64 bg-gray-50 p-5 flex flex-col max-h-full">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Activity Log</h3>
              <div className="flex-1 overflow-y-auto space-y-4">
                {[...activityLog].reverse().map((log, idx) => (
                  <div key={idx} className="relative pl-4 border-l-2 border-green-200">
                    <div className="absolute w-2.5 h-2.5 bg-green-500 rounded-full -left-[6px] top-0.5 border-2 border-gray-50" />
                    <p className="text-[11px] font-black text-gray-700 mb-0.5">{log.action}</p>
                    <p className="text-[10px] text-gray-400 font-bold mb-1">by {log.user}</p>
                    {log.note && <div className="bg-white p-2 rounded-lg border border-gray-100 mb-1"><p className="text-[11px] text-green-700 font-bold italic">"{log.note}"</p></div>}
                    <p className="text-[9px] text-gray-300 uppercase tracking-tighter">{new Date(log.timestamp).toLocaleDateString()} • {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── VA VIEW ──
  if (isVA) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="relative w-full max-w-lg">
          <CloseButton onClose={handleClose} />
          <div className="bg-white rounded-2xl w-full shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-black text-gray-900 mb-2">{selectedAd.concept_name}</h2>
              <div className="flex gap-2 mb-5">
                <span className="text-[10px] font-black text-green-700 bg-green-100 px-3 py-1 rounded-full uppercase border border-green-200">{selectedAd.status}</span>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <TimerBlock />
                {selectedAd.review_link && (
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Review File</p>
                    <a href={selectedAd.review_link} target="_blank" rel="noopener noreferrer" className="text-sm font-black text-green-700 hover:text-green-800">Open Review File ↗</a>
                  </div>
                )}
                <div>
                  <label className={labelClass}>Move Stage</label>
                  <select className={selectClass} value={selectedAd.status} onChange={e => setSelectedAd({ ...selectedAd, status: e.target.value })}>
                    <option value="Pending Upload">Pending Upload (Current)</option>
                    <option value="Testing">Testing</option>
                  </select>
                </div>
                <div className="bg-green-50 p-4 rounded-2xl border border-green-200">
                  <label className="block text-[10px] font-black text-green-700 uppercase tracking-widest mb-2">Upload Note</label>
                  <textarea rows={2} className="w-full border border-green-200 p-3 rounded-xl text-sm outline-none focus:border-green-500 bg-white font-medium text-gray-800" placeholder="Log upload details..." value={manualLogNote} onChange={e => setManualLogNote(e.target.value)} />
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <button type="button" onClick={handleClose} className="text-xs font-black text-gray-400 uppercase tracking-widest px-4 py-2 hover:bg-gray-100 rounded-xl">Close</button>
                  <button type="submit" className="bg-green-700 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-800 shadow-sm">Mark as Uploaded</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MEDIA BUYER VIEW ──
  if (isMediaBuyer) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="relative w-full max-w-2xl">
          <CloseButton onClose={handleClose} />
          <div className="bg-white rounded-2xl w-full shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">

            {/* ── AD SET NAME BAR — very top, above everything ── */}
            <AdSetNameBar selectedAd={selectedAd} />

            {/* ── SCROLLABLE CONTENT ── */}
            <div className="flex-1 overflow-y-auto p-6">
              <h2 className="text-xl font-black text-gray-900 mb-2">{selectedAd.concept_name}</h2>
              <div className="flex flex-wrap gap-2 mb-5">
                <span className="text-[10px] font-black text-green-700 bg-green-100 px-3 py-1 rounded-full uppercase border border-green-200">{selectedAd.status}</span>
                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                  selectedAd.priority === "High" ? "bg-red-100 text-red-600 border-red-200" :
                  selectedAd.priority === "Medium" ? "bg-amber-100 text-amber-600 border-amber-200" :
                  "bg-gray-100 text-gray-500 border-gray-200"
                }`}>{selectedAd.priority} Priority</span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <TimerBlock />

                {selectedAd.review_link && (
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Review File</p>
                    <a href={selectedAd.review_link} target="_blank" rel="noopener noreferrer" className="text-sm font-black text-green-700 hover:text-green-800">Open Review File ↗</a>
                  </div>
                )}

                {/* Upload Info */}
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-3">
                  <p className="text-[9px] font-black text-green-700 uppercase tracking-widest">Upload Info</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Strategist", value: selectedAd.assigned_copywriter },
                      { label: "Editor", value: selectedAd.assigned_editor },
                      { label: "Format", value: selectedAd.ad_format },
                      { label: "Product", value: selectedAd.product },
                    ].map(item => (
                      <div key={item.label}>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{item.label}</p>
                        <p className="text-sm font-black text-gray-700">{item.value || "—"}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Destination URL (PDP)</p>
                    {selectedAd.destination_url ? (
                      <a href={selectedAd.destination_url} target="_blank" rel="noopener noreferrer" className="text-sm font-black text-green-700 hover:text-green-800 break-all">
                        {selectedAd.destination_url} ↗
                      </a>
                    ) : (
                      <p className="text-sm font-black text-red-400">⚠️ No destination URL set — ask the Strategist</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Whitelisting Page</p>
                    {selectedAd.whitelisting_page ? (
                      <a href={selectedAd.whitelisting_page} target="_blank" rel="noopener noreferrer" className="text-sm font-black text-green-700 hover:text-green-800 break-all">
                        {selectedAd.whitelisting_page} ↗
                      </a>
                    ) : (
                      <p className="text-sm font-black text-red-400">⚠️ No whitelisting page set — ask the Strategist</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Move Stage</label>
                  <select className={selectClass} value={selectedAd.status} onChange={e => setSelectedAd({ ...selectedAd, status: e.target.value })}>
                    <option value={originalAdStatus}>{originalAdStatus} (Current)</option>
                    {originalAdStatus === "Pending Upload" && <option value="Testing">Testing</option>}
                    {originalAdStatus === "Testing" && <>
                      <option value="Winner">Winner</option>
                      <option value="Killed">Killed</option>
                    </>}
                  </select>
                </div>

                {originalAdStatus === "Testing" && (
                  <div>
                    <label className={labelClass}>Result</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Winner", "Loser", "Inconclusive"].map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setSelectedAd({ ...selectedAd, result: r })}
                          className={`py-3 rounded-xl font-black text-xs uppercase tracking-widest border-2 transition-all ${
                            selectedAd.result === r
                              ? r === "Winner" ? "bg-green-600 text-white border-green-600"
                              : r === "Loser" ? "bg-red-500 text-white border-red-500"
                              : "bg-gray-500 text-white border-gray-500"
                              : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                          }`}
                        >
                          {r === "Winner" ? "🏆" : r === "Loser" ? "❌" : "❓"} {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className={labelClass}>Ad Spend ($)</label>
                  <input type="number" min="0" step="0.01" className={inputClass} placeholder="0.00" value={selectedAd.ad_spend || ""} onChange={e => setSelectedAd({ ...selectedAd, ad_spend: e.target.value ? Number(e.target.value) : undefined })} />
                </div>

                <div className="bg-green-50 p-4 rounded-2xl border border-green-200">
                  <label className="block text-[10px] font-black text-green-700 uppercase tracking-widest mb-2">Note</label>
                  <textarea rows={2} className="w-full border border-green-200 p-3 rounded-xl text-sm outline-none focus:border-green-500 bg-white font-medium text-gray-800" placeholder="Add a note..." value={manualLogNote} onChange={e => setManualLogNote(e.target.value)} />
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <button type="button" onClick={handleClose} className="text-xs font-black text-gray-400 uppercase tracking-widest px-4 py-2 hover:bg-gray-100 rounded-xl">Close</button>
                  <button type="submit" className="bg-green-700 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-800 shadow-sm">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── CONTENT COORDINATOR VIEW ──
  if (isContentCoord) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="relative w-full max-w-lg">
          <CloseButton onClose={handleClose} />
          <div className="bg-white rounded-2xl w-full shadow-2xl p-6 border border-gray-200">
            <h2 className="text-xl font-black text-gray-900 mb-5">{selectedAd.concept_name}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <TimerBlock />
              <div>
                <label className={labelClass}>Move Stage</label>
                <select disabled={!stageMovable} className={`w-full border p-3 rounded-xl text-sm font-black ${!stageMovable ? "bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed" : "border-gray-200 bg-white text-gray-700"}`} value={selectedAd.status} onChange={e => setSelectedAd({ ...selectedAd, status: e.target.value })}>
                  <option value={originalAdStatus}>{originalAdStatus} (Current)</option>
                  {stageMovable && allowedTransitions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="bg-green-50 p-4 rounded-2xl border border-green-200">
                <label className="block text-[10px] font-black text-green-700 uppercase tracking-widest mb-2">Note</label>
                <textarea rows={2} className="w-full border border-green-200 p-3 rounded-xl text-sm outline-none focus:border-green-500 bg-white font-medium text-gray-800" placeholder="Add a note..." value={manualLogNote} onChange={e => setManualLogNote(e.target.value)} />
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <button type="button" onClick={handleClose} className="text-xs font-black text-gray-400 uppercase px-4 py-2 hover:bg-gray-100 rounded-xl">Close</button>
                <button type="submit" className="bg-green-700 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-800 shadow-sm">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── FOUNDER / STRATEGIST FULL VIEW ──
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative w-full max-w-5xl">
        <CloseButton onClose={handleClose} />
        <div className="bg-white rounded-2xl w-full shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh] border border-gray-200">
          <div className="flex-1 p-6 overflow-y-auto border-r border-gray-100">
            <div className="mb-5">
              {selectedAd.imprint_number && isFounder && (
                <div className="mb-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 w-fit">
                  <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Imprint</span>
                  <input
                    type="number"
                    className="w-14 text-[11px] font-black text-amber-700 bg-transparent outline-none font-mono"
                    value={selectedAd.imprint_number || ""}
                    onChange={e => setSelectedAd({ ...selectedAd, imprint_number: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
              )}
              {selectedAd.imprint_number && (
                <div className="mb-3 bg-amber-50 rounded-xl px-3 py-2 border border-amber-200">
                  <p className="text-[10px] font-black font-mono text-amber-700 whitespace-nowrap tracking-wide">
                    DTC #{String(selectedAd.imprint_number).padStart(4, "0")} — {selectedAd.ad_format} | {selectedAd.created_at ? new Date(selectedAd.created_at).toISOString().split("T")[0] : "—"} | {selectedAd.concept_name}
                  </p>
                </div>
              )}
              <EditableTitle value={selectedAd.concept_name} onChange={v => setSelectedAd({ ...selectedAd, concept_name: v })} />
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] font-black text-green-700 bg-green-100 px-3 py-1 rounded-full uppercase border border-green-200">{selectedAd.status}</span>
                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                  selectedAd.priority === "High" ? "bg-red-100 text-red-600 border-red-200" :
                  selectedAd.priority === "Medium" ? "bg-amber-100 text-amber-600 border-amber-200" :
                  "bg-gray-100 text-gray-500 border-gray-200"
                }`}>{selectedAd.priority} Priority</span>
                {overdue && <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-red-100 text-red-600 border border-red-200 animate-pulse">⚠️ Overdue</span>}
                {["Ad Revision", "Done, Waiting for Approval"].includes(originalAdStatus) && (originalAd?.revision_count || 0) > 0 && (
                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${revisionLimitReached ? "bg-red-100 text-red-600 border-red-200" : "bg-amber-100 text-amber-600 border-amber-200"}`}>
                    🔄 Round {originalAd?.revision_count}/2
                  </span>
                )}
                {originalAdStatus === "Done, Waiting for Approval" && (
                  <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-green-100 text-green-700 border border-green-200 animate-pulse">✋ Awaiting Approval</span>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <TimerBlock />
              {isLocked && !isFounder && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-3">
                  <span className="text-xl">🔒</span>
                  <div>
                    <p className="text-sm font-black text-red-600 uppercase">Testing Lock Active</p>
                    <p className="text-xs text-red-400 font-bold">Unlocks in {daysLeft} days.</p>
                  </div>
                </div>
              )}
              {isFounder && isLocked && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3">
                  <span className="text-xl">⚡</span>
                  <p className="text-sm font-black text-amber-700">Founder Override — Testing lock bypassed</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Move Stage</label>
                  <select className={selectClass} value={selectedAd.status} onChange={e => setSelectedAd({ ...selectedAd, status: e.target.value })}>
                    <option value={originalAdStatus}>{originalAdStatus} (Current)</option>
                    {allowedTransitions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Content Source</label>
                  <select className={selectClass} value={selectedAd.content_source} onChange={e => setSelectedAd({ ...selectedAd, content_source: e.target.value })}>
                    <option>Internal Team</option><option>UGC Creator</option><option>AI Generated</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Product</label>
                  <select className={selectClass} value={selectedAd.product || ""} onChange={e => setSelectedAd({ ...selectedAd, product: e.target.value })}>
                    <option value="">— Select Product —</option>
                    {products.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Ad Format</label>
                  <select className={selectClass} value={selectedAd.ad_format || ""} onChange={e => setSelectedAd({ ...selectedAd, ad_format: e.target.value })}>
                    <option>Video Ad</option><option>Static Ad</option><option>Native Ad</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Ad Type</label>
                  <select className={selectClass} value={selectedAd.ad_type || ""} onChange={e => setSelectedAd({ ...selectedAd, ad_type: e.target.value })}>
                    <option value="Iteration">Iteration</option>
                    <option value="Ideation">Ideation</option>
                    <option value="Imitation">Imitation</option>
                  </select>
                </div>
                {isFounder && (
                  <div>
                    <label className={labelClass}>Priority</label>
                    <select className={selectClass} value={selectedAd.priority || "Medium"} onChange={e => setSelectedAd({ ...selectedAd, priority: e.target.value })}>
                      <option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Strategist {!canReassign && <span className="text-gray-300 normal-case">(locked)</span>}</label>
                  {canReassign ? (
                    <select className={selectClass} value={selectedAd.assigned_copywriter || ""} onChange={e => setSelectedAd({ ...selectedAd, assigned_copywriter: e.target.value })}>
                      <option value="">— Unassigned —</option>
                      {allStrategistProfiles.length > 0
                        ? allStrategistProfiles.map(p => <option key={p.full_name} value={p.full_name}>{p.full_name} ({p.role})</option>)
                        : allStrategists.map(name => <option key={name} value={name}>{name}</option>)
                      }
                    </select>
                  ) : (
                    <input disabled className="w-full border border-gray-100 p-3 rounded-xl text-sm bg-gray-50 font-bold text-gray-400 cursor-not-allowed" value={selectedAd.assigned_copywriter || "Unassigned"} />
                  )}
                </div>
                <div>
                  <label className={labelClass}>Editor {!canReassign && <span className="text-gray-300 normal-case">(locked)</span>}</label>
                  {canReassign ? (
                    <select className={selectClass} value={selectedAd.assigned_editor || ""} onChange={e => setSelectedAd({ ...selectedAd, assigned_editor: e.target.value })}>
                      <option value="">— Unassigned —</option>
                      {allEditorProfiles.length > 0
                        ? allEditorProfiles.map(p => <option key={p.full_name} value={p.full_name}>{p.full_name} ({p.role})</option>)
                        : allEditors.map(name => <option key={name} value={name}>{name}</option>)
                      }
                    </select>
                  ) : (
                    <input disabled className="w-full border border-gray-100 p-3 rounded-xl text-sm bg-gray-50 font-bold text-gray-400 cursor-not-allowed" value={selectedAd.assigned_editor || "Unassigned"} />
                  )}
                </div>
              </div>
              {showResult && (
                <div>
                  <label className={labelClass}>Result</label>
                  <select className={selectClass} value={selectedAd.result || ""} onChange={e => setSelectedAd({ ...selectedAd, result: e.target.value })}>
                    <option value="">— No Result —</option>
                    <option>Winner</option><option>Loser</option><option>Inconclusive</option>
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Ad Spend ($)</label>
                  <input type="number" min="0" step="0.01" className={inputClass} placeholder="0.00" value={selectedAd.ad_spend || ""} onChange={e => setSelectedAd({ ...selectedAd, ad_spend: e.target.value ? Number(e.target.value) : undefined })} />
                </div>
                <div>
                  <label className={labelClass}>Review Link (Frame.io)</label>
                  <input type="url" className={inputClass} placeholder="Optional" value={selectedAd.review_link || ""} onChange={e => setSelectedAd({ ...selectedAd, review_link: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Brief Link (Milanote)</label>
                  <input type="url" className={inputClass} placeholder="Optional" value={selectedAd.brief_link || ""} onChange={e => setSelectedAd({ ...selectedAd, brief_link: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Due Date</label>
                  <input type="date" className={`${inputClass} ${overdue ? "border-red-300 bg-red-50" : ""}`} value={formatDate(selectedAd.due_date)} onChange={e => setSelectedAd({ ...selectedAd, due_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Destination URL <span className="text-gray-300 normal-case font-medium">(landing page)</span></label>
                <input type="url" list="destination-url-suggestions" className={inputClass} placeholder="https://..." value={selectedAd.destination_url || ""} onChange={e => setSelectedAd({ ...selectedAd, destination_url: e.target.value })} />
                <datalist id="destination-url-suggestions">
                  {(destinationUrls || []).map(url => <option key={url} value={url} />)}
                </datalist>
              </div>
              <div>
                <label className={labelClass}>Whitelisting Page <span className="text-gray-300 normal-case font-medium">(FB/IG page to run from)</span></label>
                <select className={selectClass} value={selectedAd.whitelisting_page || ""} onChange={e => setSelectedAd({ ...selectedAd, whitelisting_page: e.target.value })}>
                  <option value="">— Select Whitelisting Page —</option>
                  {whitelistPages.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <textarea rows={1} className={`${inputClass} resize-none`} placeholder="Optional notes..." value={selectedAd.notes || ""} onChange={e => setSelectedAd({ ...selectedAd, notes: e.target.value })} />
              </div>
              <div className="bg-green-50 p-4 rounded-2xl border border-green-200">
                <label className="block text-[10px] font-black text-green-700 uppercase tracking-widest mb-2">Internal Note (Appends to Log)</label>
                <textarea rows={2} className="w-full border border-green-200 p-3 rounded-xl text-sm outline-none focus:border-green-500 bg-white font-medium text-gray-800" placeholder="Explain action taken..." value={manualLogNote} onChange={e => setManualLogNote(e.target.value)} />
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <div className="flex gap-2">
                  <button type="button" onClick={handleClose} className="text-xs font-black text-gray-400 uppercase tracking-widest px-4 py-2 hover:bg-gray-100 rounded-xl">Close</button>
                  {canDelete && <button type="button" onClick={onDelete} className="text-xs font-black text-red-400 hover:text-red-600 uppercase tracking-widest px-4 py-2 hover:bg-red-50 rounded-xl">Delete Ad</button>}
                </div>
                <button type="submit" className="bg-green-700 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-800 shadow-sm">Save Changes</button>
              </div>
            </form>
          </div>
          <div className="w-full md:w-72 bg-gray-50 border-l border-gray-100 p-5 flex flex-col max-h-full">
            <div className="flex bg-white border border-gray-200 p-1 rounded-xl mb-4">
              <button onClick={() => setActiveTab("log")} className={`flex-1 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === "log" ? "bg-green-700 text-white shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>Log</button>
              <button onClick={() => setActiveTab("comments")} className={`flex-1 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === "comments" ? "bg-green-700 text-white shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>Comments</button>
              {isFounder && (
                <button onClick={() => setActiveTab("monitoring")} className={`flex-1 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === "monitoring" ? "bg-green-700 text-white shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>Sessions</button>
              )}
            </div>
            {activeTab === "log" && (
              <div className="flex-1 overflow-y-auto space-y-4">
                {[...activityLog].reverse().map((log, idx) => (
                  <div key={idx} className="relative pl-4 border-l-2 border-green-200">
                    <div className="absolute w-2.5 h-2.5 bg-green-500 rounded-full -left-[6px] top-0.5 border-2 border-gray-50" />
                    <p className="text-[11px] font-black text-gray-700 mb-0.5">{log.action}</p>
                    <p className="text-[10px] text-gray-400 font-bold mb-1">by {log.user}</p>
                    {log.note && <div className="bg-white p-2 rounded-lg border border-gray-100 mb-1"><p className="text-[11px] text-green-700 font-bold italic">"{log.note}"</p></div>}
                    <p className="text-[9px] text-gray-300 uppercase tracking-tighter">{new Date(log.timestamp).toLocaleDateString()} • {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                ))}
              </div>
            )}
            {activeTab === "comments" && (
              <div className="flex-1 overflow-y-auto">
                <CommentsSection adId={selectedAd.id} adName={selectedAd.concept_name} assignedEditor={selectedAd.assigned_editor} assignedCopywriter={selectedAd.assigned_copywriter} currentUser={currentUser} currentRole={currentRole} supabase={supabase} />
              </div>
            )}
            {activeTab === "monitoring" && isFounder && (
              <MonitoringTab adId={selectedAd.id} fetchSessionsForAd={fetchSessionsForAd} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}