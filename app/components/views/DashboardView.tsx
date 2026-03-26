"use client";
import { useMemo, useState, useEffect } from "react";
import { Ad } from "../../types";

type DashboardViewMode = "Dashboard" | "Pipeline" | "MyQueue" | "Manager" | "Reports" | "Ideas" | "Learnings" | "Members" | "Settings";

interface Props {
  ads: Ad[];
  currentUser: string;
  currentRole: string;
  onSelectAd: (ad: Ad) => void;
  onNewAd?: () => void;
  onNavigate?: (view: DashboardViewMode) => void;
  allProfiles?: any[];
  activeSessions?: Record<string, { sessionId: string; elapsedSeconds: number; startedAt: string }>;
  formatTimer?: (seconds: number) => string;
  supabase?: any;
}

const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

function daysSince(date: string) {
  return Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 3600 * 24));
}

function isOverdue(dateStr?: string) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function formatDueDate(dateStr?: string) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
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

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    High: "bg-rose-500",
    Medium: "bg-amber-400",
    Low: "bg-slate-500"
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[priority] || "bg-slate-500"}`} />;
}

function AdCard({ ad, onClick, showDays = true, extra, session, formatTimer }: {
  ad: Ad;
  onClick: () => void;
  showDays?: boolean;
  extra?: React.ReactNode;
  session?: { elapsedSeconds: number } | null;
  formatTimer?: (seconds: number) => string;
}) {
  const days = daysSince(ad.stage_updated_at || ad.created_at);
  const isStale = days >= 5;
  const overdue = isOverdue(ad.due_date) && !["Completed", "Killed"].includes(ad.status);
  const dueDate = formatDueDate(ad.due_date);
  const isActive = !!session;

  return (
    <div
      onClick={onClick}
      className={`border rounded-[18px] p-4 cursor-pointer hover:shadow-md transition-all ${
        isActive ? "border-indigo-500/40 bg-indigo-500/10 hover:border-indigo-400/60" :
        overdue ? "border-rose-500/40 bg-rose-500/10 hover:border-rose-400/60" :
        "border-white/10 bg-white/5 hover:border-indigo-500/30 hover:bg-white/8"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <PriorityDot priority={ad.priority} />
            <p className="font-black text-slate-100 text-sm truncate">{ad.concept_name}</p>
            {overdue && (
              <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-rose-500/20 text-rose-400 rounded-md shrink-0 animate-pulse">
                Overdue
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-white/10 text-slate-400 rounded-md">{ad.ad_format}</span>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-white/10 text-slate-400 rounded-md">{ad.status}</span>
            {ad.priority === "High" && (
              <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded-md">🔥 High</span>
            )}
            {dueDate && (
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                overdue ? "bg-rose-500/20 text-rose-400" : "bg-white/10 text-slate-400"
              }`}>
                📅 {dueDate}
              </span>
            )}
          </div>
          {isActive && formatTimer && session && (
            <div className="mt-1 inline-flex items-center gap-2 bg-indigo-500 text-white px-2.5 py-1 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest">Active</span>
              <span className="font-black text-xs font-mono">{formatTimer(session.elapsedSeconds)}</span>
            </div>
          )}
          {extra}
        </div>
        {showDays && (
          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg shrink-0 ${isStale ? "bg-rose-500/20 text-rose-400" : "bg-white/10 text-slate-500"}`}>
            {days}d
          </span>
        )}
      </div>
    </div>
  );
}

