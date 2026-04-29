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
  rankedHitRate?: { name: string; tested: number; winners: number; rate: number }[];
}

const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

function daysSince(date: string) {
  return Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 3600 * 24));
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

// ── SHARED HIT RATE CALCULATOR ──
function calcHitRate(ads: Ad[], filterFn: (ad: Ad) => boolean): { tested: number; winners: number; rate: number } {
  const myAds = ads.filter(filterFn);
  const tested = myAds.filter(ad => {
    if (["Testing", "Winner", "Killed"].includes(ad.status)) return true;
    try {
      const logs = JSON.parse(ad.time_log || "[]");
      return logs.some((l: any) => l.action?.toLowerCase().includes("testing"));
    } catch { return false; }
  });
  const winners = tested.filter(ad => ad.status === "Winner" || ad.result === "Winner");
  return {
    tested: tested.length,
    winners: winners.length,
    rate: tested.length > 0 ? Math.round((winners.length / tested.length) * 100) : 0
  };
}

function StatCard({ label, value, sub, color, icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{label}</p>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <p className={`text-3xl font-black ${color || "text-gray-900"}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 font-medium mt-1">{sub}</p>}
    </div>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${
      priority === "High" ? "bg-red-500" :
      priority === "Medium" ? "bg-amber-400" :
      "bg-gray-300"
    }`} />
  );
}

