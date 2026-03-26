import { useState, useEffect } from "react";
import { Ad, TimeLogEntry } from "../../types";
import { ALLOWED_TRANSITIONS } from "../../constants";
import { getPriorityBadge, getDaysLeftInTesting } from "../../utils/helpers";
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
  supabase: any;
  activeSession?: { sessionId: string; elapsedSeconds: number; startedAt: string } | null;
  onFinishSession?: () => void;
  fetchSessionsForAd?: (adId: string) => Promise<any[]>;
  fetchAllSessions?: () => Promise<any[]>;
  formatTimer?: (seconds: number) => string;
  products?: string[];
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

  const commit = () => {
    setEditing(false);
    if (draft.trim()) onChange(draft.trim());
    else setDraft(value);
  };

  if (editing) {
    return (
      <input
        autoFocus
        className="text-2xl font-black text-slate-100 leading-tight mb-2 w-full border-b-2 border-indigo-400 bg-transparent outline-none"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
      />
    );
  }

  return (
    <h2
      className="text-2xl font-black text-slate-100 leading-tight mb-2 cursor-pointer hover:text-indigo-400 transition-colors group flex items-center gap-2"
      onClick={() => { setDraft(value); setEditing(true); }}
      title="Click to rename"
    >
      {value}
      <span className="text-sm text-slate-600 group-hover:text-indigo-400 transition-colors">✏️</span>
    </h2>
  );
}