function Section({ title, count, color, children, empty }: {
  title: string;
  count: number;
  color: string;
  children: React.ReactNode;
  empty: string;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${color}`}>
          {title}
        </span>
        <span className="text-[10px] font-black text-slate-500">{count}</span>
      </div>
      {count === 0 ? (
        <div className="border border-dashed border-white/10 rounded-[18px] p-8 text-center text-slate-600 font-bold text-sm">
          {empty}
        </div>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </div>
  );
}

// ── FOUNDER DASHBOARD ──
function FounderDashboard({ ads, onSelectAd, onNavigate, allProfiles, activeSessions, formatTimer, supabase }: Props) {
  const [adSessions, setAdSessions] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!supabase) return;
    const activeAds = ads.filter(a => !["Completed", "Killed"].includes(a.status));
    if (activeAds.length === 0) return;

    const fetchSessions = async () => {
      const { data } = await supabase
        .from("ad_sessions")
        .select("*")
        .in("ad_id", activeAds.map(a => a.id))
        .order("started_at", { ascending: false });

      if (!data) return;
      const latestByAd: Record<string, any> = {};
      data.forEach((s: any) => {
        if (!latestByAd[s.ad_id]) latestByAd[s.ad_id] = s;
      });
      setAdSessions(latestByAd);
    };

    fetchSessions();
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, [supabase, ads]);

  const overdueAds = ads.filter(ad => {
    const days = daysSince(ad.stage_updated_at || ad.created_at);
    return days >= 5 && !["Completed", "Killed", "Testing"].includes(ad.status);
  }).sort((a, b) => daysSince(b.stage_updated_at || b.created_at) - daysSince(a.stage_updated_at || a.created_at));

  const dueDateOverdue = ads.filter(ad =>
    isOverdue(ad.due_date) && !["Completed", "Killed"].includes(ad.status)
  );

  const allOverdue = Array.from(new Set([...overdueAds, ...dueDateOverdue].map(a => a.id)))
    .map(id => ads.find(a => a.id === id)!)
    .filter(Boolean)
    .sort((a, b) => daysSince(b.stage_updated_at || b.created_at) - daysSince(a.stage_updated_at || a.created_at));

  const activeAds = ads.filter(a => !["Completed", "Killed"].includes(a.status));

  const teamWorkload = useMemo(() => {
    if (!allProfiles) return [];
    return allProfiles
      .filter(p => p.role !== "Founder" && p.is_active)
      .map(p => {
        const assigned = activeAds.filter(ad =>
          ad.assigned_editor === p.full_name ||
          ad.assigned_copywriter === p.full_name ||
          (p.role === "VA" && ad.status === "Pending Upload") ||
          (p.role === "Strategist" && ["Ad Revision", "Testing"].includes(ad.status))
        );
        return { ...p, ads: assigned };
      })
      .sort((a, b) => b.ads.length - a.ads.length);
  }, [allProfiles, activeAds]);

  const activeSessionAdIds = new Set(
    Object.entries(adSessions)
      .filter(([, s]) => s.is_active)
      .map(([adId]) => adId)
  );

  const activePeople = new Set(
    Array.from(activeSessionAdIds).map(adId => {
      const session = adSessions[adId];
      return session?.user_name || "";
    }).filter(Boolean)
  );

  return (
    <div className="flex-1 p-6 md:p-10 overflow-y-auto max-w-[1200px] mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-white mb-1">Command Centre</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">Full team overview</p>
      </div>

      {/* Quick shortcuts */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: "Output Report", icon: "📊", view: "Reports" as DashboardViewMode },
          { label: "Ideas Library", icon: "💡", view: "Ideas" as DashboardViewMode },
          { label: "Learnings Log", icon: "🧠", view: "Learnings" as DashboardViewMode },
        ].map(s => (
          <button
            key={s.view}
            onClick={() => onNavigate?.(s.view)}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center hover:border-indigo-500/30 hover:bg-white/8 transition-all"
          >
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Active sessions */}
      {activeSessionAdIds.size > 0 && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-[24px] p-5 mb-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-3">
            ⏱️ Live Work Sessions ({activeSessionAdIds.size})
          </p>
          <div className="space-y-2">
            {Array.from(activeSessionAdIds).map(adId => {
              const ad = ads.find(a => a.id === adId);
              const session = adSessions[adId];
              if (!ad || !session) return null;
              const elapsedSeconds = Math.floor(
                (new Date().getTime() - new Date(session.started_at).getTime()) / 1000
              );
              return (
                <div
                  key={adId}
                  onClick={() => onSelectAd(ad)}
                  className="bg-white/5 rounded-2xl px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-all"
                >
                  <div>
                    <p className="font-black text-slate-100 text-sm">{ad.concept_name}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">
                      {session.user_name} · {session.user_role} · {ad.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-indigo-500 text-white px-3 py-1.5 rounded-xl">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span className="font-black text-sm font-mono tracking-widest">
                      {formatTimer ? formatTimer(elapsedSeconds) : fmtDuration(elapsedSeconds)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Overdue / Stale */}
      {allOverdue.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-[24px] p-6 mb-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-4">
            ⚠️ Needs Attention ({allOverdue.length}) — Overdue or stuck 5+ days
          </p>
          <div className="space-y-3">
            {allOverdue.slice(0, 5).map(ad => {
              const dueDateOverdueFlag = isOverdue(ad.due_date) && !["Completed", "Killed"].includes(ad.status);
              const stuckFlag = daysSince(ad.stage_updated_at || ad.created_at) >= 5;
              return (
                <div
                  key={ad.id}
                  onClick={() => onSelectAd(ad)}
                  className="bg-white/5 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-all"
                >
                  <div>
                    <p className="font-black text-slate-100 text-sm">{ad.concept_name}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{ad.status}</p>
                  </div>
                  <div className="flex gap-2">
                    {dueDateOverdueFlag && (
                      <span className="text-[10px] font-black bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-xl">
                        📅 Due {formatDueDate(ad.due_date)}
                      </span>
                    )}
                    {stuckFlag && (
                      <span className="text-[10px] font-black bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-xl">
                        {daysSince(ad.stage_updated_at || ad.created_at)}d stuck
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Team Workload */}
      <div className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Team Workload</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teamWorkload.map(person => {
            const isPersonActive = activePeople.has(person.full_name);
            return (
              <div key={person.id} className={`border rounded-[20px] p-5 transition-all ${
                isPersonActive ? "bg-indigo-500/10 border-indigo-500/30" : "bg-white/5 border-white/10"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center font-black text-indigo-400 text-xs">
                        {person.full_name?.charAt(0)?.toUpperCase()}
                      </div>
                      {isPersonActive && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#131314]" />
                      )}
                    </div>
                    <div>
                      <p className="font-black text-slate-100 text-sm">{person.full_name}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase">{person.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isPersonActive && (
                      <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        🟢 Working
                      </span>
                    )}
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                      person.ads.length === 0 ? "bg-white/10 text-slate-500" :
                      person.ads.length >= 4 ? "bg-rose-500/20 text-rose-400" :
                      "bg-emerald-500/20 text-emerald-400"
                    }`}>
                      {person.ads.length} active
                    </span>
                  </div>
                </div>
                {person.ads.length > 0 && (
                  <div className="space-y-1.5">
                    {person.ads.slice(0, 3).map((ad: Ad) => {
                      const session = adSessions[ad.id];
                      const isAdActive = session?.is_active;
                      const elapsedSeconds = isAdActive
                        ? Math.floor((new Date().getTime() - new Date(session.started_at).getTime()) / 1000)
                        : null;
                      const isDoneWaiting = ad.status === "Done, Waiting for Approval";
                      return (
                        <div
                          key={ad.id}
                          onClick={() => onSelectAd(ad)}
                          className={`flex items-center justify-between text-[10px] rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                            isAdActive ? "bg-indigo-500/20 hover:bg-indigo-500/30" :
                            isDoneWaiting ? "bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20" :
                            "bg-white/5 hover:bg-white/10"
                          }`}
                        >
                          <span className="font-bold text-slate-300 truncate">{ad.concept_name}</span>
                          <div className="flex items-center gap-2 ml-2 shrink-0">
                            {isOverdue(ad.due_date) && <span className="text-rose-400">⚠️</span>}
                            {isAdActive && elapsedSeconds !== null && (
                              <span className="font-black text-indigo-300 font-mono text-[9px] bg-indigo-500/20 px-1.5 py-0.5 rounded">
                                ⏱️ {formatTimer ? formatTimer(elapsedSeconds) : fmtDuration(elapsedSeconds)}
                              </span>
                            )}
                            {session && !isAdActive && (
                              <span className="font-black text-slate-500 text-[9px]">
                                last: {fmtDuration(session.total_seconds)}
                              </span>
                            )}
                            <span className={`font-black text-[9px] ${isDoneWaiting ? "text-emerald-400" : "text-slate-500"}`}>
                              {isDoneWaiting ? "✋ " + ad.status : ad.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {person.ads.length > 3 && (
                      <p className="text-[9px] font-black text-slate-500 text-center pt-1">+{person.ads.length - 3} more</p>
                    )}
                  </div>
                )}
                {person.ads.length === 0 && (
                  <p className="text-[10px] font-bold text-slate-600 text-center py-2">No active ads</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── STRATEGIST DASHBOARD ──
function StrategistDashboard({ ads, currentUser, onSelectAd, onNewAd, onNavigate, activeSessions, formatTimer }: Props) {
  const myAds = ads.filter(ad => ad.assigned_copywriter === currentUser || ad.assigned_editor === currentUser);

  const needsBrief = myAds.filter(ad => ["Idea", "Writing Brief"].includes(ad.status))
    .sort((a, b) => (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1));

  const awaitingReview = myAds.filter(ad => ["Brief Approved", "Content Ready", "Pending Upload"].includes(ad.status))
    .sort((a, b) => (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1));

  const revisionRequested = myAds.filter(ad => ["Brief Revision Required", "Ad Revision"].includes(ad.status))
    .sort((a, b) => (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1));

  const doneWaitingApproval = ads.filter(ad => ad.status === "Done, Waiting for Approval")
    .sort((a, b) => (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1));

  const myCompleted = ads.filter(ad => ad.status === "Completed" && ad.assigned_copywriter === currentUser);
  const winners = myCompleted.filter(ad => ad.result === "Winner").length;
  const hitRate = myCompleted.length > 0 ? Math.round((winners / myCompleted.length) * 100) : 0;
  const avgRevs = myAds.length > 0
    ? (myAds.reduce((sum, ad) => sum + (ad.revision_count || 0), 0) / myAds.length).toFixed(1)
    : "0.0";

  return (
    <div className="flex-1 p-6 md:p-10 overflow-y-auto max-w-[900px] mx-auto w-full">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-black text-white mb-1">My Dashboard</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">Strategist view</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onNavigate?.("Ideas")} className="text-xs font-black text-indigo-300 bg-indigo-500/10 px-4 py-2 rounded-xl hover:bg-indigo-500/20 transition-all border border-indigo-500/20">
            + Log Idea
          </button>
          <button onClick={onNewAd} className="text-xs font-black text-white bg-indigo-500 px-4 py-2 rounded-xl hover:bg-indigo-400 transition-all shadow-sm">
            + New Ad
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: "In Progress", val: myAds.filter(a => !["Completed", "Killed"].includes(a.status)).length },
          { label: "Hit Rate", val: hitRate + "%" },
          { label: "Avg Revisions", val: avgRevs },
        ].map((s, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1">{s.label}</p>
            <p className="text-xl font-black text-white">{s.val}</p>
          </div>
        ))}
      </div>

      <Section title="Needs Brief" count={needsBrief.length} color="bg-amber-500/20 text-amber-400" empty="No briefs needed right now">
        {needsBrief.map(ad => <AdCard key={ad.id} ad={ad} onClick={() => onSelectAd(ad)} session={activeSessions?.[ad.id]} formatTimer={formatTimer} />)}
      </Section>
      <Section title="Awaiting My Review" count={awaitingReview.length} color="bg-indigo-500/20 text-indigo-400" empty="Nothing waiting for review">
        {awaitingReview.map(ad => <AdCard key={ad.id} ad={ad} onClick={() => onSelectAd(ad)} session={activeSessions?.[ad.id]} formatTimer={formatTimer} />)}
      </Section>
      <Section title="Done, Waiting for Approval" count={doneWaitingApproval.length} color="bg-emerald-500/20 text-emerald-400" empty="Nothing waiting for approval">
        {doneWaitingApproval.map(ad => (
          <AdCard key={ad.id} ad={ad} onClick={() => onSelectAd(ad)}
            session={activeSessions?.[ad.id]} formatTimer={formatTimer}
            extra={<p className="text-[9px] font-bold text-emerald-400">✋ Submitted — awaiting approval</p>}
          />
        ))}
      </Section>
      <Section title="Revision Requested" count={revisionRequested.length} color="bg-rose-500/20 text-rose-400" empty="No revisions requested">
        {revisionRequested.map(ad => (
          <AdCard key={ad.id} ad={ad} onClick={() => onSelectAd(ad)}
            session={activeSessions?.[ad.id]} formatTimer={formatTimer}
            extra={ad.status === "Ad Revision" ? <p className="text-[9px] font-black text-rose-400">Round {ad.revision_count || 1}/2</p> : undefined}
          />
        ))}
      </Section>
    </div>
  );
}

// ── EDITOR DASHBOARD ──
function EditorDashboard({ ads, currentUser, onSelectAd, activeSessions, formatTimer }: Props) {
  const myAds = ads.filter(ad => ad.assigned_editor === currentUser);

  const waitingForMe = myAds.filter(ad => ad.status === "Editor Assigned")
    .sort((a, b) => (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1));
  const currentlyEditing = myAds.filter(ad => ad.status === "In Progress")
    .sort((a, b) => (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1));
  const doneWaiting = myAds.filter(ad => ad.status === "Done, Waiting for Approval")
    .sort((a, b) => (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1));
  const revisionRequired = myAds.filter(ad => ["Content Revision Required", "Ad Revision"].includes(ad.status))
    .sort((a, b) => (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1));

  const thisMonth = new Date();
  thisMonth.setDate(1);
  const completedThisMonth = myAds.filter(ad =>
    ad.status === "Completed" && new Date(ad.stage_updated_at) >= thisMonth
  ).length;
  const avgRevs = myAds.length > 0
    ? (myAds.reduce((sum, ad) => sum + (ad.revision_count || 0), 0) / myAds.length).toFixed(1)
    : "0.0";
  const overdueCount = myAds.filter(ad =>
    isOverdue(ad.due_date) && !["Completed", "Killed"].includes(ad.status)
  ).length;
  const activeSessionCount = Object.keys(activeSessions || {}).filter(adId =>
    myAds.some(ad => ad.id === adId)
  ).length;

  return (
    <div className="flex-1 p-6 md:p-10 overflow-y-auto max-w-[900px] mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-3xl font-black text-white mb-1">My Dashboard</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">Editor view</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1">Completed This Month</p>
          <p className="text-xl font-black text-white">{completedThisMonth}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1">Avg Revision Rounds</p>
          <p className="text-xl font-black text-white">{avgRevs}</p>
        </div>
        <div className={`border rounded-2xl p-4 text-center ${overdueCount > 0 ? "bg-rose-500/10 border-rose-500/20" : "bg-white/5 border-white/10"}`}>
          <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${overdueCount > 0 ? "text-rose-400" : "text-slate-500"}`}>Overdue</p>
          <p className={`text-xl font-black ${overdueCount > 0 ? "text-rose-400" : "text-slate-600"}`}>{overdueCount}</p>
        </div>
        <div className={`border rounded-2xl p-4 text-center ${activeSessionCount > 0 ? "bg-indigo-500/10 border-indigo-500/20" : "bg-white/5 border-white/10"}`}>
          <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${activeSessionCount > 0 ? "text-indigo-400" : "text-slate-500"}`}>Active Sessions</p>
          <p className={`text-xl font-black ${activeSessionCount > 0 ? "text-indigo-400" : "text-slate-600"}`}>{activeSessionCount}</p>
        </div>
      </div>

      <Section title="Waiting For Me" count={waitingForMe.length} color="bg-amber-500/20 text-amber-400" empty="Nothing waiting">
        {waitingForMe.map(ad => <AdCard key={ad.id} ad={ad} onClick={() => onSelectAd(ad)} session={activeSessions?.[ad.id]} formatTimer={formatTimer} />)}
      </Section>
      <Section title="Currently Editing" count={currentlyEditing.length} color="bg-indigo-500/20 text-indigo-400" empty="Nothing in progress">
        {currentlyEditing.map(ad => (
          <AdCard key={ad.id} ad={ad} onClick={() => onSelectAd(ad)}
            session={activeSessions?.[ad.id]} formatTimer={formatTimer}
            extra={<p className="text-[9px] font-bold text-slate-500">{daysSince(ad.stage_updated_at || ad.created_at)} days in this stage</p>}
          />
        ))}
      </Section>
      <Section title="Done, Waiting for Approval" count={doneWaiting.length} color="bg-emerald-500/20 text-emerald-400" empty="Nothing submitted for review">
        {doneWaiting.map(ad => (
          <AdCard key={ad.id} ad={ad} onClick={() => onSelectAd(ad)}
            session={activeSessions?.[ad.id]} formatTimer={formatTimer}
            extra={<p className="text-[9px] font-bold text-emerald-400">✋ Submitted — awaiting approval</p>}
          />
        ))}
      </Section>
      <Section title="Revision Required" count={revisionRequired.length} color="bg-rose-500/20 text-rose-400" empty="No revisions needed">
        {revisionRequired.map(ad => (
          <AdCard key={ad.id} ad={ad} onClick={() => onSelectAd(ad)}
            session={activeSessions?.[ad.id]} formatTimer={formatTimer}
            extra={<p className="text-[9px] font-black text-rose-400">Round {ad.revision_count || 1}/2</p>}
          />
        ))}
      </Section>
    </div>
  );
}

// ── VA DASHBOARD ──
function VADashboard({ ads, onSelectAd, activeSessions, formatTimer }: Props) {
  const pendingAds = ads
    .filter(ad => ad.status === "Pending Upload")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="flex-1 p-6 md:p-10 overflow-y-auto max-w-[900px] mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-white mb-1">Upload Queue</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">
          {pendingAds.length} ads pending upload — oldest first
        </p>
      </div>

      {pendingAds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-600">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-lg font-bold">All caught up!</p>
          <p className="text-sm font-medium">No ads pending upload right now</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingAds.map(ad => {
            const session = activeSessions?.[ad.id];
            return (
              <div key={ad.id} className={`border rounded-[20px] p-5 hover:shadow-md transition-all ${session ? "bg-indigo-500/10 border-indigo-500/30" : "bg-white/5 border-white/10 hover:border-indigo-500/20"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-black text-slate-100 mb-1">{ad.concept_name}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-white/10 text-slate-400 rounded-md">{ad.ad_format}</span>
                      {ad.assigned_editor && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-md">Editor: {ad.assigned_editor}</span>
                      )}
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-md">{daysSince(ad.created_at)}d old</span>
                    </div>
                    {ad.review_link && (
                      <a href={ad.review_link} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-colors" onClick={e => e.stopPropagation()}>
                        View Review File ↗
                      </a>
                    )}
                    {session && formatTimer && (
                      <div className="mt-2 inline-flex items-center gap-2 bg-indigo-500 text-white px-3 py-1.5 rounded-xl">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Session Active</span>
                        <span className="font-black text-sm font-mono">{formatTimer(session.elapsedSeconds)}</span>
                      </div>
                    )}
                  </div>
                  <button onClick={() => onSelectAd(ad)} className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-sm shrink-0">
                    Mark Uploaded
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── CONTENT COORDINATOR DASHBOARD ──
function ContentCoordDashboard({ ads, onSelectAd, activeSessions, formatTimer }: Props) {
  const myAds = ads
    .filter(ad => ["Preparing Content", "Content Revision Required"].includes(ad.status))
    .sort((a, b) => (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1));

  return (
    <div className="flex-1 p-6 md:p-10 overflow-y-auto max-w-[900px] mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-white mb-1">My Queue</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">Content Coordinator view</p>
      </div>

      {myAds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-600">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-lg font-bold text-slate-400">All clear!</p>
          <p className="text-sm text-slate-500">No content stages need attention right now</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myAds.map(ad => (
            <AdCard key={ad.id} ad={ad} onClick={() => onSelectAd(ad)}
              session={activeSessions?.[ad.id]} formatTimer={formatTimer}
              extra={ad.status === "Content Revision Required" ? <p className="text-[9px] font-black text-rose-400 mt-1">Revision needed</p> : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── MAIN EXPORT ──
export default function DashboardView(props: Props) {
  const { currentRole } = props;
  if (currentRole === "Founder") return <FounderDashboard {...props} />;
  if (currentRole === "Strategist") return <StrategistDashboard {...props} />;
  if (currentRole === "Editor" || currentRole === "Graphic Designer") return <EditorDashboard {...props} />;
  if (currentRole === "VA") return <VADashboard {...props} />;
  if (currentRole === "Content Coordinator") return <ContentCoordDashboard {...props} />;
  return null;
}