import { useState, useEffect } from "react";
import { Ad, TimeLogEntry } from "../../types";
import { ALLOWED_TRANSITIONS } from "../../constants";
import { getDaysLeftInTesting } from "../../utils/helpers";
import { useComments } from "../../hooks/useComments";
import { useScripts } from "../../hooks/useScripts";

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
  subAvatars?: string[];
  angles?: string[];
  concepts?: string[];
  personas?: string[];
  coreEmotions?: string[];
  problems?: string[];
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

// CPA = spend / purchases (auto-calc, never stored)
function calcCPA(spend?: number, purchases?: number): string {
  if (!spend || !purchases || purchases <= 0) return "—";
  return `$${(spend / purchases).toFixed(2)}`;
}

function EditableTitle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const commit = () => { setEditing(false); if (draft.trim()) onChange(draft.trim()); else setDraft(value); };
  if (editing) {
    return (
      <input autoFocus className="text-2xl font-black text-gray-100 leading-tight mb-2 w-full border-b-2 border-gray-500 bg-transparent outline-none"
        value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={commit} onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }} />
    );
  }
  return (
    <h2 className="text-2xl font-black text-gray-100 leading-tight mb-2 cursor-pointer hover:text-white transition-colors group flex items-center gap-2"
      onClick={() => { setDraft(value); setEditing(true); }} title="Click to rename">
      {value}
      <span className="text-sm text-gray-600 group-hover:text-gray-400 transition-colors">✏️</span>
    </h2>
  );
}