function AdCard({ ad, onClick, session, formatTimer }: {
  ad: Ad; onClick: () => void;
  session?: { elapsedSeconds: number } | null;
  formatTimer?: (seconds: number) => string;
}) {
  const days = daysSince(ad.stage_updated_at || ad.created_at);
  const isStale = days >= 5;
  const overdue = isOverdue(ad.due_date) && !["Winner", "Killed"].includes(ad.status);
  const isActive = !!session;

  return (
    <div
      onClick={onClick}
      className={`border rounded-xl p-3.5 cursor-pointer hover:shadow-md transition-all ${
        isActive ? "border-green-200 bg-green-50" :
        overdue ? "border-red-200 bg-red-50" :
        "border-gray-100 bg-white hover:border-green-200"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <PriorityDot priority={ad.priority} />
        <div className="flex-1 min-w-0">
          <p className="font-black text-gray-800 text-sm truncate leading-tight">{ad.concept_name}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md">{ad.ad_format}</span>
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
              ad.status === "Done, Waiting for Approval" ? "bg-green-100 text-green-700" :
              ad.status === "Ad Revision" ? "bg-red-100 text-red-600" :
              "bg-gray-100 text-gray-500"
            }`}>{ad.status}</span>
            {overdue && <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-red-100 text-red-600 rounded-md animate-pulse">Overdue</span>}
            {isStale && !overdue && <span className="text-[9px] font-black text-amber-600">{days}d</span>}
          </div>
          {isActive && formatTimer && session && (
            <div className="mt-2 inline-flex items-center gap-1.5 bg-green-600 text-white px-2 py-1 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[9px] font-black">{formatTimer(session.elapsedSeconds)}</span>
            </div>
          )}
        </div>
        <span className={`text-[9px] font-black px-2 py-1 rounded-lg shrink-0 ${isStale ? "bg-red-100 text-red-500" : "bg-gray-100 text-gray-400"}`}>
          {days}d
        </span>
      </div>
    </div>
  );
}

function SectionHeader({ title, count, color }: { title: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        <h3 className="font-black text-gray-700 text-sm">{title}</h3>
      </div>
      <span className="text-xs font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>
    </div>
  );
}

// ── TEAM MEMBER MODAL ──
function TeamMemberModal({ person, ads, onSelectAd, onClose, activeSessions, formatTimer }: {
  person: any;
  ads: Ad[];
  onSelectAd: (ad: Ad) => void;
  onClose: () => void;
  activeSessions?: Record<string, { sessionId: string; elapsedSeconds: number; startedAt: string }>;
  formatTimer?: (seconds: number) => string;
}) {
  const groupedAds = useMemo(() => {
    const groups: Record<string, Ad[]> = {};
    ads.forEach(ad => {
      if (!groups[ad.status]) groups[ad.status] = [];
      groups[ad.status].push(ad);
    });
    return groups;
  }, [ads]);

  const statusColors: Record<string, string> = {
    "Editor Assigned": "bg-amber-100 text-amber-700",
    "In Progress": "bg-indigo-100 text-indigo-700",
    "Done, Waiting for Approval": "bg-green-100 text-green-700",
    "Ad Revision": "bg-red-100 text-red-600",
    "Brief Revision Required": "bg-orange-100 text-orange-700",
    "Testing": "bg-blue-100 text-blue-700",
    "Pending Upload": "bg-purple-100 text-purple-700",
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center font-black text-green-700 text-sm">
              {person.full_name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <p className="font-black text-gray-900">{person.full_name}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{person.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-black px-3 py-1.5 rounded-full ${
              ads.length === 0 ? "bg-gray-100 text-gray-400" :
              ads.length >= 4 ? "bg-red-100 text-red-600" :
              "bg-green-100 text-green-700"
            }`}>
              {ads.length} active ads
            </span>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all font-black">✕</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {ads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <span className="text-5xl mb-3">😴</span>
              <p className="font-black text-gray-600 text-lg">No active ads</p>
              <p className="text-sm mt-1">This team member is currently idle</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedAds).map(([status, statusAds]) => (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${statusColors[status] || "bg-gray-100 text-gray-500"}`}>
                      {status}
                    </span>
                    <span className="text-[10px] font-black text-gray-400">{statusAds.length}</span>
                  </div>
                  <div className="space-y-2">
                    {statusAds
                      .sort((a, b) => (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1))
                      .map(ad => {
                        const days = daysSince(ad.stage_updated_at || ad.created_at);
                        const isStale = days >= 5;
                        const overdue = isOverdue(ad.due_date);
                        const session = activeSessions?.[ad.id];
                        return (
                          <div
                            key={ad.id}
                            onClick={() => { onSelectAd(ad); onClose(); }}
                            className={`border rounded-xl p-4 cursor-pointer hover:shadow-md transition-all ${
                              session ? "border-green-200 bg-green-50" :
                              overdue ? "border-red-200 bg-red-50" :
                              "border-gray-100 bg-white hover:border-green-200"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                <PriorityDot priority={ad.priority} />
                                <div className="flex-1 min-w-0">
                                  <p className="font-black text-gray-800 text-sm leading-tight">{ad.concept_name}</p>
                                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md">{ad.ad_format}</span>
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md">{ad.ad_type}</span>
                                    {ad.product && <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-green-50 text-green-700 rounded-md">{ad.product}</span>}
                                    {overdue && <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-red-100 text-red-600 rounded-md animate-pulse">Overdue</span>}
                                  </div>
                                  {session && formatTimer && (
                                    <div className="mt-2 inline-flex items-center gap-1.5 bg-green-600 text-white px-2 py-1 rounded-lg">
                                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                      <span className="text-[9px] font-black">{formatTimer(session.elapsedSeconds)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${isStale ? "bg-red-100 text-red-500" : "bg-gray-100 text-gray-400"}`}>
                                  {days}d
                                </span>
                                {ad.imprint_number && (
                                  <span className="text-[9px] font-black font-mono text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                    DTC #{String(ad.imprint_number).padStart(4, "0")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <p className="text-[10px] font-bold text-gray-400 text-center">Click any ad to open it</p>
        </div>
      </div>
    </div>
  );
}

// ── FOUNDER DASHBOARD ──
function FounderDashboard({ ads, onSelectAd, onNavigate, allProfiles, activeSessions, formatTimer, supabase, rankedHitRate }: Props) {
  const [adSessions, setAdSessions] = useState<Record<string, any>>({});
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const activeAds = ads.filter(a => !["Winner", "Killed"].includes(a.status));
    if (activeAds.length === 0) return;
    const fetchSessions = async () => {
      const { data } = await supabase.from("ad_sessions").select("*").in("ad_id", activeAds.map(a => a.id)).order("started_at", { ascending: false });
      if (!data) return;
      const latestByAd: Record<string, any> = {};
      data.forEach((s: any) => { if (!latestByAd[s.ad_id]) latestByAd[s.ad_id] = s; });
      setAdSessions(latestByAd);
    };
    fetchSessions();
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, [supabase, ads]);

  const activeAds = ads.filter(a => !["Winner", "Killed"].includes(a.status));
  const totalAds = activeAds.length;
  const inTesting = ads.filter(a => a.status === "Testing").length;
  const doneWaiting = ads.filter(a => a.status === "Done, Waiting for Approval").length;
  const { rate: hitRate } = calcHitRate(ads, () => true);

  const overdueAds = activeAds.filter(ad =>
    (daysSince(ad.stage_updated_at || ad.created_at) >= 5 && !["Testing"].includes(ad.status)) ||
    (isOverdue(ad.due_date))
  ).sort((a, b) => daysSince(b.stage_updated_at || b.created_at) - daysSince(a.stage_updated_at || a.created_at));

  const activeSessionAdIds = new Set(
    Object.entries(adSessions).filter(([, s]) => s.is_active).map(([adId]) => adId)
  );

  const teamWorkload = useMemo(() => {
    if (!allProfiles) return [];
    return allProfiles
      .filter(p => p.role !== "Founder" && p.is_active)
      .map(p => {
        const assigned = activeAds.filter(ad =>
          ad.assigned_editor === p.full_name || ad.assigned_copywriter === p.full_name ||
          (p.role === "VA" && ad.status === "Pending Upload") ||
          (p.role === "Strategist" && ["Ad Revision", "Testing"].includes(ad.status))
        );
        return { ...p, ads: assigned };
      })
      .sort((a, b) => b.ads.length - a.ads.length);
  }, [allProfiles, activeAds]);

  const pipelineProgress = useMemo(() => {
    const stages = ["Idea", "Writing Brief", "Brief Approved", "Editor Assigned", "In Progress", "Done, Waiting for Approval", "Pending Upload", "Testing"];
    return stages.map(stage => ({
      stage,
      count: ads.filter(a => a.status === stage).length
    })).filter(s => s.count > 0);
  }, [ads]);

  const totalPipelineAds = pipelineProgress.reduce((sum, s) => sum + s.count, 0) || 1;

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto">
      {selectedPerson && (
        <TeamMemberModal
          person={selectedPerson}
          ads={selectedPerson.ads}
          onSelectAd={onSelectAd}
          onClose={() => setSelectedPerson(null)}
          activeSessions={activeSessions}
          formatTimer={formatTimer}
        />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Active" value={totalAds} sub="ads in pipeline" icon="📋" />
        <StatCard label="Done, Waiting" value={doneWaiting} sub="awaiting approval" color="text-green-700" icon="✋" />
        <StatCard label="In Testing" value={inTesting} sub="ads live" color="text-blue-600" icon="🧪" />
        <StatCard label="Hit Rate" value={`${hitRate}%`} sub="winners / total tested" color={hitRate >= 30 ? "text-green-700" : "text-red-500"} icon="🎯" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-gray-800">Pipeline Progress</h3>
            <span className="text-xs font-black text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{totalPipelineAds} ads</span>
          </div>
          <div className="space-y-3">
            {pipelineProgress.map(({ stage, count }) => {
              const pct = Math.round((count / totalPipelineAds) * 100);
              return (
                <div key={stage}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-gray-500 truncate">{stage}</span>
                    <span className="text-[11px] font-black text-gray-700 ml-2">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      stage === "Done, Waiting for Approval" ? "bg-green-500" :
                      stage === "Testing" ? "bg-blue-500" :
                      stage === "In Progress" ? "bg-indigo-400" : "bg-gray-300"
                    }`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {pipelineProgress.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No active ads</p>}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-gray-800">Live Sessions</h3>
            {activeSessionAdIds.size > 0 && (
              <span className="text-xs font-black text-green-700 bg-green-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                {activeSessionAdIds.size} active
              </span>
            )}
          </div>
          {activeSessionAdIds.size === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <span className="text-3xl mb-2">⏱️</span>
              <p className="text-sm font-bold">No active sessions</p>
              <p className="text-xs mt-1">Sessions appear when team opens ads</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from(activeSessionAdIds).map(adId => {
                const ad = ads.find(a => a.id === adId);
                const session = adSessions[adId];
                if (!ad || !session) return null;
                const elapsed = Math.floor((new Date().getTime() - new Date(session.started_at).getTime()) / 1000);
                return (
                  <div key={adId} onClick={() => onSelectAd(ad)} className="flex items-center justify-between p-3 bg-green-50 rounded-xl cursor-pointer hover:bg-green-100 transition-all border border-green-100">
                    <div>
                      <p className="font-black text-gray-800 text-sm truncate max-w-[140px]">{ad.concept_name}</p>
                      <p className="text-[10px] text-gray-500 font-bold">{session.user_name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-green-600 text-white px-2.5 py-1.5 rounded-lg">
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span className="font-black text-xs font-mono">{formatTimer ? formatTimer(elapsed) : fmtDuration(elapsed)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-gray-800">Needs Attention</h3>
            {overdueAds.length > 0 && (
              <span className="text-xs font-black text-red-600 bg-red-100 px-2.5 py-1 rounded-full">{overdueAds.length}</span>
            )}
          </div>
          {overdueAds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <span className="text-3xl mb-2">✅</span>
              <p className="text-sm font-bold">All clear!</p>
              <p className="text-xs mt-1">No overdue or stuck ads</p>
            </div>
          ) : (
            <div className="space-y-2">
              {overdueAds.slice(0, 5).map(ad => (
                <div key={ad.id} onClick={() => onSelectAd(ad)} className="flex items-center justify-between p-3 bg-red-50 rounded-xl cursor-pointer hover:bg-red-100 transition-all border border-red-100">
                  <div>
                    <p className="font-black text-gray-800 text-sm truncate max-w-[140px]">{ad.concept_name}</p>
                    <p className="text-[10px] text-gray-500 font-bold">{ad.status}</p>
                  </div>
                  <span className="text-[10px] font-black text-red-500 bg-red-100 px-2 py-1 rounded-lg">
                    {daysSince(ad.stage_updated_at || ad.created_at)}d stuck
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-gray-800">Team Workload</h3>
          <button onClick={() => onNavigate?.("Manager")} className="text-xs font-black text-green-700 hover:text-green-800 transition-colors">View All →</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamWorkload.slice(0, 6).map(person => {
            const isActive = Object.values(adSessions).some((s: any) => s.is_active && s.user_name === person.full_name);
            return (
              <div key={person.id} onClick={() => setSelectedPerson(person)}
                className={`border rounded-xl p-4 transition-all cursor-pointer ${
                  isActive ? "border-green-200 bg-green-50 hover:border-green-300 hover:shadow-md" : "border-gray-100 hover:border-green-200 hover:shadow-md"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center font-black text-green-700 text-xs">
                        {person.full_name?.charAt(0)?.toUpperCase()}
                      </div>
                      {isActive && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />}
                    </div>
                    <div>
                      <p className="font-black text-gray-800 text-sm leading-none">{person.full_name}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">{person.role}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                    person.ads.length === 0 ? "bg-gray-100 text-gray-400" :
                    person.ads.length >= 4 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"
                  }`}>{person.ads.length} ads</span>
                </div>
                {person.ads.length > 0 && (
                  <div className="space-y-1">
                    {person.ads.slice(0, 2).map((ad: Ad) => (
                      <div key={ad.id} className="text-[10px] font-bold text-gray-500 truncate px-2 py-1 rounded-lg">· {ad.concept_name}</div>
                    ))}
                    {person.ads.length > 2 && <p className="text-[9px] font-black text-green-700 px-2">+{person.ads.length - 2} more — click to see all</p>}
                  </div>
                )}
                {person.ads.length === 0 && <p className="text-[10px] text-gray-400 font-bold text-center py-1">Idle — click to view</p>}
              </div>
            );
          })}
        </div>
      </div>

      {rankedHitRate && rankedHitRate.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-black text-gray-800">Hit Rate Per Person</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Winners / Total Tested</p>
            </div>
            <span className="text-2xl">🎯</span>
          </div>
          <div className="space-y-4">
            {rankedHitRate.map((person, i) => (
              <div key={person.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[10px] font-black w-5 ${i === 0 ? "text-amber-500" : "text-gray-400"}`}>#{i + 1}</span>
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center font-black text-green-700 text-[10px]">
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-black text-gray-700">{person.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-gray-400">{person.winners}W / {person.tested} tested</span>
                    <span className={`text-sm font-black ${person.rate >= 30 ? "text-green-700" : person.rate >= 15 ? "text-amber-600" : "text-red-500"}`}>
                      {person.rate}%
                    </span>
                  </div>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${person.rate >= 30 ? "bg-green-500" : person.rate >= 15 ? "bg-amber-400" : "bg-red-400"}`}
                    style={{ width: `${Math.min(person.rate, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Output Report", icon: "📊", view: "Reports" as DashboardViewMode, sub: "Charts & analytics" },
          { label: "Ideas Library", icon: "💡", view: "Ideas" as DashboardViewMode, sub: "Log & promote ideas" },
          { label: "Learnings Log", icon: "🧠", view: "Learnings" as DashboardViewMode, sub: "What worked & why" },
        ].map(s => (
          <button key={s.view} onClick={() => onNavigate?.(s.view)}
            className="bg-white border border-gray-100 rounded-2xl p-5 text-left hover:border-green-200 hover:shadow-md transition-all group"
          >
            <div className="text-2xl mb-2">{s.icon}</div>
            <p className="font-black text-gray-800 text-sm group-hover:text-green-700 transition-colors">{s.label}</p>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">{s.sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── STRATEGIST DASHBOARD ──
function StrategistDashboard({ ads, currentUser, onSelectAd, onNewAd, onNavigate, activeSessions, formatTimer }: Props) {
  const myAds = ads.filter(ad => ad.assigned_copywriter === currentUser || ad.assigned_editor === currentUser);
  const needsBrief = myAds.filter(ad => ["Idea", "Writing Brief"].includes(ad.status)).sort((a, b) => (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1));
  const awaitingReview = myAds.filter(ad => ["Brief Approved", "Pending Upload"].includes(ad.status)).sort((a, b) => (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1));
  const revisionRequested = myAds.filter(ad => ["Brief Revision Required", "Ad Revision"].includes(ad.status)).sort((a, b) => (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1));
  const doneWaiting = ads.filter(ad => ad.status === "Done, Waiting for Approval").sort((a, b) => (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1));

  const { tested, winners, rate: hitRate } = calcHitRate(ads, ad => ad.assigned_copywriter === currentUser);

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900">My Dashboard</h2>
          <p className="text-gray-400 text-sm font-medium mt-0.5">Strategist view</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onNavigate?.("Ideas")} className="text-xs font-black text-green-700 bg-green-50 px-4 py-2 rounded-xl hover:bg-green-100 transition-all border border-green-200">+ Log Idea</button>
          <button onClick={onNewAd} className="text-xs font-black text-white bg-green-700 px-4 py-2 rounded-xl hover:bg-green-800 transition-all shadow-sm">+ New Ad</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="In Progress" value={myAds.filter(a => !["Winner", "Killed"].includes(a.status)).length} sub="active ads" icon="🎯" />
        <StatCard
          label="Hit Rate"
          value={`${hitRate}%`}
          sub={tested > 0 ? `${winners}W / ${tested} tested` : "no ads tested yet"}
          color={hitRate >= 30 ? "text-green-700" : hitRate >= 15 ? "text-amber-600" : "text-red-500"}
          icon="🏆"
        />
        <StatCard label="Pending Review" value={doneWaiting.length} sub="awaiting approval" color="text-amber-600" icon="✋" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <SectionHeader title="Needs Brief" count={needsBrief.length} color="bg-amber-400" />
          {needsBrief.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">No briefs needed</p> : (
            <div className="space-y-2">{needsBrief.map(ad => <AdCard key={ad.id} ad={ad} onClick={() => onSelectAd(ad)} session={activeSessions?.[ad.id]} formatTimer={formatTimer} />)}</div>
          )}
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <SectionHeader title="Done, Waiting for Approval" count={doneWaiting.length} color="bg-green-500" />
          {doneWaiting.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">Nothing waiting</p> : (
            <div className="space-y-2">{doneWaiting.map(ad => <AdCard key={ad.id} ad={ad} onClick={() => onSelectAd(ad)} session={activeSessions?.[ad.id]} formatTimer={formatTimer} />)}</div>
          )}
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <SectionHeader title="Revision Requested" count={revisionRequested.length} color="bg-red-400" />
          {revisionRequested.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">No revisions</p> : (
            <div className="space-y-2">{revisionRequested.map(ad => <AdCard key={ad.id} ad={ad} onClick={() => onSelectAd(ad)} session={activeSessions?.[ad.id]} formatTimer={formatTimer} />)}</div>
          )}
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <SectionHeader title="Awaiting Review" count={awaitingReview.length} color="bg-indigo-400" />
          {awaitingReview.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">Nothing to review</p> : (
            <div className="space-y-2">{awaitingReview.map(ad => <AdCard key={ad.id} ad={ad} onClick={() => onSelectAd(ad)} session={activeSessions?.[ad.id]} formatTimer={formatTimer} />)}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── EDITOR DASHBOARD ──
function EditorDashboard({ ads, currentUser, onSelectAd, activeSessions, formatTimer }: Props) {
  const myAds = ads.filter(ad => ad.assigned_editor === currentUser);
  const waitingForMe = myAds.filter(ad => ad.status === "Editor Assigned").sort((a, b) => (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1));
  const currentlyEditing = myAds.filter(ad => ad.status === "In Progress").sort((a, b) => (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1));
  const doneWaiting = myAds.filter(ad => ad.status === "Done, Waiting for Approval");
  const revisionRequired = myAds.filter(ad => ["Ad Revision", "Content Revision Required"].includes(ad.status));
  const thisMonth = new Date(); thisMonth.setDate(1);
  const winnerThisMonth = myAds.filter(ad => ad.status === "Winner" && new Date(ad.stage_updated_at) >= thisMonth).length;
  const overdueCount = myAds.filter(ad => isOverdue(ad.due_date) && !["Winner", "Killed"].includes(ad.status)).length;

  const { tested, winners, rate: hitRate } = calcHitRate(ads, ad => ad.assigned_editor === currentUser);

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-900">My Dashboard</h2>
        <p className="text-gray-400 text-sm font-medium mt-0.5">Editor view</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Winners This Month" value={winnerThisMonth} icon="🏆" color="text-green-700" />
        <StatCard
          label="Hit Rate"
          value={`${hitRate}%`}
          sub={tested > 0 ? `${winners}W / ${tested} tested` : "no ads tested yet"}
          color={hitRate >= 30 ? "text-green-700" : hitRate >= 15 ? "text-amber-600" : "text-red-500"}
          icon="🎯"
        />
        <StatCard label="Overdue" value={overdueCount} icon="⚠️" color={overdueCount > 0 ? "text-red-500" : "text-gray-400"} />
        <StatCard label="Waiting For Me" value={waitingForMe.length} icon="📥" color={waitingForMe.length > 0 ? "text-amber-600" : "text-gray-400"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <SectionHeader title="Waiting For Me" count={waitingForMe.length} color="bg-amber-400" />
          {waitingForMe.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">Nothing waiting</p> : (
            <div className="space-y-2">{waitingForMe.map(ad => <AdCard key={ad.id} ad={ad} onClick={() => onSelectAd(ad)} session={activeSessions?.[ad.id]} formatTimer={formatTimer} />)}</div>
          )}
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <SectionHeader title="Currently Editing" count={currentlyEditing.length} color="bg-indigo-400" />
          {currentlyEditing.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">Nothing in progress</p> : (
            <div className="space-y-2">{currentlyEditing.map(ad => <AdCard key={ad.id} ad={ad} onClick={() => onSelectAd(ad)} session={activeSessions?.[ad.id]} formatTimer={formatTimer} />)}</div>
          )}
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <SectionHeader title="Done, Waiting for Approval" count={doneWaiting.length} color="bg-green-500" />
          {doneWaiting.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">Nothing submitted</p> : (
            <div className="space-y-2">{doneWaiting.map(ad => <AdCard key={ad.id} ad={ad} onClick={() => onSelectAd(ad)} session={activeSessions?.[ad.id]} formatTimer={formatTimer} />)}</div>
          )}
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <SectionHeader title="Revision Required" count={revisionRequired.length} color="bg-red-400" />
          {revisionRequired.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">No revisions</p> : (
            <div className="space-y-2">{revisionRequired.map(ad => <AdCard key={ad.id} ad={ad} onClick={() => onSelectAd(ad)} session={activeSessions?.[ad.id]} formatTimer={formatTimer} />)}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── VA DASHBOARD ──
function VADashboard({ ads, onSelectAd, activeSessions, formatTimer }: Props) {
  const pendingAds = ads.filter(ad => ad.status === "Pending Upload").sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[800px]">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-900">Upload Queue</h2>
        <p className="text-gray-400 text-sm font-medium mt-0.5">{pendingAds.length} ads pending — oldest first</p>
      </div>
      {pendingAds.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 border border-gray-100 flex flex-col items-center justify-center text-gray-400">
          <span className="text-5xl mb-3">✅</span>
          <p className="font-black text-gray-700 text-lg">All caught up!</p>
          <p className="text-sm mt-1">No ads pending upload</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingAds.map(ad => {
            const session = activeSessions?.[ad.id];
            return (
              <div key={ad.id} className={`bg-white border rounded-2xl p-5 flex items-center justify-between hover:shadow-md transition-all ${session ? "border-green-200" : "border-gray-100"}`}>
                <div className="flex-1">
                  <p className="font-black text-gray-800 mb-1">{ad.concept_name}</p>
                  <div className="flex gap-2">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md">{ad.ad_format}</span>
                    {ad.assigned_editor && <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-green-100 text-green-700 rounded-md">{ad.assigned_editor}</span>}
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md">{daysSince(ad.created_at)}d old</span>
                  </div>
                  {session && formatTimer && (
                    <div className="mt-2 inline-flex items-center gap-1.5 bg-green-600 text-white px-2.5 py-1 rounded-lg">
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span className="text-[9px] font-black">{formatTimer(session.elapsedSeconds)}</span>
                    </div>
                  )}
                </div>
                <button onClick={() => onSelectAd(ad)} className="bg-green-700 text-white px-4 py-2 rounded-xl font-black text-xs hover:bg-green-800 transition-all ml-4 shrink-0">
                  Mark Uploaded
                </button>
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
  const myAds = ads.filter(ad => ["Preparing Content", "Content Revision Required"].includes(ad.status)).sort((a, b) => (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1));

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[800px]">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-900">My Queue</h2>
        <p className="text-gray-400 text-sm font-medium mt-0.5">Content Coordinator view</p>
      </div>
      {myAds.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 border border-gray-100 flex flex-col items-center justify-center text-gray-400">
          <span className="text-5xl mb-3">✅</span>
          <p className="font-black text-gray-700 text-lg">All clear!</p>
          <p className="text-sm mt-1">No content stages need attention</p>
        </div>
      ) : (
        <div className="space-y-3">
          {myAds.map(ad => <AdCard key={ad.id} ad={ad} onClick={() => onSelectAd(ad)} session={activeSessions?.[ad.id]} formatTimer={formatTimer} />)}
        </div>
      )}
    </div>
  );
}

// ── MEDIA BUYER DASHBOARD ──
function MediaBuyerDashboard({ ads, onSelectAd, activeSessions, formatTimer }: Props) {
  const pendingAds = ads.filter(ad => ad.status === "Pending Upload").sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const testingAds = ads.filter(ad => ad.status === "Testing").sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const { tested, winners, rate: hitRate } = calcHitRate(ads, () => true);

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[900px]">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-900">Media Buyer Dashboard</h2>
        <p className="text-gray-400 text-sm font-medium mt-0.5">Upload ads and manage testing results</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Pending Upload</p>
          <p className="text-3xl font-black text-amber-600">{pendingAds.length}</p>
          <p className="text-[11px] text-gray-400 font-medium mt-1">ready to upload</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">In Testing</p>
          <p className="text-3xl font-black text-blue-600">{testingAds.length}</p>
          <p className="text-[11px] text-gray-400 font-medium mt-1">ads live — set results</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Overall Hit Rate</p>
          <p className={`text-3xl font-black ${hitRate >= 30 ? "text-green-700" : hitRate >= 15 ? "text-amber-600" : "text-red-500"}`}>{hitRate}%</p>
          <p className="text-[11px] text-gray-400 font-medium mt-1">{tested > 0 ? `${winners}W / ${tested} tested` : "no ads tested yet"}</p>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <h3 className="font-black text-gray-800">Pending Upload</h3>
          <span className="text-xs font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{pendingAds.length}</span>
        </div>
        {pendingAds.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center text-gray-400">
            <span className="text-4xl mb-2 block">✅</span>
            <p className="font-bold">Nothing to upload</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingAds.map(ad => {
              const session = activeSessions?.[ad.id];
              return (
                <div key={ad.id} onClick={() => onSelectAd(ad)} className={`bg-white border rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:shadow-md transition-all ${session ? "border-green-200 bg-green-50" : "border-gray-100 hover:border-amber-200"}`}>
                  <div className="flex-1">
                    <p className="font-black text-gray-800 mb-1">{ad.concept_name}</p>
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md">{ad.ad_format}</span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md">{ad.product}</span>
                      {ad.assigned_editor && <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-green-100 text-green-700 rounded-md">{ad.assigned_editor}</span>}
                    </div>
                    {session && formatTimer && (
                      <div className="mt-2 inline-flex items-center gap-1.5 bg-green-600 text-white px-2.5 py-1 rounded-lg">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span className="text-[9px] font-black">{formatTimer(session.elapsedSeconds)}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-black text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl ml-4 shrink-0">Upload →</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          <h3 className="font-black text-gray-800">In Testing — Set Results</h3>
          <span className="text-xs font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{testingAds.length}</span>
        </div>
        {testingAds.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center text-gray-400">
            <span className="text-4xl mb-2 block">🧪</span>
            <p className="font-bold">No ads in testing</p>
          </div>
        ) : (
          <div className="space-y-3">
            {testingAds.map(ad => {
              const session = activeSessions?.[ad.id];
              const days = Math.floor((new Date().getTime() - new Date(ad.stage_updated_at || ad.created_at).getTime()) / (1000 * 3600 * 24));
              return (
                <div key={ad.id} onClick={() => onSelectAd(ad)} className={`bg-white border rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:shadow-md transition-all ${session ? "border-green-200 bg-green-50" : "border-gray-100 hover:border-blue-200"}`}>
                  <div className="flex-1">
                    <p className="font-black text-gray-800 mb-1">{ad.concept_name}</p>
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md">Testing</span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md">{ad.ad_format}</span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md">{ad.product}</span>
                      <span className="text-[9px] font-black text-gray-400">{days}d in testing</span>
                    </div>
                    {ad.review_link && (
                      <a href={ad.review_link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] font-black text-green-700 hover:text-green-800 mt-1 block">View Ad ↗</a>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 ml-4 shrink-0">
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-full ${
                      ad.result === "Winner" ? "bg-green-100 text-green-700" :
                      ad.result === "Loser" ? "bg-red-100 text-red-600" :
                      "bg-gray-100 text-gray-400"
                    }`}>{ad.result || "No Result"}</span>
                    <span className="text-xs font-black text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">Set Result →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
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
  if (currentRole === "Media Buyer") return <MediaBuyerDashboard {...props} />;
  return null;
}