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

function canUserModify(ad: Ad, originalStatus: string, currentRole: string, currentUser: string): { allowed: boolean; reason: string } {
  if (currentRole === "Founder") return { allowed: true, reason: "" };
  if (currentRole === "Strategist") {
    if (ad.assigned_copywriter === currentUser || ["Ad Revision", "Testing", "Writing Brief", "Brief Revision Required"].includes(originalStatus)) {
      return { allowed: true, reason: "" };
    }
    return { allowed: false, reason: `⛔ Access Denied — You are not the assigned strategist for this ad. Only the assigned strategist or Founder can make changes.` };
  }
  if (currentRole === "Editor" || currentRole === "Graphic Designer") {
    if (ad.assigned_editor === currentUser) return { allowed: true, reason: "" };
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
          <p className="text-[11px] text-slate-300 font-bold italic text-center py-4">No comments yet — be the first to add one</p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="bg-slate-50 rounded-2xl p-3 group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-600 text-[9px]">{comment.posted_by?.charAt(0)?.toUpperCase()}</div>
                    <span className="text-[10px] font-black text-slate-700">{comment.posted_by}</span>
                    <span className="text-[9px] text-slate-400">{new Date(comment.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} at {new Date(comment.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p className="text-[12px] text-slate-700 font-medium leading-snug pl-7">{comment.message}</p>
                </div>
                {(isFounder || comment.posted_by === currentUser) && (
                  <button onClick={() => deleteComment(comment.id, adId)} className="text-[9px] font-black text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all px-2 py-1 rounded-lg hover:bg-rose-50 shrink-0">✕</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <input type="text" placeholder="Add a comment..." className="flex-1 border-2 border-slate-100 bg-slate-50 p-3 rounded-2xl text-sm font-medium outline-none focus:border-indigo-400 transition-all placeholder:text-slate-300 text-slate-900" value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(adId, adName, assignedEditor, assignedCopywriter); } }} />
        <button onClick={() => submitComment(adId, adName, assignedEditor, assignedCopywriter)} disabled={isSubmitting || !newComment.trim()} className="bg-indigo-600 text-white px-4 py-3 rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all disabled:opacity-40 shrink-0">{isSubmitting ? "..." : "Post"}</button>
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
        <div className="flex flex-col items-center justify-center py-10 text-slate-300">
          <div className="text-4xl mb-2">👁️</div>
          <p className="text-[11px] font-bold text-center">No sessions recorded yet</p>
          <p className="text-[10px] text-center mt-1 px-2">Sessions start when team members open their assigned ads</p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Summary</p>
            <div className="space-y-2">
              {Object.entries(summary).map(([user, data]) => (
                <div key={user} className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-600 text-[9px]">{user.charAt(0).toUpperCase()}</div>
                      <span className="text-[11px] font-black text-slate-700">{user}</span>
                    </div>
                    <span className="text-[10px] font-black text-indigo-600">{fmtDuration(data.totalSeconds)}</span>
                  </div>
                  <div className="flex items-center justify-between pl-7">
                    <span className="text-[9px] text-slate-400">{data.sessions} session{data.sessions !== 1 ? "s" : ""}</span>
                    <span className="text-[9px] text-slate-400">Last: {new Date(data.lastSeen).toLocaleDateString(undefined, { month: "short", day: "numeric" })} {new Date(data.lastSeen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Session Log</p>
          <div className="space-y-2">
            {sessions.map((s, idx) => (
              <div key={idx} className="relative pl-4 border-l-2 border-slate-100">
                <div className="absolute w-2 h-2 bg-slate-300 rounded-full -left-[5px] top-1" />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-700">{s.user_name}</span>
                  <span className="text-[9px] font-bold text-slate-400">{s.user_role}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[9px] text-slate-400">{new Date(s.started_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${s.is_active ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}`}>{s.is_active ? "Active" : fmtDuration(s.total_seconds)}</span>
                </div>
                {s.finished_at && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Finished Time:</span>
                    <span className="text-[9px] font-black text-emerald-600">{new Date(s.finished_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {new Date(s.finished_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 md:p-4">
      <div className="bg-white rounded-[32px] w-full max-w-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
        <div className="flex-1 p-6 md:p-8 overflow-y-auto border-r border-slate-100">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-800 mb-2">{selectedAd.concept_name}</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full uppercase border border-indigo-100">{selectedAd.status}</span>
              <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${getPriorityBadge(selectedAd.priority)}`}>{selectedAd.priority} Priority</span>
            </div>
            <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 mb-4">
              <p className="text-[11px] font-black text-rose-700 leading-relaxed">{reason}</p>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ad Type</p>
                  <p className="text-sm font-black text-slate-700">{selectedAd.ad_type || "—"}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Format</p>
                  <p className="text-sm font-black text-slate-700">{selectedAd.ad_format || "—"}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Strategist</p>
                  <p className="text-sm font-black text-slate-700">{selectedAd.assigned_copywriter || "—"}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Editor</p>
                  <p className="text-sm font-black text-slate-700">{selectedAd.assigned_editor || "—"}</p>
                </div>
                {selectedAd.product && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Product</p>
                    <p className="text-sm font-black text-slate-700">{selectedAd.product}</p>
                  </div>
                )}
                {selectedAd.due_date && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Due Date</p>
                    <p className="text-sm font-black text-slate-700">{new Date(selectedAd.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {selectedAd.brief_link && (
                  <a href={selectedAd.brief_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-500 hover:text-indigo-700 transition-colors uppercase tracking-widest">
                    Open Brief (Milanote) ↗
                  </a>
                )}
                {selectedAd.review_link && (
                  <a href={selectedAd.review_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-500 hover:text-indigo-700 transition-colors uppercase tracking-widest">
                    View Review File (Frame.io) ↗
                  </a>
                )}
              </div>
              {selectedAd.notes && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Notes</p>
                  <p className="text-sm text-slate-600 font-medium">{selectedAd.notes}</p>
                </div>
              )}
            </div>
            <div className="mt-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Comments</p>
              <CommentsSection adId={selectedAd.id} adName={selectedAd.concept_name} assignedEditor={selectedAd.assigned_editor} assignedCopywriter={selectedAd.assigned_copywriter} currentUser={currentUser} currentRole={currentRole} supabase={supabase} />
            </div>
          </div>
          <div className="flex justify-start pt-4 border-t-2 border-slate-100">
            <button type="button" onClick={() => { setSelectedAd(null); setManualLogNote(""); }} className="text-xs font-black text-slate-400 uppercase tracking-widest px-4 py-2 hover:bg-slate-50 rounded-xl">Close</button>
          </div>
        </div>
        <div className="w-full md:w-72 bg-slate-50 p-6 flex flex-col max-h-full">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Activity Log</h3>
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

export default function AdDetailModal({
  selectedAd, ads, manualLogNote, setManualLogNote,
  setSelectedAd, onUpdate, onDelete,
  currentRole, currentUser, allEditors = [], allEditorProfiles = [], allStrategists = [], supabase,
  activeSession, onFinishSession, fetchSessionsForAd, fetchAllSessions, formatTimer
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
      return ["Idea", "Writing Brief", "Brief Revision Required", "Brief Approved", "Preparing Content", "Content Revision Required", "Content Ready", "Editor Assigned", "In Progress", "Ad Revision", "Pending Upload", "Testing", "Completed", "Killed"].filter(s => s !== originalAdStatus);
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
    if (!allowed) {
      alert(reason);
      return;
    }
    onUpdate(e);
  };

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
    return (
      <ReadOnlyView
        selectedAd={selectedAd}
        setSelectedAd={setSelectedAd}
        setManualLogNote={setManualLogNote}
        currentUser={currentUser}
        currentRole={currentRole}
        supabase={supabase}
        reason={reason}
      />
    );
  }

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
                {overdue && <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-rose-100 text-rose-600 border border-rose-200 animate-pulse">⚠️ Overdue</span>}
              </div>
              {selectedAd.due_date && (
                <p className={`text-[10px] font-black mt-2 uppercase ${overdue ? "text-rose-500" : "text-slate-400"}`}>
                  Due: {new Date(selectedAd.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
              {revisionLimitReached && (
                <div className="mt-3 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">⛔ Max revisions reached — Send Back is no longer available</p>
                </div>
              )}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <TimerBlock />
              {isLocked && (
                <div className="bg-rose-50 border-2 border-rose-100 p-5 rounded-3xl flex items-start gap-3">
                  <span className="text-2xl">🔒</span>
                  <div>
                    <p className="text-sm font-black text-rose-900 uppercase">Testing Lock Active</p>
                    <p className="text-xs text-rose-700 font-bold italic">Unlocks in {daysLeft} days.</p>
                  </div>
                </div>
              )}
              {selectedAd.brief_link && (
                <div className="bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-4">
                  <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Brief (Milanote)</p>
                  <a href={selectedAd.brief_link} target="_blank" rel="noopener noreferrer" className="text-sm font-black text-indigo-600 hover:text-indigo-800 transition-colors">
                    Open Brief ↗
                  </a>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">
                  Move Stage {revisionLimitReached && <span className="ml-2 text-rose-400 normal-case font-bold">— Ad Revision unavailable after Round 2</span>}
                </label>
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
                <input type="url" className="w-full border-2 border-slate-100 bg-slate-50 p-3 rounded-2xl text-sm font-bold outline-none focus:border-indigo-400 text-slate-900" placeholder="Paste Frame.io link..." value={selectedAd.review_link || ""} onChange={e => setSelectedAd({ ...selectedAd, review_link: e.target.value })} />
                {selectedAd.review_link && (
                  <a href={selectedAd.review_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[9px] font-black text-indigo-500 hover:text-indigo-700 uppercase tracking-widest mt-1 transition-colors">
                    Open Review File ↗
                  </a>
                )}
              </div>
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Internal Note</label>
                <textarea rows={2} className="w-full border-2 border-white p-3 rounded-xl text-sm outline-none focus:border-indigo-400 bg-white font-medium shadow-sm" placeholder="Explain action taken..." value={manualLogNote} onChange={e => setManualLogNote(e.target.value)} />
              </div>
              <CommentsSection adId={selectedAd.id} adName={selectedAd.concept_name} assignedEditor={selectedAd.assigned_editor} assignedCopywriter={selectedAd.assigned_copywriter} currentUser={currentUser} currentRole={currentRole} supabase={supabase} />
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <TimerBlock />
            {selectedAd.brief_link && (
              <div className="bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-4">
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Brief (Milanote)</p>
                <a href={selectedAd.brief_link} target="_blank" rel="noopener noreferrer" className="text-sm font-black text-indigo-600 hover:text-indigo-800 transition-colors">Open Brief ↗</a>
              </div>
            )}
            {selectedAd.review_link && (
              <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Review File (Frame.io)</p>
                <a href={selectedAd.review_link} target="_blank" rel="noopener noreferrer" className="text-sm font-black text-indigo-600 hover:text-indigo-800 transition-colors">Open Review File ↗</a>
              </div>
            )}
            <div>
              <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Move Stage</label>
              <select className="w-full border-2 border-slate-100 bg-slate-50 p-3 rounded-2xl text-sm font-black text-slate-900" value={selectedAd.status} onChange={e => setSelectedAd({ ...selectedAd, status: e.target.value })}>
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <TimerBlock />
            {selectedAd.brief_link && (
              <div className="bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-4">
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Brief (Milanote)</p>
                <a href={selectedAd.brief_link} target="_blank" rel="noopener noreferrer" className="text-sm font-black text-indigo-600 hover:text-indigo-800 transition-colors">Open Brief ↗</a>
              </div>
            )}
            <div>
              <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Move Stage</label>
              <select disabled={!stageMovable} className={`w-full border-2 p-3 rounded-2xl text-sm font-black ${!stageMovable ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "border-slate-100 bg-slate-50 text-slate-900"}`} value={selectedAd.status} onChange={e => setSelectedAd({ ...selectedAd, status: e.target.value })}>
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
              {overdue && <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-rose-100 text-rose-600 border border-rose-200 animate-pulse">⚠️ Overdue</span>}
              {originalAdStatus === "Ad Revision" && (originalAd?.revision_count || 0) > 0 && (
                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${revisionLimitReached ? "bg-rose-100 text-rose-600 border border-rose-200" : "bg-amber-100 text-amber-600 border border-amber-200"}`}>
                  Round {originalAd?.revision_count}/2
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <TimerBlock />

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
                <select className="w-full border-2 border-slate-100 bg-slate-50 p-3 rounded-2xl text-sm font-black focus:border-indigo-500 text-slate-900" value={selectedAd.status} onChange={e => setSelectedAd({ ...selectedAd, status: e.target.value })}>
                  <option value={originalAdStatus}>{originalAdStatus} (Current)</option>
                  {allowedTransitions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Content Source</label>
                <select className="w-full border-2 p-3 rounded-2xl text-sm font-black border-slate-100 bg-slate-50 text-slate-900" value={selectedAd.content_source} onChange={e => setSelectedAd({ ...selectedAd, content_source: e.target.value })}>
                  <option>Internal Team</option><option>UGC Creator</option><option>AI Generated</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ad Type</label>
                <select className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm bg-slate-50 font-bold outline-none focus:border-indigo-400 text-slate-900" value={selectedAd.ad_type || ""} onChange={e => setSelectedAd({ ...selectedAd, ad_type: e.target.value })}>
                  <option value="New Concept">New Concept</option>
                  <option value="Iteration">Iteration</option>
                  <option value="Ideation">Ideation</option>
                  <option value="Imitation">Imitation</option>
                </select>
              </div>
              {isFounder && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Priority</label>
                  <select className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm bg-slate-50 font-bold outline-none focus:border-indigo-400 text-slate-900" value={selectedAd.priority || "Medium"} onChange={e => setSelectedAd({ ...selectedAd, priority: e.target.value })}>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Strategist {!canReassign && <span className="text-slate-300 normal-case">(locked)</span>}
                </label>
                {canReassign ? (
                  <select className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm bg-slate-50 font-bold outline-none focus:border-indigo-400 text-slate-900" value={selectedAd.assigned_copywriter || ""} onChange={e => setSelectedAd({ ...selectedAd, assigned_copywriter: e.target.value })}>
                    <option value="">— Unassigned —</option>
                    {allStrategists.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                ) : (
                  <input disabled className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm bg-slate-100 font-bold text-slate-400 cursor-not-allowed" value={selectedAd.assigned_copywriter || "Unassigned"} />
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Editor {!canReassign && <span className="text-slate-300 normal-case">(locked)</span>}
                </label>
                {canReassign ? (
                  <select className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm bg-slate-50 font-bold outline-none focus:border-indigo-400 text-slate-900" value={selectedAd.assigned_editor || ""} onChange={e => setSelectedAd({ ...selectedAd, assigned_editor: e.target.value })}>
                    <option value="">— Unassigned —</option>
                    {allEditorProfiles.length > 0
                      ? allEditorProfiles.map(p => <option key={p.full_name} value={p.full_name}>{p.full_name} ({p.role})</option>)
                      : allEditors.map(name => <option key={name} value={name}>{name}</option>)
                    }
                  </select>
                ) : (
                  <input disabled className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm bg-slate-100 font-bold text-slate-400 cursor-not-allowed" value={selectedAd.assigned_editor || "Unassigned"} />
                )}
              </div>
            </div>

            {showResult && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Result</label>
                  <select className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm bg-slate-50 font-bold outline-none focus:border-indigo-400 text-slate-900" value={selectedAd.result || ""} onChange={e => setSelectedAd({ ...selectedAd, result: e.target.value })}>
                    <option value="">— No Result —</option>
                    <option>Winner</option><option>Loser</option><option>Inconclusive</option>
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ad Spend ($)</label>
                <input type="number" min="0" step="0.01" className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm outline-none focus:border-indigo-400 bg-slate-50 font-bold text-slate-900" placeholder="0.00" value={selectedAd.ad_spend || ""} onChange={e => setSelectedAd({ ...selectedAd, ad_spend: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Review Link (Frame.io)</label>
                <input type="url" className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm outline-none focus:border-indigo-400 bg-slate-50 font-bold text-slate-900" placeholder="Optional" value={selectedAd.review_link || ""} onChange={e => setSelectedAd({ ...selectedAd, review_link: e.target.value })} />
                {selectedAd.review_link && (
                  <a href={selectedAd.review_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[9px] font-black text-indigo-500 hover:text-indigo-700 uppercase tracking-widest mt-1 transition-colors">
                    Open Review File ↗
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Brief Link (Milanote)</label>
                <input type="url" className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm outline-none focus:border-indigo-400 bg-slate-50 font-bold text-slate-900" placeholder="Optional" value={selectedAd.brief_link || ""} onChange={e => setSelectedAd({ ...selectedAd, brief_link: e.target.value })} />
                {selectedAd.brief_link && (
                  <a href={selectedAd.brief_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[9px] font-black text-indigo-500 hover:text-indigo-700 uppercase tracking-widest mt-1 transition-colors">
                    Open Brief ↗
                  </a>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Due Date</label>
                <input type="date" className={`w-full border-2 p-3 rounded-xl text-sm outline-none focus:border-indigo-400 bg-slate-50 font-bold text-slate-900 ${overdue ? "border-rose-300 bg-rose-50" : "border-slate-100"}`} value={formatDate(selectedAd.due_date)} onChange={e => setSelectedAd({ ...selectedAd, due_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
                {overdue && <p className="text-[9px] font-black text-rose-500 mt-1">⚠️ This ad is overdue!</p>}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Notes</label>
              <textarea rows={1} className="w-full border-2 border-slate-100 p-3 rounded-xl text-sm outline-none focus:border-indigo-400 bg-slate-50 font-medium resize-none text-slate-900" placeholder="Optional notes..." value={selectedAd.notes || ""} onChange={e => setSelectedAd({ ...selectedAd, notes: e.target.value })} />
            </div>

            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
              <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Internal Note (Appends to Log)</label>
              <textarea rows={2} className="w-full border-2 border-white p-3 rounded-xl text-sm outline-none focus:border-indigo-400 bg-white font-medium shadow-sm" placeholder="Explain action taken..." value={manualLogNote} onChange={e => setManualLogNote(e.target.value)} />
            </div>

            <div className="flex justify-between items-center mt-8 pt-5 border-t-2 border-slate-100">
              <div className="flex gap-2">
                <button type="button" onClick={() => { setSelectedAd(null); setManualLogNote(""); }} className="text-xs font-black text-slate-400 uppercase tracking-widest px-4 py-2 hover:bg-slate-50 rounded-xl">Close</button>
                {canDelete && <button type="button" onClick={onDelete} className="text-xs font-black text-rose-500 hover:text-rose-700 uppercase tracking-widest px-4 py-2 hover:bg-rose-50 rounded-xl">Delete Ad</button>}
              </div>
              <button type="submit" className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-700 text-xs uppercase tracking-widest">Save Changes</button>
            </div>
          </form>
        </div>

        <div className="w-full md:w-80 bg-slate-50 border-l border-slate-100 p-6 flex flex-col max-h-full">
          <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
            <button onClick={() => setActiveTab("log")} className={`flex-1 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === "log" ? "bg-white shadow-sm text-indigo-600" : "text-slate-400"}`}>Log</button>
            <button onClick={() => setActiveTab("comments")} className={`flex-1 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === "comments" ? "bg-white shadow-sm text-indigo-600" : "text-slate-400"}`}>Comments</button>
            {isFounder && (
              <button onClick={() => setActiveTab("monitoring")} className={`flex-1 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === "monitoring" ? "bg-white shadow-sm text-indigo-600" : "text-slate-400"}`}>Time Session</button>
            )}
          </div>

          {activeTab === "log" && (
            <div className="flex-1 overflow-y-auto space-y-6">
              {[...activityLog].reverse().map((log, idx) => (
                <div key={idx} className="relative pl-5 border-l-2 border-indigo-100">
                  <div className="absolute w-2.5 h-2.5 bg-indigo-500 rounded-full -left-[6px] top-0.5 border-2 border-white shadow-sm"></div>
                  <p className="text-[11px] font-black text-slate-800 mb-0.5">{log.action}</p>
                  <p className="text-[10px] text-slate-500 font-bold mb-1.5">by {log.user}</p>
                  {log.note && <div className="bg-white p-2 rounded-lg border border-slate-100 mb-2"><p className="text-[11px] text-indigo-700 font-bold italic">"{log.note}"</p></div>}
                  <p className="text-[9px] text-slate-400 font-medium uppercase tracking-tighter">{new Date(log.timestamp).toLocaleDateString()} • {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
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