function canUserModify(ad: Ad, originalStatus: string, currentRole: string, currentUser: string): { allowed: boolean; reason: string } {
  if (currentRole === "Founder") return { allowed: true, reason: "" };
  if (currentRole === "Strategist") {
    if (ad.assigned_copywriter === currentUser) return { allowed: true, reason: "" };
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
          <p className="text-[11px] text-gray-500 font-bold italic text-center py-4">No comments yet</p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="bg-[#0d0d0f] rounded-xl p-3 group border border-gray-800">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-[#1f1f23] flex items-center justify-center font-black text-gray-200 text-[9px]">{comment.posted_by?.charAt(0)?.toUpperCase()}</div>
                    <span className="text-[10px] font-black text-gray-200">{comment.posted_by}</span>
                    <span className="text-[9px] text-gray-500">{new Date(comment.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                  </div>
                  <p className="text-[12px] text-gray-400 font-medium leading-snug pl-7">{comment.message}</p>
                </div>
                {(isFounder || comment.posted_by === currentUser) && (
                  <button onClick={() => deleteComment(comment.id, adId)} className="text-[9px] font-black text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all px-2 py-1 rounded-lg shrink-0">✕</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <input type="text" placeholder="Add a comment..." className="flex-1 border border-gray-700 bg-[#0d0d0f] p-3 rounded-xl text-sm font-medium outline-none focus:border-gray-500 transition-all placeholder:text-gray-600 text-gray-100" value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(adId, adName, assignedEditor, assignedCopywriter); } }} />
        <button onClick={() => submitComment(adId, adName, assignedEditor, assignedCopywriter)} disabled={isSubmitting || !newComment.trim()} className="bg-gray-100 text-gray-900 px-4 py-3 rounded-xl font-black text-xs hover:bg-white transition-all disabled:opacity-40 shrink-0">{isSubmitting ? "..." : "Post"}</button>
      </div>
    </div>
  );
}

function ScriptTab({ adId, currentUser, supabase, canEdit }: {
  adId: string; currentUser: string; supabase: any; canEdit: boolean;
}) {
  const {
    scripts, scenes, activeScriptId, setActiveScriptId,
    isLoading, isSaving,
    fetchScripts, fetchScenes,
    createScript, updateScript, setPrimaryScript, deleteScript,
    addScene, updateScene, deleteScene, toggleSceneDone,
  } = useScripts(supabase, currentUser);

  const [draftIntent, setDraftIntent] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => { fetchScripts(adId); }, [adId]);

  const activeScript = scripts.find(s => s.id === activeScriptId) || null;

  // Load active script content into local drafts when it changes
  useEffect(() => {
    if (activeScript) {
      setDraftIntent(activeScript.messaging_intent || "");
      setDraftBody(activeScript.body || "");
      setDirty(false);
      fetchScenes(activeScript.id);
    } else {
      setDraftIntent(""); setDraftBody("");
    }
  }, [activeScriptId, scripts.length]);

  const handleSave = async () => {
    if (!activeScript) return;
    await updateScript(activeScript.id, adId, { messaging_intent: draftIntent, body: draftBody });
    setDirty(false);
  };

  const inputBg = "w-full bg-[#0d0d0f] border border-gray-700 rounded-xl p-3 text-sm text-gray-100 outline-none focus:border-gray-500 resize-none";

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-gray-500 text-[11px] font-bold">Loading scripts…</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Version selector */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {scripts.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveScriptId(s.id)}
            className={`text-[10px] font-black px-2.5 py-1 rounded-lg border transition-all ${
              s.id === activeScriptId ? "bg-gray-100 text-gray-900 border-gray-100" : "bg-[#0d0d0f] text-gray-400 border-gray-700 hover:border-gray-500"
            }`}
          >
            {s.is_primary ? "★ " : ""}v{s.version}
          </button>
        ))}
        {canEdit && (
          <button
            onClick={() => createScript(adId)}
            className="text-[10px] font-black px-2.5 py-1 rounded-lg border border-dashed border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-all"
          >
            + New
          </button>
        )}
      </div>

      {!activeScript ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <span className="text-3xl mb-2">📝</span>
          <p className="text-[11px] font-bold text-center mb-3">No script yet</p>
          {canEdit && (
            <button onClick={() => createScript(adId)} className="bg-gray-100 text-gray-900 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all">
              Create Script
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Status + primary controls */}
          <div className="flex items-center justify-between gap-2">
            <select
              disabled={!canEdit}
              value={activeScript.status}
              onChange={e => updateScript(activeScript.id, adId, { status: e.target.value })}
              className="text-[10px] font-black bg-[#1a1a1d] border border-gray-700 rounded-lg px-2 py-1 text-gray-200 outline-none disabled:opacity-60"
            >
              <option>Draft</option>
              <option>In Review</option>
              <option>Approved</option>
            </select>
            <div className="flex items-center gap-2">
              {!activeScript.is_primary && canEdit && (
                <button onClick={() => setPrimaryScript(activeScript.id, adId)} className="text-[9px] font-black text-amber-500 hover:text-amber-400 uppercase tracking-widest">Set Primary</button>
              )}
              {activeScript.is_primary && <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">★ Primary</span>}
              {canEdit && scripts.length > 1 && (
                <button onClick={() => { if (confirm("Delete this script version?")) deleteScript(activeScript.id, adId); }} className="text-[9px] font-black text-gray-600 hover:text-red-400 uppercase tracking-widest">Delete</button>
              )}
            </div>
          </div>

          {activeScript.generated_by_ai && (
            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">⚡ AI-drafted{activeScript.ai_model ? ` · ${activeScript.ai_model}` : ""}</p>
          )}

          {/* Messaging intent */}
          <div>
            <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Messaging Intent <span className="normal-case text-gray-600">(what we're saying & why)</span></label>
            <textarea
              rows={3}
              disabled={!canEdit}
              className={inputBg}
              placeholder="The core message and why it lands for this persona/emotion…"
              value={draftIntent}
              onChange={e => { setDraftIntent(e.target.value); setDirty(true); }}
            />
          </div>

          {/* Script body */}
          <div>
            <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Script</label>
            <textarea
              rows={10}
              disabled={!canEdit}
              className={inputBg}
              placeholder="Write the full script here…"
              value={draftBody}
              onChange={e => { setDraftBody(e.target.value); setDirty(true); }}
            />
          </div>

          {canEdit && (
            <button
              onClick={handleSave}
              disabled={!dirty || isSaving}
              className="w-full bg-gray-100 text-gray-900 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all disabled:opacity-40"
            >
              {isSaving ? "Saving…" : dirty ? "Save Script" : "Saved"}
            </button>
          )}

          {/* Scenes */}
          <div className="pt-2 border-t border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Scene Breakdown ({scenes.length})</p>
              {canEdit && (
                <button onClick={() => addScene(activeScript.id)} className="text-[9px] font-black text-gray-400 hover:text-gray-200 uppercase tracking-widest">+ Add Scene</button>
              )}
            </div>
            {scenes.length === 0 ? (
              <p className="text-[10px] text-gray-600 italic">No scenes yet. Add scenes manually, or AI breakdown coming soon.</p>
            ) : (
              <div className="space-y-2">
                {scenes.map((sc, i) => (
                  <div key={sc.id} className="bg-[#0d0d0f] border border-gray-800 rounded-xl p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={sc.is_done} disabled={!canEdit} onChange={e => toggleSceneDone(sc.id, activeScript.id, e.target.checked)} className="accent-green-500" />
                        <span className="text-[10px] font-black text-gray-300">Scene {i + 1}</span>
                      </div>
                      {canEdit && (
                        <button onClick={() => deleteScene(sc.id, activeScript.id)} className="text-[9px] font-black text-gray-600 hover:text-red-400">✕</button>
                      )}
                    </div>
                    <textarea rows={2} disabled={!canEdit} className={`${inputBg} text-[12px] mb-1.5`} placeholder="Scene text / VO line…"
                      defaultValue={sc.scene_text} onBlur={e => { if (e.target.value !== sc.scene_text) updateScene(sc.id, activeScript.id, { scene_text: e.target.value }); }} />
                    <textarea rows={2} disabled={!canEdit} className={`${inputBg} text-[12px]`} placeholder="Visual direction / B-roll…"
                      defaultValue={sc.visual_direction} onBlur={e => { if (e.target.value !== sc.visual_direction) updateScene(sc.id, activeScript.id, { visual_direction: e.target.value }); }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
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
        <div className="flex flex-col items-center justify-center py-10 text-gray-500">
          <div className="text-4xl mb-2">👁️</div>
          <p className="text-[11px] font-bold text-center">No sessions recorded yet</p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Summary</p>
            <div className="space-y-2">
              {Object.entries(summary).map(([user, data]) => (
                <div key={user} className="bg-[#0d0d0f] border border-gray-800 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#1f1f23] flex items-center justify-center font-black text-gray-200 text-[9px]">{user.charAt(0).toUpperCase()}</div>
                      <span className="text-[11px] font-black text-gray-200">{user}</span>
                    </div>
                    <span className="text-[10px] font-black text-green-400">{fmtDuration(data.totalSeconds)}</span>
                  </div>
                  <div className="flex items-center justify-between pl-7">
                    <span className="text-[9px] text-gray-500">{data.sessions} session{data.sessions !== 1 ? "s" : ""}</span>
                    <span className="text-[9px] text-gray-500">Last: {new Date(data.lastSeen).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Session Log</p>
          <div className="space-y-2">
            {sessions.map((s, idx) => (
              <div key={idx} className="relative pl-4 border-l-2 border-gray-700">
                <div className="absolute w-2 h-2 bg-gray-600 rounded-full -left-[5px] top-1" />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-200">{s.user_name}</span>
                  <span className="text-[9px] font-bold text-gray-500">{s.user_role}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[9px] text-gray-500">{new Date(s.started_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${s.is_active ? "bg-amber-950 text-amber-400" : "bg-green-950 text-green-400"}`}>{s.is_active ? "Active" : fmtDuration(s.total_seconds)}</span>
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
      className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center rounded-full bg-[#1a1a1d] shadow-lg text-gray-400 hover:text-gray-100 hover:bg-[#2a2a2e] transition-all font-black z-10 border border-gray-700 text-sm"
    >
      ✕
    </button>
  );
}

function AdSetNameBar({ selectedAd }: { selectedAd: Ad }) {
  const adSetName = [
    selectedAd.imprint_number ? `DTC #${String(selectedAd.imprint_number)}` : "",
    selectedAd.ad_format || "",
    (selectedAd.whitelisting_page || []).length > 0 ? (selectedAd.whitelisting_page || []).join(" & ") : "",
    selectedAd.concept || "",
    selectedAd.sub_avatar || "",
    selectedAd.angle || "",
    selectedAd.awareness || "",
    selectedAd.ad_type || "",
    selectedAd.assigned_editor ? `Editor: ${selectedAd.assigned_editor}` : "",
    selectedAd.assigned_copywriter ? `Strategist: ${selectedAd.assigned_copywriter}` : "",
  ].filter(Boolean).join(" || ");

  return (
    <div className="px-4 py-2.5 border-b border-gray-800">
      <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">📋 Ad Set Name — Click to Select & Copy</p>
      <div className="inline-block bg-amber-950/40 border border-amber-900 rounded-full px-4 py-1.5 max-w-full">
        <input
          readOnly
          onFocus={e => e.target.select()}
          onClick={e => (e.target as HTMLInputElement).select()}
          className="text-[11px] font-black text-amber-400 bg-transparent outline-none cursor-pointer font-mono max-w-full"
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative w-full max-w-3xl">
        <CloseButton onClose={() => { setSelectedAd(null); setManualLogNote(""); }} />
        <div className="bg-[#141416] rounded-2xl w-full shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh] border border-gray-800">
          <div className="flex-1 overflow-y-auto border-r border-gray-800">
            <div className="p-6">
              {selectedAd.imprint_number && (
                <div className="mb-3 bg-amber-950/40 rounded-xl px-3 py-2 border border-amber-900">
                  <p className="text-[10px] font-black font-mono text-amber-400 whitespace-nowrap tracking-wide">
                    {[
                      `DTC #${String(selectedAd.imprint_number)}`,
                      selectedAd.ad_format || "",
                      (selectedAd.whitelisting_page || []).length > 0 ? (selectedAd.whitelisting_page || []).join(" & ") : "",
                      selectedAd.assigned_editor ? `Editor: ${selectedAd.assigned_editor}` : "",
                      selectedAd.assigned_copywriter ? `Strategist: ${selectedAd.assigned_copywriter}` : "",
                    ].filter(Boolean).join(" || ")}
                  </p>
                </div>
              )}
              <EditableTitle value={selectedAd.concept_name} onChange={v => setSelectedAd({ ...selectedAd, concept_name: v })} />
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-[10px] font-black text-gray-200 bg-[#1f1f23] px-3 py-1 rounded-full uppercase border border-gray-700">{selectedAd.status}</span>
                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                  selectedAd.priority === "High" ? "bg-red-950 text-red-400 border-red-900" :
                  selectedAd.priority === "Medium" ? "bg-amber-950 text-amber-400 border-amber-900" :
                  "bg-[#0d0d0f] text-gray-500 border-gray-800"
                }`}>{selectedAd.priority} Priority</span>
              </div>
              <div className="bg-red-950/30 border border-red-900 rounded-2xl p-4 mb-4">
                <p className="text-[11px] font-black text-red-400 leading-relaxed">{reason}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Ad Type", value: selectedAd.ad_type },
                  { label: "Format", value: selectedAd.ad_format },
                  { label: "Strategist", value: selectedAd.assigned_copywriter },
                  { label: "Editor", value: selectedAd.assigned_editor },
                  ...(selectedAd.product ? [{ label: "Product", value: selectedAd.product }] : []),
                ].map(item => (
                  <div key={item.label} className="bg-[#0d0d0f] border border-gray-800 rounded-xl p-3">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">{item.label}</p>
                    <p className="text-sm font-black text-gray-200">{item.value || "—"}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Comments</p>
                <CommentsSection adId={selectedAd.id} adName={selectedAd.concept_name} assignedEditor={selectedAd.assigned_editor} assignedCopywriter={selectedAd.assigned_copywriter} currentUser={currentUser} currentRole={currentRole} supabase={supabase} />
              </div>
              <div className="pt-4 border-t border-gray-800 mt-4">
                <button type="button" onClick={() => { setSelectedAd(null); setManualLogNote(""); }} className="text-xs font-black text-gray-400 uppercase tracking-widest px-4 py-2 hover:bg-[#1a1a1d] rounded-xl">Close</button>
              </div>
            </div>
          </div>
          <div className="w-full md:w-64 bg-[#0d0d0f] p-5 flex flex-col max-h-full">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Activity Log</h3>
            <div className="flex-1 overflow-y-auto space-y-4">
              {[...activityLog].reverse().map((log, idx) => (
                <div key={idx} className="relative pl-4 border-l-2 border-gray-700">
                  <div className="absolute w-2.5 h-2.5 bg-green-500 rounded-full -left-[6px] top-0.5 border-2 border-[#0d0d0f]" />
                  <p className="text-[11px] font-black text-gray-200 mb-0.5">{log.action}</p>
                  <p className="text-[10px] text-gray-500 font-bold mb-1">by {log.user}</p>
                  {log.note && <div className="bg-[#141416] p-2 rounded-lg border border-gray-800 mb-1"><p className="text-[11px] text-green-400 font-bold italic">"{log.note}"</p></div>}
                  <p className="text-[9px] text-gray-600 uppercase tracking-tighter">{new Date(log.timestamp).toLocaleDateString()} • {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
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
  products = [], whitelistPages = [], destinationUrls = [],
  subAvatars = [], angles = [], concepts = [], personas = [], coreEmotions = [], problems = []
}: Props) {
  const daysLeft = getDaysLeftInTesting(selectedAd.live_date);
  const isLocked = selectedAd.status === "Testing" && daysLeft > 0;
  const originalAd = ads.find(a => a.id === selectedAd.id);
  const originalAdStatus = originalAd?.status || selectedAd.status;
  const overdue = isOverdue(selectedAd.due_date) && !["Winner", "Killed"].includes(selectedAd.status);
  const showResult = ["Testing", "Winner"].includes(originalAdStatus);

  const isFounder = currentRole === "Founder";
  const isStrategist = currentRole === "Strategist";
  const isEditor = currentRole === "Editor" || currentRole === "Graphic Designer";
  const isVA = currentRole === "VA";
  const isContentCoord = currentRole === "Content Coordinator";
  const isMediaBuyer = currentRole === "Media Buyer";

  const { allowed, reason } = canUserModify(originalAd || selectedAd, originalAdStatus, currentRole, currentUser);

  const getAllowedTransitions = () => {
    if (isFounder || isStrategist) {
      return ["Idea", "Writing Brief", "Brief Revision Required", "Brief Approved", "Editor Assigned", "In Progress", "Ad Revision", "Pending Upload", "Testing", "Winner", "Killed"]
        .filter(s => s !== originalAdStatus);
    }
    const transitions = ALLOWED_TRANSITIONS[originalAdStatus] || [];
    return transitions.filter(s => s !== "Killed");
  };

  const canDelete = isFounder || (isStrategist && selectedAd.assigned_copywriter === currentUser);
  const canReassign = isFounder || isStrategist;
  const stageMovable = !isLocked || isFounder || isStrategist;
  const allowedTransitions = getAllowedTransitions();

  let activityLog: TimeLogEntry[] = [];
  try { activityLog = JSON.parse(selectedAd.time_log || "[]"); } catch { activityLog = []; }

  const [activeTab, setActiveTab] = useState<"log" | "comments" | "script" | "monitoring">("log");

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!allowed) { alert(reason); return; } onUpdate(e); };
  const handleClose = () => { setSelectedAd(null); setManualLogNote(""); };

  const inputClass = "w-full border border-gray-700 bg-[#0d0d0f] p-3 rounded-xl text-sm font-bold outline-none focus:border-gray-500 text-gray-100";
  const labelClass = "block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1";
  const selectClass = "w-full border border-gray-700 bg-[#1a1a1d] p-3 rounded-xl text-sm font-bold outline-none focus:border-gray-500 text-gray-200";

  const TimerBlock = () => (
    activeSession && !isStrategist && !isFounder ? (
      <div className="bg-green-800 rounded-2xl p-4 flex items-center justify-between mb-2">
        <div>
          <p className="text-[9px] font-black text-green-300 uppercase tracking-widest mb-1">⏱️ Session Active</p>
          <p className="text-2xl font-black text-white font-mono">{formatTimer ? formatTimer(activeSession.elapsedSeconds) : "00:00:00"}</p>
          <p className="text-[9px] text-green-300 mt-1">Started {new Date(activeSession.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <button type="button" onClick={onFinishSession} className="bg-white text-green-800 font-black text-xs uppercase tracking-widest px-4 py-3 rounded-xl hover:bg-gray-100 transition-all shadow-sm">✅ Finish</button>
      </div>
    ) : null
  );

  if (!isFounder && !isStrategist && !allowed) {
    return <ReadOnlyView selectedAd={selectedAd} setSelectedAd={setSelectedAd} setManualLogNote={setManualLogNote} currentUser={currentUser} currentRole={currentRole} supabase={supabase} reason={reason} />;
  }

  // ── EDITOR VIEW ──
  if (isEditor) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="relative w-full max-w-3xl">
          <CloseButton onClose={handleClose} />
          <div className="bg-[#141416] rounded-2xl w-full shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh] border border-gray-800">
            <div className="flex-1 p-6 overflow-y-auto border-r border-gray-800">
              <div className="mb-5">
                {selectedAd.imprint_number && (
                  <div className="mb-3 bg-amber-950/40 rounded-xl px-3 py-2 border border-amber-900">
                    <p className="text-[10px] font-black font-mono text-amber-400 tracking-wide">DTC #{String(selectedAd.imprint_number)} — {selectedAd.ad_format}</p>
                  </div>
                )}
                <h2 className="text-xl font-black text-gray-100 mb-2">{selectedAd.concept_name}</h2>
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] font-black text-gray-200 bg-[#1f1f23] px-3 py-1 rounded-full uppercase border border-gray-700">{selectedAd.status}</span>
                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                    selectedAd.priority === "High" ? "bg-red-950 text-red-400 border-red-900" :
                    selectedAd.priority === "Medium" ? "bg-amber-950 text-amber-400 border-amber-900" :
                    "bg-[#0d0d0f] text-gray-500 border-gray-800"
                  }`}>{selectedAd.priority} Priority</span>
                  {overdue && <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-red-950 text-red-400 border border-red-900 animate-pulse">⚠️ Overdue</span>}
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <TimerBlock />
                {isLocked && (
                  <div className="bg-red-950/30 border border-red-900 p-4 rounded-2xl flex items-start gap-3">
                    <span className="text-xl">🔒</span>
                    <div>
                      <p className="text-sm font-black text-red-400 uppercase">Testing Lock Active</p>
                      <p className="text-xs text-red-500 font-bold">Unlocks in {daysLeft} days.</p>
                    </div>
                  </div>
                )}
                {selectedAd.brief_link && (
                  <div className="bg-green-950/30 border border-green-900 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-green-400 uppercase tracking-widest mb-2">Brief (Milanote)</p>
                    <a href={selectedAd.brief_link} target="_blank" rel="noopener noreferrer" className="text-sm font-black text-green-400 hover:text-green-300 transition-colors">Open Brief ↗</a>
                  </div>
                )}
                {originalAd?.assigned_editor === currentUser && allEditorProfiles.length > 1 && (
                  <div className="bg-amber-950/30 border border-amber-900 rounded-2xl p-4">
                    <label className="block text-[9px] font-black text-amber-400 uppercase tracking-widest mb-2">🔄 Pass to Another Editor</label>
                    <select className={selectClass} value={selectedAd.assigned_editor || ""} onChange={e => setSelectedAd({ ...selectedAd, assigned_editor: e.target.value })}>
                      <option value={currentUser}>{currentUser} (You)</option>
                      {allEditorProfiles.filter(p => p.full_name !== currentUser).map(p => (
                        <option key={p.full_name} value={p.full_name}>{p.full_name} ({p.role})</option>
                      ))}
                    </select>
                    <p className="text-[9px] text-amber-500 font-medium mt-2">Saves when you hit Save Changes</p>
                  </div>
                )}
                <div>
                  <label className={labelClass}>Move Stage</label>
                  <select disabled={!stageMovable} className={`w-full border p-3 rounded-xl text-sm font-black transition-all ${!stageMovable ? "bg-[#0d0d0f] text-gray-600 border-gray-800 cursor-not-allowed" : "border-gray-700 bg-[#1a1a1d] text-gray-200 focus:border-gray-500"}`} value={selectedAd.status} onChange={e => setSelectedAd({ ...selectedAd, status: e.target.value })}>
                    <option value={originalAdStatus}>{originalAdStatus} (Current)</option>
                    {stageMovable && allowedTransitions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Review Link (Frame.io)</label>
                  <input type="url" className={inputClass} placeholder="Paste Frame.io link..." value={selectedAd.review_link || ""} onChange={e => setSelectedAd({ ...selectedAd, review_link: e.target.value })} />
                </div>
                <div className="bg-green-950/30 p-4 rounded-2xl border border-green-900">
                  <label className="block text-[10px] font-black text-green-400 uppercase tracking-widest mb-2">Internal Note</label>
                  <textarea rows={2} className="w-full border border-green-900 p-3 rounded-xl text-sm outline-none focus:border-green-700 bg-[#0d0d0f] font-medium text-gray-100" placeholder="Explain action taken..." value={manualLogNote} onChange={e => setManualLogNote(e.target.value)} />
                </div>
                <CommentsSection adId={selectedAd.id} adName={selectedAd.concept_name} assignedEditor={selectedAd.assigned_editor} assignedCopywriter={selectedAd.assigned_copywriter} currentUser={currentUser} currentRole={currentRole} supabase={supabase} />
                <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                  <button type="button" onClick={handleClose} className="text-xs font-black text-gray-400 uppercase tracking-widest px-4 py-2 hover:bg-[#1a1a1d] rounded-xl">Close</button>
                  <button type="submit" className="bg-gray-100 text-gray-900 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white shadow-sm">Save Changes</button>
                </div>
              </form>
            </div>
            <div className="w-full md:w-64 bg-[#0d0d0f] p-5 flex flex-col max-h-full">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Activity Log</h3>
              <div className="flex-1 overflow-y-auto space-y-4">
                {[...activityLog].reverse().map((log, idx) => (
                  <div key={idx} className="relative pl-4 border-l-2 border-gray-700">
                    <div className="absolute w-2.5 h-2.5 bg-green-500 rounded-full -left-[6px] top-0.5 border-2 border-[#0d0d0f]" />
                    <p className="text-[11px] font-black text-gray-200 mb-0.5">{log.action}</p>
                    <p className="text-[10px] text-gray-500 font-bold mb-1">by {log.user}</p>
                    {log.note && <div className="bg-[#141416] p-2 rounded-lg border border-gray-800 mb-1"><p className="text-[11px] text-green-400 font-bold italic">"{log.note}"</p></div>}
                    <p className="text-[9px] text-gray-600 uppercase tracking-tighter">{new Date(log.timestamp).toLocaleDateString()} • {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="relative w-full max-w-lg">
          <CloseButton onClose={handleClose} />
          <div className="bg-[#141416] rounded-2xl w-full shadow-2xl border border-gray-800 overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-black text-gray-100 mb-2">{selectedAd.concept_name}</h2>
              <div className="flex gap-2 mb-5">
                <span className="text-[10px] font-black text-gray-200 bg-[#1f1f23] px-3 py-1 rounded-full uppercase border border-gray-700">{selectedAd.status}</span>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <TimerBlock />
                {selectedAd.review_link && (
                  <div className="bg-[#0d0d0f] border border-gray-800 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Review File</p>
                    <a href={selectedAd.review_link} target="_blank" rel="noopener noreferrer" className="text-sm font-black text-green-400 hover:text-green-300">Open Review File ↗</a>
                  </div>
                )}
                <div>
                  <label className={labelClass}>Move Stage</label>
                  <select className={selectClass} value={selectedAd.status} onChange={e => setSelectedAd({ ...selectedAd, status: e.target.value })}>
                    <option value="Pending Upload">Pending Upload (Current)</option>
                    <option value="Testing">Testing</option>
                  </select>
                </div>
                <div className="bg-green-950/30 p-4 rounded-2xl border border-green-900">
                  <label className="block text-[10px] font-black text-green-400 uppercase tracking-widest mb-2">Upload Note</label>
                  <textarea rows={2} className="w-full border border-green-900 p-3 rounded-xl text-sm outline-none focus:border-green-700 bg-[#0d0d0f] font-medium text-gray-100" placeholder="Log upload details..." value={manualLogNote} onChange={e => setManualLogNote(e.target.value)} />
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                  <button type="button" onClick={handleClose} className="text-xs font-black text-gray-400 uppercase tracking-widest px-4 py-2 hover:bg-[#1a1a1d] rounded-xl">Close</button>
                  <button type="submit" className="bg-gray-100 text-gray-900 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white shadow-sm">Mark as Uploaded</button>
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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="relative w-full max-w-2xl">
          <CloseButton onClose={handleClose} />
          <div className="bg-[#141416] rounded-2xl w-full shadow-2xl border border-gray-800 overflow-hidden max-h-[90vh] flex flex-col">
            <AdSetNameBar selectedAd={selectedAd} />
            <div className="flex-1 overflow-y-auto p-6">
              <h2 className="text-xl font-black text-gray-100 mb-2">{selectedAd.concept_name}</h2>
              <div className="flex flex-wrap gap-2 mb-5">
                <span className="text-[10px] font-black text-gray-200 bg-[#1f1f23] px-3 py-1 rounded-full uppercase border border-gray-700">{selectedAd.status}</span>
                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                  selectedAd.priority === "High" ? "bg-red-950 text-red-400 border-red-900" :
                  selectedAd.priority === "Medium" ? "bg-amber-950 text-amber-400 border-amber-900" :
                  "bg-[#0d0d0f] text-gray-500 border-gray-800"
                }`}>{selectedAd.priority} Priority</span>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <TimerBlock />
                {selectedAd.review_link && (
                  <div className="bg-[#0d0d0f] border border-gray-800 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Review File</p>
                    <a href={selectedAd.review_link} target="_blank" rel="noopener noreferrer" className="text-sm font-black text-green-400 hover:text-green-300">Open Review File ↗</a>
                  </div>
                )}
                <div className="bg-green-950/30 border border-green-900 rounded-2xl p-4 space-y-3">
                  <p className="text-[9px] font-black text-green-400 uppercase tracking-widest">Upload Info</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Strategist", value: selectedAd.assigned_copywriter },
                      { label: "Editor", value: selectedAd.assigned_editor },
                      { label: "Format", value: selectedAd.ad_format },
                      { label: "Product", value: selectedAd.product },
                      { label: "Sub Avatar", value: selectedAd.sub_avatar },
                      { label: "Angle", value: selectedAd.angle },
                      { label: "Concept", value: selectedAd.concept },
                      { label: "Awareness", value: selectedAd.awareness },
                      { label: "Persona", value: selectedAd.persona },
                      { label: "Core Emotion", value: selectedAd.core_emotion },
                      { label: "Problem", value: selectedAd.problem },
                    ].filter(item => item.value).map(item => (
                      <div key={item.label}>
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">{item.label}</p>
                        <p className="text-sm font-black text-gray-200">{item.value || "—"}</p>
                      </div>
                    ))}
                  </div>
                  {selectedAd.brief_link && (
                    <div>
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Brief (Milanote)</p>
                      <a href={selectedAd.brief_link} target="_blank" rel="noopener noreferrer" className="text-sm font-black text-green-400 hover:text-green-300 break-all">Open Brief ↗</a>
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Destination URLs (PDP)</p>
                    {(selectedAd.destination_url || []).length > 0 ? (
                      <div className="space-y-1">
                        {(selectedAd.destination_url || []).map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block text-sm font-black text-green-400 hover:text-green-300 break-all">{i + 1}. {url} ↗</a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-black text-red-400">⚠️ No destination URL set — ask the Strategist</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Whitelisting Pages</p>
                    {(selectedAd.whitelisting_page || []).length > 0 ? (
                      <div className="space-y-1">
                        {(selectedAd.whitelisting_page || []).map((page, i) => (
                          <p key={i} className="text-sm font-black text-gray-200">{i + 1}. {page}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-black text-red-400">⚠️ No whitelisting page set — ask the Strategist</p>
                    )}
                  </div>
                  {(selectedAd.selected_headline || selectedAd.selected_ad_copy) && (
                    <div className="border-t border-green-900 pt-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-black text-green-400 uppercase tracking-widest">📌 Selected Ad Copy</p>
                        <button type="button" onClick={() => setSelectedAd({ ...selectedAd, selected_headline: undefined, selected_ad_copy: undefined })}
                          className="text-[9px] font-black text-red-400 hover:text-red-300 uppercase tracking-widest px-2 py-1 hover:bg-red-950 rounded-lg transition-all">
                          🗑 Remove
                        </button>
                      </div>
                      {selectedAd.selected_headline && (
                        <div>
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Headline</p>
                          <div className="flex items-start gap-2">
                            <textarea rows={2} className="flex-1 text-sm font-black text-gray-100 bg-[#0d0d0f] rounded-xl p-2 border border-green-900 outline-none focus:border-green-700 resize-none"
                              value={selectedAd.selected_headline} onChange={e => setSelectedAd({ ...selectedAd, selected_headline: e.target.value })} />
                            <button onClick={() => navigator.clipboard.writeText(selectedAd.selected_headline || "")} className="text-[9px] font-black text-gray-500 hover:text-green-400 uppercase shrink-0 mt-1">Copy</button>
                          </div>
                        </div>
                      )}
                      {selectedAd.selected_ad_copy && (
                        <div>
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Ad Copy</p>
                          <div className="flex items-start gap-2">
                            <textarea rows={10} className="flex-1 text-sm font-medium text-gray-100 bg-[#0d0d0f] rounded-xl p-2 border border-green-900 outline-none focus:border-green-700 resize-none"
                              value={selectedAd.selected_ad_copy} onChange={e => setSelectedAd({ ...selectedAd, selected_ad_copy: e.target.value })} />
                            <button onClick={() => navigator.clipboard.writeText(selectedAd.selected_ad_copy || "")} className="text-[9px] font-black text-gray-500 hover:text-green-400 uppercase shrink-0 mt-1">Copy</button>
                          </div>
                        </div>
                      )}
                      <p className="text-[9px] text-green-500 font-medium">Changes save when you hit Save Changes below</p>
                    </div>
                  )}
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
                        <button key={r} type="button" onClick={() => setSelectedAd({ ...selectedAd, result: r })}
                          className={`py-3 rounded-xl font-black text-xs uppercase tracking-widest border-2 transition-all ${
                            selectedAd.result === r
                              ? r === "Winner" ? "bg-green-600 text-white border-green-600"
                              : r === "Loser" ? "bg-red-500 text-white border-red-500"
                              : "bg-gray-500 text-white border-gray-500"
                              : "bg-[#0d0d0f] border-gray-700 text-gray-400 hover:border-gray-500"
                          }`}>
                          {r === "Winner" ? "🏆" : r === "Loser" ? "❌" : "❓"} {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Ad Spend ($)</label>
                    <input type="number" min="0" step="0.01" className={inputClass} placeholder="0.00" value={selectedAd.ad_spend || ""} onChange={e => setSelectedAd({ ...selectedAd, ad_spend: e.target.value ? Number(e.target.value) : undefined })} />
                  </div>
                  <div>
                    <label className={labelClass}>Purchases</label>
                    <input type="number" min="0" step="1" className={inputClass} placeholder="0" value={selectedAd.purchases ?? ""} onChange={e => setSelectedAd({ ...selectedAd, purchases: e.target.value ? Number(e.target.value) : undefined })} />
                  </div>
                  <div>
                    <label className={labelClass}>CVR (%)</label>
                    <input type="number" min="0" step="0.01" className={inputClass} placeholder="0.00" value={selectedAd.cvr ?? ""} onChange={e => setSelectedAd({ ...selectedAd, cvr: e.target.value ? Number(e.target.value) : undefined })} />
                  </div>
                </div>
                <div className="bg-[#0d0d0f] border border-gray-800 rounded-xl px-4 py-2.5 flex items-center justify-between">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">CPA (auto)</span>
                  <span className="text-sm font-black text-gray-200 font-mono">{calcCPA(selectedAd.ad_spend, selectedAd.purchases)}</span>
                </div>
                <div className="bg-green-950/30 p-4 rounded-2xl border border-green-900">
                  <label className="block text-[10px] font-black text-green-400 uppercase tracking-widest mb-2">Note</label>
                  <textarea rows={2} className="w-full border border-green-900 p-3 rounded-xl text-sm outline-none focus:border-green-700 bg-[#0d0d0f] font-medium text-gray-100" placeholder="Add a note..." value={manualLogNote} onChange={e => setManualLogNote(e.target.value)} />
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                  <button type="button" onClick={handleClose} className="text-xs font-black text-gray-400 uppercase tracking-widest px-4 py-2 hover:bg-[#1a1a1d] rounded-xl">Close</button>
                  <button type="submit" className="bg-gray-100 text-gray-900 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white shadow-sm">Save Changes</button>
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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="relative w-full max-w-lg">
          <CloseButton onClose={handleClose} />
          <div className="bg-[#141416] rounded-2xl w-full shadow-2xl p-6 border border-gray-800">
            <h2 className="text-xl font-black text-gray-100 mb-5">{selectedAd.concept_name}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <TimerBlock />
              <div>
                <label className={labelClass}>Move Stage</label>
                <select disabled={!stageMovable} className={`w-full border p-3 rounded-xl text-sm font-black ${!stageMovable ? "bg-[#0d0d0f] text-gray-600 border-gray-800 cursor-not-allowed" : "border-gray-700 bg-[#1a1a1d] text-gray-200"}`} value={selectedAd.status} onChange={e => setSelectedAd({ ...selectedAd, status: e.target.value })}>
                  <option value={originalAdStatus}>{originalAdStatus} (Current)</option>
                  {stageMovable && allowedTransitions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="bg-green-950/30 p-4 rounded-2xl border border-green-900">
                <label className="block text-[10px] font-black text-green-400 uppercase tracking-widest mb-2">Note</label>
                <textarea rows={2} className="w-full border border-green-900 p-3 rounded-xl text-sm outline-none focus:border-green-700 bg-[#0d0d0f] font-medium text-gray-100" placeholder="Add a note..." value={manualLogNote} onChange={e => setManualLogNote(e.target.value)} />
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                <button type="button" onClick={handleClose} className="text-xs font-black text-gray-400 uppercase px-4 py-2 hover:bg-[#1a1a1d] rounded-xl">Close</button>
                <button type="submit" className="bg-gray-100 text-gray-900 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white shadow-sm">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── FOUNDER / STRATEGIST FULL VIEW ──
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative w-full max-w-6xl">
        <CloseButton onClose={handleClose} />
        <div className="bg-[#141416] rounded-2xl w-full shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh] border border-gray-800">
          <div className="flex-1 p-6 overflow-y-auto border-r border-gray-800">
            <div className="mb-5">
              {selectedAd.imprint_number && isFounder && (
                <div className="mb-2 flex items-center gap-2 bg-amber-950/40 border border-amber-900 rounded-xl px-3 py-1.5 w-fit">
                  <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Imprint</span>
                  <input type="number" className="w-14 text-[11px] font-black text-amber-400 bg-transparent outline-none font-mono"
                    value={selectedAd.imprint_number || ""} onChange={e => setSelectedAd({ ...selectedAd, imprint_number: e.target.value ? Number(e.target.value) : undefined })} />
                </div>
              )}
              {selectedAd.imprint_number && (
                <div className="mb-3 bg-amber-950/40 rounded-xl px-3 py-2 border border-amber-900">
                  <p className="text-[10px] font-black font-mono text-amber-400 whitespace-nowrap tracking-wide">
                    {[
                      `DTC #${String(selectedAd.imprint_number)}`,
                      selectedAd.ad_format || "",
                      (selectedAd.whitelisting_page || []).length > 0 ? (selectedAd.whitelisting_page || []).join(" & ") : "",
                      selectedAd.concept || "",
                      selectedAd.sub_avatar || "",
                      selectedAd.angle || "",
                      selectedAd.awareness || "",
                      selectedAd.ad_type || "",
                      selectedAd.assigned_editor ? `Editor: ${selectedAd.assigned_editor}` : "",
                      selectedAd.assigned_copywriter ? `Strategist: ${selectedAd.assigned_copywriter}` : "",
                    ].filter(Boolean).join(" || ")}
                  </p>
                </div>
              )}
              <EditableTitle value={selectedAd.concept_name} onChange={v => setSelectedAd({ ...selectedAd, concept_name: v })} />
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] font-black text-gray-200 bg-[#1f1f23] px-3 py-1 rounded-full uppercase border border-gray-700">{selectedAd.status}</span>
                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                  selectedAd.priority === "High" ? "bg-red-950 text-red-400 border-red-900" :
                  selectedAd.priority === "Medium" ? "bg-amber-950 text-amber-400 border-amber-900" :
                  "bg-[#0d0d0f] text-gray-500 border-gray-800"
                }`}>{selectedAd.priority} Priority</span>
                {overdue && <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-red-950 text-red-400 border border-red-900 animate-pulse">⚠️ Overdue</span>}
                {originalAdStatus === "Done, Waiting for Approval" && (
                  <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-green-950 text-green-400 border border-green-900 animate-pulse">✋ Awaiting Approval</span>
                )}
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <TimerBlock />
              {isLocked && !isFounder && (
                <div className="bg-red-950/30 border border-red-900 p-4 rounded-2xl flex items-start gap-3">
                  <span className="text-xl">🔒</span>
                  <div>
                    <p className="text-sm font-black text-red-400 uppercase">Testing Lock Active</p>
                    <p className="text-xs text-red-500 font-bold">Unlocks in {daysLeft} days.</p>
                  </div>
                </div>
              )}
              {isFounder && isLocked && (
                <div className="bg-amber-950/30 border border-amber-900 p-4 rounded-2xl flex items-center gap-3">
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
                    <option value="New">New</option>
                  </select>
                </div>
                {(isFounder || isStrategist) && (
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
                  <label className={labelClass}>Sub Avatar</label>
                  <select className={selectClass} value={selectedAd.sub_avatar || ""} onChange={e => setSelectedAd({ ...selectedAd, sub_avatar: e.target.value })}>
                    <option value="">— Select Sub Avatar —</option>
                    {subAvatars.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Angle</label>
                  <select className={selectClass} value={selectedAd.angle || ""} onChange={e => setSelectedAd({ ...selectedAd, angle: e.target.value })}>
                    <option value="">— Select Angle —</option>
                    {angles.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Persona</label>
                  <select className={selectClass} value={selectedAd.persona || ""} onChange={e => setSelectedAd({ ...selectedAd, persona: e.target.value })}>
                    <option value="">— Select Persona —</option>
                    {personas.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Core Emotion</label>
                  <select className={selectClass} value={selectedAd.core_emotion || ""} onChange={e => setSelectedAd({ ...selectedAd, core_emotion: e.target.value })}>
                    <option value="">— Select Core Emotion —</option>
                    {coreEmotions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Problem</label>
                  <select className={selectClass} value={selectedAd.problem || ""} onChange={e => setSelectedAd({ ...selectedAd, problem: e.target.value })}>
                    <option value="">— Select Problem —</option>
                    {problems.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Concept</label>
                  <select className={selectClass} value={selectedAd.concept || ""} onChange={e => setSelectedAd({ ...selectedAd, concept: e.target.value })}>
                    <option value="">— Select Concept —</option>
                    {concepts.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Awareness</label>
                  <select className={selectClass} value={selectedAd.awareness || ""} onChange={e => setSelectedAd({ ...selectedAd, awareness: e.target.value })}>
                    <option value="">— Select Awareness —</option>
                    <option value="Unaware">Unaware</option>
                    <option value="Problem aware">Problem aware</option>
                    <option value="Solution aware">Solution aware</option>
                    <option value="Product aware">Product aware</option>
                    <option value="Most aware">Most aware</option>
                  </select>
                </div>
                <div></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Strategist {!canReassign && <span className="text-gray-600 normal-case">(locked)</span>}</label>
                  {canReassign ? (
                    <select className={selectClass} value={selectedAd.assigned_copywriter || ""} onChange={e => setSelectedAd({ ...selectedAd, assigned_copywriter: e.target.value })}>
                      <option value="">— Unassigned —</option>
                      {allStrategistProfiles.length > 0
                        ? allStrategistProfiles.map(p => <option key={p.full_name} value={p.full_name}>{p.full_name} ({p.role})</option>)
                        : allStrategists.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                  ) : (
                    <input disabled className="w-full border border-gray-800 p-3 rounded-xl text-sm bg-[#0d0d0f] font-bold text-gray-500 cursor-not-allowed" value={selectedAd.assigned_copywriter || "Unassigned"} />
                  )}
                </div>
                <div>
                  <label className={labelClass}>Editor {!canReassign && <span className="text-gray-600 normal-case">(locked)</span>}</label>
                  {canReassign ? (
                    <select className={selectClass} value={selectedAd.assigned_editor || ""} onChange={e => setSelectedAd({ ...selectedAd, assigned_editor: e.target.value })}>
                      <option value="">— Unassigned —</option>
                      {allEditorProfiles.length > 0
                        ? allEditorProfiles.map(p => <option key={p.full_name} value={p.full_name}>{p.full_name} ({p.role})</option>)
                        : allEditors.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                  ) : (
                    <input disabled className="w-full border border-gray-800 p-3 rounded-xl text-sm bg-[#0d0d0f] font-bold text-gray-500 cursor-not-allowed" value={selectedAd.assigned_editor || "Unassigned"} />
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
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Ad Spend ($)</label>
                  <input type="number" min="0" step="0.01" className={inputClass} placeholder="0.00" value={selectedAd.ad_spend || ""} onChange={e => setSelectedAd({ ...selectedAd, ad_spend: e.target.value ? Number(e.target.value) : undefined })} />
                </div>
                <div>
                  <label className={labelClass}>Purchases</label>
                  <input type="number" min="0" step="1" className={inputClass} placeholder="0" value={selectedAd.purchases ?? ""} onChange={e => setSelectedAd({ ...selectedAd, purchases: e.target.value ? Number(e.target.value) : undefined })} />
                </div>
                <div>
                  <label className={labelClass}>CVR (%)</label>
                  <input type="number" min="0" step="0.01" className={inputClass} placeholder="0.00" value={selectedAd.cvr ?? ""} onChange={e => setSelectedAd({ ...selectedAd, cvr: e.target.value ? Number(e.target.value) : undefined })} />
                </div>
              </div>
              <div className="bg-[#0d0d0f] border border-gray-800 rounded-xl px-4 py-2.5 flex items-center justify-between">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">CPA (auto — spend ÷ purchases)</span>
                <span className="text-sm font-black text-gray-200 font-mono">{calcCPA(selectedAd.ad_spend, selectedAd.purchases)}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Review Link (Frame.io)</label>
                  <div className="relative">
                    <input type="url" className={inputClass} placeholder="Optional" value={selectedAd.review_link || ""} onChange={e => setSelectedAd({ ...selectedAd, review_link: e.target.value })} />
                    {selectedAd.review_link && (
                      <a href={selectedAd.review_link} target="_blank" rel="noopener noreferrer" className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-green-400 hover:text-green-300 bg-green-950 border border-green-900 px-2 py-1 rounded-lg">Open ↗</a>
                    )}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Brief Link (Milanote)</label>
                  <div className="relative">
                    <input type="url" className={inputClass} placeholder="Optional" value={selectedAd.brief_link || ""} onChange={e => setSelectedAd({ ...selectedAd, brief_link: e.target.value })} />
                    {selectedAd.brief_link && (
                      <a href={selectedAd.brief_link} target="_blank" rel="noopener noreferrer" className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-green-400 hover:text-green-300 bg-green-950 border border-green-900 px-2 py-1 rounded-lg">Open ↗</a>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className={labelClass}>Due Date</label>
                <input type="date" className={`${inputClass} ${overdue ? "border-red-800 bg-red-950/30" : ""}`} value={formatDate(selectedAd.due_date)} onChange={e => setSelectedAd({ ...selectedAd, due_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
              </div>
              <div>
                <label className={labelClass}>Destination URLs <span className="text-gray-600 normal-case font-medium">(add multiple for A/B test)</span></label>
                <div className="space-y-2">
                  {(selectedAd.destination_url || []).map((url, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="relative flex-1">
                        <input type="url" list="destination-url-suggestions" className={inputClass} placeholder="https://..." value={url}
                          onChange={e => { const updated = [...(selectedAd.destination_url || [])]; updated[i] = e.target.value; setSelectedAd({ ...selectedAd, destination_url: updated }); }} />
                        {url && <a href={url} target="_blank" rel="noopener noreferrer" className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-green-400 hover:text-green-300 bg-green-950 border border-green-900 px-2 py-1 rounded-lg">Open ↗</a>}
                      </div>
                      <button type="button" onClick={() => { const updated = (selectedAd.destination_url || []).filter((_, idx) => idx !== i); setSelectedAd({ ...selectedAd, destination_url: updated }); }} className="text-red-400 hover:text-red-300 font-black px-2">✕</button>
                    </div>
                  ))}
                  <datalist id="destination-url-suggestions">{(destinationUrls || []).map(url => <option key={url} value={url} />)}</datalist>
                  <button type="button" onClick={() => setSelectedAd({ ...selectedAd, destination_url: [...(selectedAd.destination_url || []), ""] })} className="text-[10px] font-black text-gray-300 hover:text-white uppercase tracking-widest">+ Add URL</button>
                </div>
              </div>
              <div>
                <label className={labelClass}>Whitelisting Pages <span className="text-gray-600 normal-case font-medium">(add multiple for A/B test)</span></label>
                <div className="space-y-2">
                  {(selectedAd.whitelisting_page || []).map((page, i) => (
                    <div key={i} className="flex gap-2">
                      <select className={selectClass} value={page} onChange={e => { const updated = [...(selectedAd.whitelisting_page || [])]; updated[i] = e.target.value; setSelectedAd({ ...selectedAd, whitelisting_page: updated }); }}>
                        <option value="">— Select Page —</option>
                        {whitelistPages.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <button type="button" onClick={() => { const updated = (selectedAd.whitelisting_page || []).filter((_, idx) => idx !== i); setSelectedAd({ ...selectedAd, whitelisting_page: updated }); }} className="text-red-400 hover:text-red-300 font-black px-2">✕</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setSelectedAd({ ...selectedAd, whitelisting_page: [...(selectedAd.whitelisting_page || []), ""] })} className="text-[10px] font-black text-gray-300 hover:text-white uppercase tracking-widest">+ Add Page</button>
                </div>
              </div>
              {(selectedAd.selected_headline || selectedAd.selected_ad_copy) && (
                <div className="bg-blue-950/30 border border-blue-900 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">📌 Selected Ad Copy</p>
                    <button type="button" onClick={() => setSelectedAd({ ...selectedAd, selected_headline: undefined, selected_ad_copy: undefined })}
                      className="text-[9px] font-black text-red-400 hover:text-red-300 uppercase tracking-widest px-2 py-1 hover:bg-red-950 rounded-lg transition-all">🗑 Remove</button>
                  </div>
                  {selectedAd.selected_headline && (
                    <div>
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Headline</p>
                      <textarea rows={2} className="w-full text-sm font-black text-gray-100 bg-[#0d0d0f] rounded-xl p-3 border border-blue-900 outline-none focus:border-blue-700 resize-none"
                        value={selectedAd.selected_headline} onChange={e => setSelectedAd({ ...selectedAd, selected_headline: e.target.value })} />
                    </div>
                  )}
                  {selectedAd.selected_ad_copy && (
                    <div>
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Ad Copy</p>
                      <textarea rows={10} className="w-full text-sm font-medium text-gray-100 bg-[#0d0d0f] rounded-xl p-3 border border-blue-900 outline-none focus:border-blue-700 resize-none"
                        value={selectedAd.selected_ad_copy} onChange={e => setSelectedAd({ ...selectedAd, selected_ad_copy: e.target.value })} />
                    </div>
                  )}
                  <p className="text-[9px] text-blue-400 font-medium">Changes save when you hit Save Changes below</p>
                </div>
              )}
              <div>
                <label className={labelClass}>Notes</label>
                <textarea rows={1} className={`${inputClass} resize-none`} placeholder="Optional notes..." value={selectedAd.notes || ""} onChange={e => setSelectedAd({ ...selectedAd, notes: e.target.value })} />
              </div>
              <div className="bg-green-950/30 p-4 rounded-2xl border border-green-900">
                <label className="block text-[10px] font-black text-green-400 uppercase tracking-widest mb-2">Internal Note (Appends to Log)</label>
                <textarea rows={2} className="w-full border border-green-900 p-3 rounded-xl text-sm outline-none focus:border-green-700 bg-[#0d0d0f] font-medium text-gray-100" placeholder="Explain action taken..." value={manualLogNote} onChange={e => setManualLogNote(e.target.value)} />
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                <div className="flex gap-2">
                  <button type="button" onClick={handleClose} className="text-xs font-black text-gray-400 uppercase tracking-widest px-4 py-2 hover:bg-[#1a1a1d] rounded-xl">Close</button>
                  {canDelete && <button type="button" onClick={onDelete} className="text-xs font-black text-red-400 hover:text-red-300 uppercase tracking-widest px-4 py-2 hover:bg-red-950 rounded-xl">Delete Ad</button>}
                </div>
                <button type="submit" className="bg-gray-100 text-gray-900 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white shadow-sm">Save Changes</button>
              </div>
            </form>
          </div>
          <div className="w-full md:w-80 bg-[#0d0d0f] border-l border-gray-800 p-5 flex flex-col max-h-full">
            <div className="flex gap-1 bg-[#141416] border border-gray-800 p-1 rounded-xl mb-4">
              <button onClick={() => setActiveTab("log")} className={`flex-1 px-1 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-tight transition-all ${activeTab === "log" ? "bg-gray-100 text-gray-900 shadow-sm" : "text-gray-300 hover:text-white hover:bg-[#1f1f23]"}`}>Log</button>
              <button onClick={() => setActiveTab("comments")} className={`flex-1 px-1 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-tight transition-all ${activeTab === "comments" ? "bg-gray-100 text-gray-900 shadow-sm" : "text-gray-300 hover:text-white hover:bg-[#1f1f23]"}`}>Comments</button>
              <button onClick={() => setActiveTab("script")} className={`flex-1 px-1 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-tight transition-all flex items-center justify-center gap-1 ${activeTab === "script" ? "bg-amber-400 text-gray-900 shadow-sm" : "text-amber-400 hover:text-amber-300 bg-amber-500/10 ring-1 ring-inset ring-amber-500/40"}`}>✍️ Script</button>
              {isFounder && (
                <button onClick={() => setActiveTab("monitoring")} className={`flex-1 px-1 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-tight transition-all ${activeTab === "monitoring" ? "bg-gray-100 text-gray-900 shadow-sm" : "text-gray-300 hover:text-white hover:bg-[#1f1f23]"}`}>Sessions</button>
              )}
            </div>
            {activeTab === "log" && (
              <div className="flex-1 overflow-y-auto space-y-4">
                {[...activityLog].reverse().map((log, idx) => (
                  <div key={idx} className="relative pl-4 border-l-2 border-gray-700">
                    <div className="absolute w-2.5 h-2.5 bg-green-500 rounded-full -left-[6px] top-0.5 border-2 border-[#0d0d0f]" />
                    <p className="text-[11px] font-black text-gray-200 mb-0.5">{log.action}</p>
                    <p className="text-[10px] text-gray-500 font-bold mb-1">by {log.user}</p>
                    {log.note && <div className="bg-[#141416] p-2 rounded-lg border border-gray-800 mb-1"><p className="text-[11px] text-green-400 font-bold italic">"{log.note}"</p></div>}
                    <p className="text-[9px] text-gray-600 uppercase tracking-tighter">{new Date(log.timestamp).toLocaleDateString()} • {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                ))}
              </div>
            )}
            {activeTab === "comments" && (
              <div className="flex-1 overflow-y-auto">
                <CommentsSection adId={selectedAd.id} adName={selectedAd.concept_name} assignedEditor={selectedAd.assigned_editor} assignedCopywriter={selectedAd.assigned_copywriter} currentUser={currentUser} currentRole={currentRole} supabase={supabase} />
              </div>
            )}
            {activeTab === "script" && (
              <ScriptTab adId={selectedAd.id} currentUser={currentUser} supabase={supabase} canEdit={isFounder || isStrategist} />
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