function canUserModify(ad: Ad, originalStatus: string, currentRole: string, currentUser: string): { allowed: boolean; reason: string } {
  if (currentRole === "Founder") return { allowed: true, reason: "" };
  if (currentRole === "Strategist") {
    if (ad.assigned_copywriter === currentUser || ["Ad Revision", "Testing", "Writing Brief", "Brief Revision Required", "Done, Waiting for Approval"].includes(originalStatus)) {
      return { allowed: true, reason: "" };
    }
    return { allowed: false, reason: `⛔ Access Denied — You are not the assigned strategist for this ad. Only the assigned strategist or Founder can make changes.` };
  }
  if (currentRole === "Editor" || currentRole === "Graphic Designer") {
    if (ad.assigned_editor === currentUser || originalStatus === "Done, Waiting for Approval") return { allowed: true, reason: "" };
    return { allowed: false, reason: `⛔ Access Denied — This ad is not assigned to you. Only ${ad.assigned_editor || "the assigned editor"} can make changes to this ad.` };
  }
  if (currentRole === "VA") {
    if (originalStatus === "Pending Upload") return { allowed: true, reason: "" };
    return { allowed: false, reason: `⛔ Access Denied — You can only update ads at Pending Upload stage. This ad is currently at ${originalStatus}.` };
  }
  if (currentRole === "Content Coordinator") {
    if (["Preparing Content", "Content Revision Required"].includes(originalStatus)) return { allowed: true, reason: "" };
    return { allowed: false, reason: `⛔ Access Denied — You can only update ads at Preparing Content or Content Revision Required stages. This ad is currently at ${originalStatus}.` };
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
          <p className="text-[11px] text-slate-500 font-bold italic text-center py-4">No comments yet — be the first to add one</p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="bg-white/5 rounded-2xl p-3 group border border-white/10">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center font-black text-indigo-400 text-[9px]">{comment.posted_by?.charAt(0)?.toUpperCase()}</div>
                    <span className="text-[10px] font-black text-slate-300">{comment.posted_by}</span>
                    <span className="text-[9px] text-slate-500">{new Date(comment.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} at {new Date(comment.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p className="text-[12px] text-slate-300 font-medium leading-snug pl-7">{comment.message}</p>
                </div>
                {(isFounder || comment.posted_by === currentUser) && (
                  <button onClick={() => deleteComment(comment.id, adId)} className="text-[9px] font-black text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all px-2 py-1 rounded-lg hover:bg-rose-500/10 shrink-0">✕</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <input type="text" placeholder="Add a comment..." className="flex-1 border-2 border-white/10 bg-white/5 p-3 rounded-2xl text-sm font-medium outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600 text-slate-100" value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(adId, adName, assignedEditor, assignedCopywriter); } }} />
        <button onClick={() => submitComment(adId, adName, assignedEditor, assignedCopywriter)} disabled={isSubmitting || !newComment.trim()} className="bg-indigo-500 text-white px-4 py-3 rounded-2xl font-black text-xs hover:bg-indigo-400 transition-all disabled:opacity-40 shrink-0">{isSubmitting ? "..." : "Post"}</button>
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
        <div className="flex flex-col items-center justify-center py-10 text-slate-500">
          <div className="text-4xl mb-2">👁️</div>
          <p className="text-[11px] font-bold text-center">No sessions recorded yet</p>
          <p className="text-[10px] text-center mt-1 px-2">Sessions start when team members open their assigned ads</p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Summary</p>
            <div className="space-y-2">
              {Object.entries(summary).map(([user, data]) => (
                <div key={user} className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center font-black text-indigo-400 text-[9px]">{user.charAt(0).toUpperCase()}</div>
                      <span className="text-[11px] font-black text-slate-200">{user}</span>
                    </div>
                    <span className="text-[10px] font-black text-indigo-400">{fmtDuration(data.totalSeconds)}</span>
                  </div>
                  <div className="flex items-center justify-between pl-7">
                    <span className="text-[9px] text-slate-500">{data.sessions} session{data.sessions !== 1 ? "s" : ""}</span>
                    <span className="text-[9px] text-slate-500">Last: {new Date(data.lastSeen).toLocaleDateString(undefined, { month: "short", day: "numeric" })} {new Date(data.lastSeen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Session Log</p>
          <div className="space-y-2">
            {sessions.map((s, idx) => (
              <div key={idx} className="relative pl-4 border-l-2 border-white/10">
                <div className="absolute w-2 h-2 bg-slate-600 rounded-full -left-[5px] top-1" />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-300">{s.user_name}</span>
                  <span className="text-[9px] font-bold text-slate-500">{s.user_role}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[9px] text-slate-500">{new Date(s.started_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${s.is_active ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>{s.is_active ? "Active" : fmtDuration(s.total_seconds)}</span>
                </div>
                {s.finished_at && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Finished Time:</span>
                    <span className="text-[9px] font-black text-emerald-400">{new Date(s.finished_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {new Date(s.finished_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 md:p-4">
      <div className="bg-[#1e1f20] border border-white/10 rounded-[32px] w-full max-w-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
        <div className="flex-1 p-6 md:p-8 overflow-y-auto border-r border-white/10">
          <div className="mb-6">
            {selectedAd.imprint_number && (
              <div className="mb-2 bg-black/40 rounded-xl px-3 py-2 overflow-x-auto border border-white/10">
                <p className="text-[10px] font-black font-mono text-amber-400 whitespace-nowrap tracking-wide">
                  {selectedAd.ad_format?.replace(/ /g, "")} #{String(selectedAd.imprint_number).padStart(4, "0")} | {selectedAd.created_at ? new Date(selectedAd.created_at).toISOString().split("T")[0] : "—"} || {selectedAd.concept_name || "—"} || {selectedAd.angle || "—"} || {(selectedAd.product || "").replace(/ /g, "")} || {selectedAd.assigned_editor || "—"} || {selectedAd.assigned_copywriter || "—"}
                </p>
              </div>
            )}
            <EditableTitle value={selectedAd.concept_name} onChange={v => setSelectedAd({ ...selectedAd, concept_name: v })} />
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full uppercase border border-indigo-500/20">{selectedAd.status}</span>
              <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${getPriorityBadge(selectedAd.priority)}`}>{selectedAd.priority} Priority</span>
            </div>
            <div className="bg-rose-500/10 border-2 border-rose-500/20 rounded-2xl p-4 mb-4">
              <p className="text-[11px] font-black text-rose-400 leading-relaxed">{reason}</p>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Ad Type", value: selectedAd.ad_type },
                  { label: "Format", value: selectedAd.ad_format },
                  { label: "Strategist", value: selectedAd.assigned_copywriter },
                  { label: "Editor", value: selectedAd.assigned_editor },
                  ...(selectedAd.product ? [{ label: "Product", value: selectedAd.product }] : []),
                  ...(selectedAd.due_date ? [{ label: "Due Date", value: new Date(selectedAd.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) }] : []),
                ].map(item => (
                  <div key={item.label} className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{item.label}</p>
                    <p className="text-sm font-black text-slate-200">{item.value || "—"}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                {selectedAd.brief_link && (
                  <a href={selectedAd.brief_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest">
                    Open Brief (Milanote) ↗
                  </a>
                )}
                {selectedAd.review_link && (
                  <a href={selectedAd.review_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest">
                    View Review File (Frame.io) ↗
                  </a>
                )}
              </div>
              {selectedAd.notes && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Notes</p>
                  <p className="text-sm text-slate-300 font-medium">{selectedAd.notes}</p>
                </div>
              )}
            </div>
            <div className="mt-6">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Comments</p>
              <CommentsSection adId={selectedAd.id} adName={selectedAd.concept_name} assignedEditor={selectedAd.assigned_editor} assignedCopywriter={selectedAd.assigned_copywriter} currentUser={currentUser} currentRole={currentRole} supabase={supabase} />
            </div>
          </div>
          <div className="flex justify-start pt-4 border-t-2 border-white/10">
            <button type="button" onClick={() => { setSelectedAd(null); setManualLogNote(""); }} className="text-xs font-black text-slate-500 uppercase tracking-widest px-4 py-2 hover:bg-white/5 rounded-xl">Close</button>
          </div>
        </div>
        <div className="w-full md:w-72 bg-black/20 p-6 flex flex-col max-h-full">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Activity Log</h3>
          <div className="flex-1 overflow-y-auto space-y-4">
            {[...activityLog].reverse().map((log, idx) => (
              <div key={idx} className="relative pl-5 border-l-2 border-indigo-500/20">
                <div className="absolute w-2.5 h-2.5 bg-indigo-500 rounded-full -left-[6px] top-0.5 border-2 border-[#1e1f20] shadow-sm"></div>
                <p className="text-[11px] font-black text-slate-200 mb-0.5">{log.action}</p>
                <p className="text-[10px] text-slate-500 font-bold mb-1">by {log.user}</p>
                {log.note && <div className="bg-white/5 p-2 rounded-lg border border-white/10 mb-1"><p className="text-[11px] text-indigo-400 font-bold italic">"{log.note}"</p></div>}
                <p className="text-[9px] text-slate-600 uppercase tracking-tighter">{new Date(log.timestamp).toLocaleDateString()} • {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdDetailModal({
  selectedAd, ads, manualLogNote, setManualLogNote,
  setSelectedAd, onUpdate, onDelete,
  currentRole, currentUser, allEditors = [], allEditorProfiles = [], allStrategists = [], supabase,
  activeSession, onFinishSession, fetchSessionsForAd, fetchAllSessions, formatTimer,
  products = []
}: Props) {
  const daysLeft = getDaysLeftInTesting(selectedAd.live_date);
  const isLocked = selectedAd.status === "Testing" && daysLeft > 0;

  const originalAd = ads.find(a => a.id === selectedAd.id);
  const originalAdStatus = originalAd?.status || selectedAd.status;
  const revisionLimitReached = originalAdStatus === "Ad Revision" && (originalAd?.revision_count || 0) >= 2;
  const overdue = isOverdue(selectedAd.due_date) && !["Completed", "Killed"].includes(selectedAd.status);
  const showResult = ["Testing", "Completed"].includes(originalAdStatus);

  const isFounder = currentRole === "Founder";
  const isStrategist = currentRole === "Strategist";
  const isEditor = currentRole === "Editor" || currentRole === "Graphic Designer";
  const isVA = currentRole === "VA";
  const isContentCoord = currentRole === "Content Coordinator";

  const { allowed, reason } = canUserModify(selectedAd, originalAdStatus, currentRole, currentUser);

  const getAllowedTransitions = () => {
    if (isFounder) {
      return ["Idea", "Writing Brief", "Brief Revision Required", "Brief Approved", "Editor Assigned", "In Progress", "Ad Revision", "Pending Upload", "Testing", "Completed", "Killed"]
        .filter(s => s !== originalAdStatus)
        .filter(s => !(s === "Ad Revision" && revisionLimitReached));
    }
    const transitions = ALLOWED_TRANSITIONS[originalAdStatus] || [];
    return transitions
      .filter(s => !(s === "Ad Revision" && revisionLimitReached))
      .filter(s => s !== "Killed");
  };

  const canDelete = isFounder;
  const canReassign = isFounder;
  const stageMovable = !isLocked || isFounder;
  const allowedTransitions = getAllowedTransitions();

  let activityLog: TimeLogEntry[] = [];
  try { activityLog = JSON.parse(selectedAd.time_log || "[]"); } catch { activityLog = []; }

  const [activeTab, setActiveTab] = useState<"log" | "comments" | "monitoring">("log");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allowed) { alert(reason); return; }
    onUpdate(e);
  };

  const inputClass = "w-full border-2 border-white/10 bg-white/5 p-3 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 text-slate-100";
  const labelClass = "block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1";
  const selectClass = "w-full border-2 border-white/10 bg-[#2a2b2c] p-3 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 text-slate-100";

  const TimerBlock = () => (
    activeSession ? (
      <div className="bg-indigo-600 rounded-2xl p-4 flex items-center justify-between mb-2">
        <div>
          <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-1">⏱️ Session Active</p>
          <p className="text-2xl font-black text-white font-mono tracking-widest">{formatTimer ? formatTimer(activeSession.elapsedSeconds) : "00:00:00"}</p>
          <p className="text-[9px] text-indigo-300 mt-1">Started {new Date(activeSession.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <button type="button" onClick={onFinishSession} className="bg-white text-indigo-600 font-black text-xs uppercase tracking-widest px-4 py-3 rounded-xl hover:bg-indigo-50 transition-all shadow-sm">✅ Finish</button>
      </div>
    ) : null
  );

  if (!isFounder && !isStrategist && !allowed) {
    return <ReadOnlyView selectedAd={selectedAd} setSelectedAd={setSelectedAd} setManualLogNote={setManualLogNote} currentUser={currentUser} currentRole={currentRole} supabase={supabase} reason={reason} />;
  }

  // ── EDITOR VIEW ──
  if (isEditor) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 md:p-4">
        <div className="bg-[#1e1f20] border border-white/10 rounded-[32px] w-full max-w-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
          <div className="flex-1 p-6 md:p-8 overflow-y-auto border-r border-white/10">
            <div className="mb-6">
              {selectedAd.imprint_number && (
                <div className="mb-2 bg-black/40 rounded-xl px-3 py-2 overflow-x-auto border border-white/10">
                  <p className="text-[10px] font-black font-mono text-amber-400 whitespace-nowrap tracking-wide">
                    {selectedAd.ad_format?.replace(/ /g, "")} #{String(selectedAd.imprint_number).padStart(4, "0")} | {selectedAd.created_at ? new Date(selectedAd.created_at).toISOString().split("T")[0] : "—"} || {selectedAd.concept_name || "—"} || {selectedAd.angle || "—"} || {(selectedAd.product || "").replace(/ /g, "")} || {selectedAd.assigned_editor || "—"} || {selectedAd.assigned_copywriter || "—"}
                  </p>
                </div>
              )}
              <h2 className="text-2xl font-black text-slate-100 mb-2">{selectedAd.concept_name}</h2>
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full uppercase border border-indigo-500/20">{selectedAd.status}</span>
                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${getPriorityBadge(selectedAd.priority)}`}>{selectedAd.priority} Priority</span>
                {overdue && <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/20 animate-pulse">⚠️ Overdue</span>}
              </div>
              {selectedAd.due_date && (
                <p className={`text-[10px] font-black mt-2 uppercase ${overdue ? "text-rose-400" : "text-slate-500"}`}>
                  Due: {new Date(selectedAd.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
              {revisionLimitReached && (
                <div className="mt-3 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">⛔ Max revisions reached — Send Back is no longer available</p>
                </div>
              )}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <TimerBlock />
              {isLocked && (
                <div className="bg-rose-500/10 border-2 border-rose-500/20 p-5 rounded-3xl flex items-start gap-3">
                  <span className="text-2xl">🔒</span>
                  <div>
                    <p className="text-sm font-black text-rose-400 uppercase">Testing Lock Active</p>
                    <p className="text-xs text-rose-500 font-bold italic">Unlocks in {daysLeft} days.</p>
                  </div>
                </div>
              )}
              {selectedAd.brief_link && (
                <div className="bg-indigo-500/10 border-2 border-indigo-500/20 rounded-2xl p-4">
                  <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Brief (Milanote)</p>
                  <a href={selectedAd.brief_link} target="_blank" rel="noopener noreferrer" className="text-sm font-black text-indigo-400 hover:text-indigo-300 transition-colors">Open Brief ↗</a>
                </div>
              )}
              <div>
                <label className={labelClass}>Move Stage {revisionLimitReached && <span className="ml-2 text-rose-400 normal-case font-bold">— Ad Revision unavailable after Round 2</span>}</label>
                <select disabled={!stageMovable} className={`w-full border-2 p-3 rounded-2xl text-sm font-black transition-all ${!stageMovable ? "bg-white/5 text-slate-600 border-white/5 cursor-not-allowed" : "border-white/10 bg-[#2a2b2c] text-slate-100 focus:border-indigo-500"}`} value={selectedAd.status} onChange={e => setSelectedAd({ ...selectedAd, status: e.target.value })}>
                  <option value={originalAdStatus}>{originalAdStatus} (Current)</option>
                  {stageMovable && allowedTransitions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Review Link (Frame.io)</label>
                <input type="url" className={inputClass} placeholder="Paste Frame.io link..." value={selectedAd.review_link || ""} onChange={e => setSelectedAd({ ...selectedAd, review_link: e.target.value })} />
                {selectedAd.review_link && (
                  <a href={selectedAd.review_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest mt-1 transition-colors">Open Review File ↗</a>
                )}
              </div>
              <div className="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20">
                <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Internal Note</label>
                <textarea rows={2} className="w-full border-2 border-white/10 p-3 rounded-xl text-sm outline-none focus:border-indigo-500 bg-white/5 font-medium text-slate-100" placeholder="Explain action taken..." value={manualLogNote} onChange={e => setManualLogNote(e.target.value)} />
              </div>
              <CommentsSection adId={selectedAd.id} adName={selectedAd.concept_name} assignedEditor={selectedAd.assigned_editor} assignedCopywriter={selectedAd.assigned_copywriter} currentUser={currentUser} currentRole={currentRole} supabase={supabase} />
              <div className="flex justify-between items-center mt-6 pt-4 border-t-2 border-white/10">
                <button type="button" onClick={() => { setSelectedAd(null); setManualLogNote(""); }} className="text-xs font-black text-slate-500 uppercase tracking-widest px-4 py-2 hover:bg-white/5 rounded-xl">Close</button>
                <button type="submit" className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-500 text-xs uppercase tracking-widest">Save Changes</button>
              </div>
            </form>
          </div>
          <div className="w-full md:w-72 bg-black/20 p-6 flex flex-col max-h-full">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Time Log</h3>
            <div className="flex-1 overflow-y-auto space-y-4">
              {[...activityLog].reverse().map((log, idx) => (
                <div key={idx} className="relative pl-5 border-l-2 border-indigo-500/20">
                  <div className="absolute w-2.5 h-2.5 bg-indigo-500 rounded-full -left-[6px] top-0.5 border-2 border-[#1e1f20] shadow-sm"></div>
                  <p className="text-[11px] font-black text-slate-200 mb-0.5">{log.action}</p>
                  <p className="text-[10px] text-slate-500 font-bold mb-1">by {log.user}</p>
                  {log.note && <div className="bg-white/5 p-2 rounded-lg border border-white/10 mb-1"><p className="text-[11px] text-indigo-400 font-bold italic">"{log.note}"</p></div>}
                  <p className="text-[9px] text-slate-600 uppercase tracking-tighter">{new Date(log.timestamp).toLocaleDateString()} • {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
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
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 md:p-4">
        <div className="bg-[#1e1f20] border border-white/10 rounded-[32px] w-full max-w-lg shadow-2xl p-8">
          <h2 className="text-2xl font-black text-slate-100 mb-2">{selectedAd.concept_name}</h2>
          <div className="flex gap-2 mb-6">
            <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full uppercase border border-indigo-500/20">{selectedAd.status}</span>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <TimerBlock />
            {selectedAd.brief_link && (
              <div className="bg-indigo-500/10 border-2 border-indigo-500/20 rounded-2xl p-4">
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Brief (Milanote)</p>
                <a href={selectedAd.brief_link} target="_blank" rel="noopener noreferrer" className="text-sm font-black text-indigo-400 hover:text-indigo-300 transition-colors">Open Brief ↗</a>
              </div>
            )}
            {selectedAd.review_link && (
              <div className="bg-white/5 border-2 border-white/10 rounded-2xl p-4">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Review File (Frame.io)</p>
                <a href={selectedAd.review_link} target="_blank" rel="noopener noreferrer" className="text-sm font-black text-indigo-400 hover:text-indigo-300 transition-colors">Open Review File ↗</a>
              </div>
            )}
            <div>
              <label className={labelClass}>Move Stage</label>
              <select className={selectClass} value={selectedAd.status} onChange={e => setSelectedAd({ ...selectedAd, status: e.target.value })}>
                <option value="Pending Upload">Pending Upload (Current)</option>
                <option value="Testing">Testing</option>
              </select>
            </div>
            <div className="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20">
              <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Upload Note</label>
              <textarea rows={2} className="w-full border-2 border-white/10 p-3 rounded-xl text-sm outline-none focus:border-indigo-500 bg-white/5 font-medium text-slate-100" placeholder="Log upload details..." value={manualLogNote} onChange={e => setManualLogNote(e.target.value)} />
            </div>
            <div className="flex justify-between items-center pt-4 border-t-2 border-white/10">
              <button type="button" onClick={() => { setSelectedAd(null); setManualLogNote(""); }} className="text-xs font-black text-slate-500 uppercase tracking-widest px-4 py-2 hover:bg-white/5 rounded-xl">Close</button>
              <button type="submit" className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-500 text-xs uppercase tracking-widest">Mark as Uploaded</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── CONTENT COORDINATOR VIEW ──
  if (isContentCoord) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 md:p-4">
        <div className="bg-[#1e1f20] border border-white/10 rounded-[32px] w-full max-w-lg shadow-2xl p-8">
          <h2 className="text-2xl font-black text-slate-100 mb-2">{selectedAd.concept_name}</h2>
          <div className="flex gap-2 mb-6">
            <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full uppercase border border-indigo-500/20">{selectedAd.status}</span>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <TimerBlock />
            {selectedAd.brief_link && (
              <div className="bg-indigo-500/10 border-2 border-indigo-500/20 rounded-2xl p-4">
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Brief (Milanote)</p>
                <a href={selectedAd.brief_link} target="_blank" rel="noopener noreferrer" className="text-sm font-black text-indigo-400 hover:text-indigo-300 transition-colors">Open Brief ↗</a>
              </div>
            )}
            <div>
              <label className={labelClass}>Move Stage</label>
              <select disabled={!stageMovable} className={`w-full border-2 p-3 rounded-2xl text-sm font-black ${!stageMovable ? "bg-white/5 text-slate-600 border-white/5 cursor-not-allowed" : "border-white/10 bg-[#2a2b2c] text-slate-100"}`} value={selectedAd.status} onChange={e => setSelectedAd({ ...selectedAd, status: e.target.value })}>
                <option value={originalAdStatus}>{originalAdStatus} (Current)</option>
                {stageMovable && allowedTransitions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20">
              <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Note</label>
              <textarea rows={2} className="w-full border-2 border-white/10 p-3 rounded-xl text-sm outline-none focus:border-indigo-500 bg-white/5 font-medium text-slate-100" placeholder="Add a note..." value={manualLogNote} onChange={e => setManualLogNote(e.target.value)} />
            </div>
            <div className="flex justify-between items-center pt-4 border-t-2 border-white/10">
              <button type="button" onClick={() => { setSelectedAd(null); setManualLogNote(""); }} className="text-xs font-black text-slate-500 uppercase px-4 py-2 hover:bg-white/5 rounded-xl">Close</button>
              <button type="submit" className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-500 text-xs uppercase tracking-widest">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── FOUNDER / STRATEGIST FULL VIEW ──
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 md:p-4">
      <div className="bg-[#1e1f20] border border-white/10 rounded-[32px] w-full max-w-5xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
        <div className="flex-1 p-6 md:p-8 overflow-y-auto border-r border-white/10">
          <div className="mb-6">
            {selectedAd.imprint_number && isFounder && (
              <div className="mb-2 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 w-fit">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Imprint</span>
                <span className="text-[9px] font-black text-slate-400 font-mono">{selectedAd.ad_format?.replace(/ /g, "")} #</span>
                <input
                  type="number"
                  className="w-14 text-[11px] font-black text-slate-200 bg-transparent outline-none font-mono"
                  value={selectedAd.imprint_number || ""}
                  onChange={e => setSelectedAd({ ...selectedAd, imprint_number: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
            )}
            {selectedAd.imprint_number && (
              <div className="mb-3 bg-black/40 rounded-xl px-3 py-2 overflow-x-auto border border-white/10">
                <p className="text-[10px] font-black font-mono text-amber-400 whitespace-nowrap tracking-wide">
                  {selectedAd.ad_format?.replace(/ /g, "")} #{String(selectedAd.imprint_number).padStart(4, "0")} | {selectedAd.created_at ? new Date(selectedAd.created_at).toISOString().split("T")[0] : "—"} || {selectedAd.concept_name || "—"} || {selectedAd.angle || "—"} || {(selectedAd.product || "").replace(/ /g, "")} || {selectedAd.assigned_editor || "—"} || {selectedAd.assigned_copywriter || "—"}
                </p>
              </div>
            )}
            <EditableTitle value={selectedAd.concept_name} onChange={v => setSelectedAd({ ...selectedAd, concept_name: v })} />
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full uppercase border border-indigo-500/20">{selectedAd.status}</span>
              <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${getPriorityBadge(selectedAd.priority)}`}>{selectedAd.priority} Priority</span>
              {overdue && <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/20 animate-pulse">⚠️ Overdue</span>}
              {["Ad Revision", "Done, Waiting for Approval"].includes(originalAdStatus) && (originalAd?.revision_count || 0) > 0 && (
                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${revisionLimitReached ? "bg-rose-500/20 text-rose-400 border border-rose-500/20" : "bg-amber-500/20 text-amber-400 border border-amber-500/20"}`}>
                  🔄 Round {originalAd?.revision_count}/2
                </span>
              )}
              {originalAdStatus === "Done, Waiting for Approval" && (
                <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 animate-pulse">
                  ✋ Awaiting Approval
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <TimerBlock />

            {isLocked && !isFounder && (
              <div className="bg-rose-500/10 border-2 border-rose-500/20 p-5 rounded-3xl flex items-start gap-3 animate-pulse">
                <span className="text-2xl">🔒</span>
                <div>
                  <p className="text-sm font-black text-rose-400 uppercase">Testing Lock Active</p>
                  <p className="text-xs text-rose-500 font-bold italic">Pipeline movement disabled. Unlocks in {daysLeft} days.</p>
                </div>
              </div>
            )}
            {isFounder && isLocked && (
              <div className="bg-amber-500/10 border-2 border-amber-500/20 p-4 rounded-3xl flex items-center gap-3">
                <span className="text-xl">⚡</span>
                <p className="text-sm font-black text-amber-400">Founder Override — Testing lock bypassed</p>
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
                <label className={labelClass}>Strategist {!canReassign && <span className="text-slate-600 normal-case">(locked)</span>}</label>
                {canReassign ? (
                  <select className={selectClass} value={selectedAd.assigned_copywriter || ""} onChange={e => setSelectedAd({ ...selectedAd, assigned_copywriter: e.target.value })}>
                    <option value="">— Unassigned —</option>
                    {allStrategists.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                ) : (
                  <input disabled className="w-full border-2 border-white/5 p-3 rounded-xl text-sm bg-white/5 font-bold text-slate-600 cursor-not-allowed" value={selectedAd.assigned_copywriter || "Unassigned"} />
                )}
              </div>
              <div>
                <label className={labelClass}>Editor {!canReassign && <span className="text-slate-600 normal-case">(locked)</span>}</label>
                {canReassign ? (
                  <select className={selectClass} value={selectedAd.assigned_editor || ""} onChange={e => setSelectedAd({ ...selectedAd, assigned_editor: e.target.value })}>
                    <option value="">— Unassigned —</option>
                    {allEditorProfiles.length > 0
                      ? allEditorProfiles.map(p => <option key={p.full_name} value={p.full_name}>{p.full_name} ({p.role})</option>)
                      : allEditors.map(name => <option key={name} value={name}>{name}</option>)
                    }
                  </select>
                ) : (
                  <input disabled className="w-full border-2 border-white/5 p-3 rounded-xl text-sm bg-white/5 font-bold text-slate-600 cursor-not-allowed" value={selectedAd.assigned_editor || "Unassigned"} />
                )}
              </div>
            </div>

            {showResult && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Result</label>
                  <select className={selectClass} value={selectedAd.result || ""} onChange={e => setSelectedAd({ ...selectedAd, result: e.target.value })}>
                    <option value="">— No Result —</option>
                    <option>Winner</option><option>Loser</option><option>Inconclusive</option>
                  </select>
                </div>
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
                {selectedAd.review_link && (
                  <a href={selectedAd.review_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest mt-1 transition-colors">Open Review File ↗</a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Brief Link (Milanote)</label>
                <input type="url" className={inputClass} placeholder="Optional" value={selectedAd.brief_link || ""} onChange={e => setSelectedAd({ ...selectedAd, brief_link: e.target.value })} />
                {selectedAd.brief_link && (
                  <a href={selectedAd.brief_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest mt-1 transition-colors">Open Brief ↗</a>
                )}
              </div>
              <div>
                <label className={labelClass}>Due Date</label>
                <input type="date" className={`${inputClass} ${overdue ? "border-rose-500/30 bg-rose-500/10" : ""}`} value={formatDate(selectedAd.due_date)} onChange={e => setSelectedAd({ ...selectedAd, due_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
                {overdue && <p className="text-[9px] font-black text-rose-400 mt-1">⚠️ This ad is overdue!</p>}
              </div>
            </div>

            <div>
              <label className={labelClass}>Notes</label>
              <textarea rows={1} className={`${inputClass} resize-none`} placeholder="Optional notes..." value={selectedAd.notes || ""} onChange={e => setSelectedAd({ ...selectedAd, notes: e.target.value })} />
            </div>

            <div className="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20">
              <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Internal Note (Appends to Log)</label>
              <textarea rows={2} className="w-full border-2 border-white/10 p-3 rounded-xl text-sm outline-none focus:border-indigo-500 bg-white/5 font-medium text-slate-100" placeholder="Explain action taken..." value={manualLogNote} onChange={e => setManualLogNote(e.target.value)} />
            </div>

            <div className="flex justify-between items-center mt-8 pt-5 border-t-2 border-white/10">
              <div className="flex gap-2">
                <button type="button" onClick={() => { setSelectedAd(null); setManualLogNote(""); }} className="text-xs font-black text-slate-500 uppercase tracking-widest px-4 py-2 hover:bg-white/5 rounded-xl">Close</button>
                {canDelete && <button type="button" onClick={onDelete} className="text-xs font-black text-rose-400 hover:text-rose-300 uppercase tracking-widest px-4 py-2 hover:bg-rose-500/10 rounded-xl">Delete Ad</button>}
              </div>
              <button type="submit" className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-500 text-xs uppercase tracking-widest">Save Changes</button>
            </div>
          </form>
        </div>

        <div className="w-full md:w-80 bg-black/20 border-l border-white/10 p-6 flex flex-col max-h-full">
          <div className="flex bg-white/5 p-1 rounded-xl mb-4">
            <button onClick={() => setActiveTab("log")} className={`flex-1 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === "log" ? "bg-white/10 shadow-sm text-indigo-300" : "text-slate-500"}`}>Log</button>
            <button onClick={() => setActiveTab("comments")} className={`flex-1 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === "comments" ? "bg-white/10 shadow-sm text-indigo-300" : "text-slate-500"}`}>Comments</button>
            {isFounder && (
              <button onClick={() => setActiveTab("monitoring")} className={`flex-1 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === "monitoring" ? "bg-white/10 shadow-sm text-indigo-300" : "text-slate-500"}`}>Time Session</button>
            )}
          </div>

          {activeTab === "log" && (
            <div className="flex-1 overflow-y-auto space-y-6">
              {[...activityLog].reverse().map((log, idx) => (
                <div key={idx} className="relative pl-5 border-l-2 border-indigo-500/20">
                  <div className="absolute w-2.5 h-2.5 bg-indigo-500 rounded-full -left-[6px] top-0.5 border-2 border-[#1e1f20] shadow-sm"></div>
                  <p className="text-[11px] font-black text-slate-200 mb-0.5">{log.action}</p>
                  <p className="text-[10px] text-slate-500 font-bold mb-1.5">by {log.user}</p>
                  {log.note && <div className="bg-white/5 p-2 rounded-lg border border-white/10 mb-2"><p className="text-[11px] text-indigo-400 font-bold italic">"{log.note}"</p></div>}
                  <p className="text-[9px] text-slate-600 font-medium uppercase tracking-tighter">{new Date(log.timestamp).toLocaleDateString()} • {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
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
  );
}