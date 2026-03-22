"use client";
import { useMemo } from "react";
import { Ad } from "../../types";
import { getPriorityBadge } from "../../utils/helpers";

// ─── MY QUEUE ─────────────────────────────────────────────────────────────────

interface MyQueueProps {
  currentUser: string;
  myQueue: Ad[];
  setSelectedAd: (ad: Ad) => void;
  activeSessions?: Record<string, { sessionId: string; elapsedSeconds: number; startedAt: string }>;
  formatTimer?: (seconds: number) => string;
}

export function MyQueueView({ currentUser, myQueue, setSelectedAd, activeSessions, formatTimer }: MyQueueProps) {
  return (
    <div className="flex-1 p-6 md:p-12 overflow-y-auto max-w-[900px] mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-800 mb-2">My Task Queue</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">Tasks assigned to {currentUser}</p>
      </div>

      {/* Active sessions summary */}
      {activeSessions && Object.keys(activeSessions).length > 0 && (
        <div className="bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <p className="text-[11px] font-black text-indigo-700 uppercase tracking-widest">
            {Object.keys(activeSessions).length} active session{Object.keys(activeSessions).length > 1 ? "s" : ""} running
          </p>
        </div>
      )}

      {myQueue.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[32px] p-20 flex flex-col items-center justify-center text-slate-400">
          <span className="text-5xl mb-4">🎉</span>
          <p className="text-xl font-black">Inbox Zero!</p>
          <p className="font-bold">You're all caught up.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myQueue.map(ad => {
            const daysInStage = Math.floor((new Date().getTime() - new Date(ad.stage_updated_at || ad.created_at).getTime()) / (1000 * 3600 * 24));
            const isStale = daysInStage >= 5 && ad.status !== "Testing" && ad.status !== "Completed";
            const session = activeSessions?.[ad.id];
            const isActive = !!session;

            return (
              <div
                key={ad.id}
                onClick={() => setSelectedAd(ad)}
                className={`p-6 rounded-[24px] border-2 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:shadow-md transition-all ${
                  isActive ? "border-indigo-300 bg-indigo-50/30 hover:border-indigo-400" : "hover:border-indigo-300"
                }`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-3 h-12 rounded-full shrink-0 ${getPriorityBadge(ad.priority)}`}></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase text-indigo-600 mb-1">{ad.status}</p>
                    <h3 className="text-xl font-black text-slate-800 truncate">{ad.concept_name}</h3>
                    <p className="text-slate-400 font-bold">{ad.product} • {ad.ad_format}</p>

                    {/* Active timer */}
                    {isActive && formatTimer && (
                      <div className="mt-2 inline-flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-xl">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Session Active</span>
                        <span className="font-black text-sm font-mono tracking-widest">
                          {formatTimer(session.elapsedSeconds)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Stage</p>
                    <p className={`text-sm font-black ${isStale ? "text-rose-500" : "text-slate-800"}`}>{daysInStage} Days</p>
                  </div>
                  <button className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                    isActive ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-slate-800 text-white hover:bg-slate-700"
                  }`}>
                    {isActive ? "⏱️ Open" : "Open Ad"}
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

// ─── MANAGER VIEW ─────────────────────────────────────────────────────────────

interface ManagerProps {
  workloads: Record<string, Ad[]>;
  setSelectedAd: (ad: Ad) => void;
}

export function ManagerView({ workloads, setSelectedAd }: ManagerProps) {
  return (
    <div className="flex-1 overflow-x-auto p-6 flex gap-6 items-start">
      {Object.entries(workloads).map(([person, tasks]) => (
        <div key={person} className="min-w-[300px] max-w-[300px] flex flex-col gap-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-black text-slate-800">{person}</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${tasks.length > 5 ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500"}`}>{tasks.length} Active</span>
          </div>
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-300 font-bold">Idle</div>
            ) : tasks.map(ad => (
              <div key={ad.id} onClick={() => setSelectedAd(ad)} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm cursor-pointer hover:border-indigo-400 transition-all">
                <p className="text-[9px] font-black uppercase text-indigo-500 mb-1">{ad.status}</p>
                <p className="font-bold text-slate-800 leading-tight">{ad.concept_name}</p>
                <div className="mt-3 flex justify-between items-center">
                  <div className={`w-2 h-2 rounded-full ${getPriorityBadge(ad.priority)}`}></div>
                  <p className="text-[9px] font-black text-slate-300">{Math.floor((new Date().getTime() - new Date(ad.stage_updated_at || ad.created_at).getTime()) / (1000 * 3600 * 24))}d</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── REPORTS VIEW ─────────────────────────────────────────────────────────────

interface ReportsProps {
  ads: Ad[];
  weeklyChartData: { label: string; count: number }[];
  avgDaysToUpload: string;
  pipelineVelocityData: { upload: string; testing: string };
  teamOutput: [string, { strategist: number; editor: number }][];
  hitRate: number;
  inTesting: number;
  conceptsVsIterations: string;
  creativeDiversity: string;
  rankedSpend: [string, number][];
}

export function ReportsView({
  ads, weeklyChartData, avgDaysToUpload, pipelineVelocityData,
  teamOutput, hitRate, inTesting, conceptsVsIterations, creativeDiversity, rankedSpend
}: ReportsProps) {

  const maxWeeklyCount = Math.max(...weeklyChartData.map(d => d.count), 1);

  const pipelineSpeed = useMemo(() => {
    const stages = [
      "Idea", "Writing Brief", "Brief Approved",
      "Editor Assigned", "In Progress", "Ad Revision",
      "Pending Upload", "Testing"
    ];
    return stages.map(stage => {
      const stageAds = ads.filter(ad => ad.status === stage);
      const avgDays = stageAds.length > 0
        ? Math.round(stageAds.reduce((sum, ad) => {
            return sum + Math.floor((new Date().getTime() - new Date(ad.stage_updated_at || ad.created_at).getTime()) / (1000 * 3600 * 24));
          }, 0) / stageAds.length)
        : 0;
      return { stage: stage.replace(" Required", "").replace("Editor Assigned", "Assigned"), avgDays, count: stageAds.length };
    });
  }, [ads]);

  const totalAds = ads.length || 1;
  const videoCount = ads.filter(a => a.ad_format === "Video Ad").length;
  const staticCount = ads.filter(a => a.ad_format === "Static Ad").length;
  const nativeCount = ads.filter(a => a.ad_format === "Native Ad").length;
  const videoPct = Math.round((videoCount / totalAds) * 100);
  const staticPct = Math.round((staticCount / totalAds) * 100);
  const nativePct = Math.round((nativeCount / totalAds) * 100);

  const [newCount, iterCount] = conceptsVsIterations.split(" / ").map(Number);
  const totalNI = (newCount + iterCount) || 1;

  const adTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    ads.forEach(ad => {
      const type = ad.ad_type || "Unknown";
      counts[type] = (counts[type] || 0) + 1;
    });
    const total = ads.length || 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({
        type,
        count,
        pct: Math.round((count / total) * 100),
      }));
  }, [ads]);

  const adTypeColors: Record<string, string> = {
    "New Concept": "bg-indigo-500",
    "Iteration": "bg-emerald-400",
    "Ideation": "bg-amber-400",
    "Imitation": "bg-rose-400",
    "Unknown": "bg-slate-300",
  };

  const totalSpend = ads.reduce((sum, ad) => sum + Number(ad.ad_spend || 0), 0);

  return (
    <div className="flex-1 p-6 md:p-10 overflow-y-auto max-w-[1300px] mx-auto w-full">

      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-800 mb-1">Creative Output Report</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">All charts pull live from the database</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border-2 border-slate-100 rounded-[20px] p-5 shadow-sm">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Volume This Week</p>
          <p className="text-3xl font-black text-slate-800">{weeklyChartData[weeklyChartData.length - 1]?.count || 0}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-1">ads created</p>
        </div>
        <div className="bg-white border-2 border-slate-100 rounded-[20px] p-5 shadow-sm">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Hit Rate</p>
          <p className={`text-3xl font-black ${hitRate >= 50 ? "text-emerald-600" : hitRate >= 25 ? "text-amber-500" : "text-rose-500"}`}>{hitRate}%</p>
          <p className="text-[10px] font-bold text-slate-400 mt-1">winners / completed</p>
        </div>
        <div className="bg-white border-2 border-slate-100 rounded-[20px] p-5 shadow-sm">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">In Testing</p>
          <p className="text-3xl font-black text-indigo-600">{inTesting}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-1">ads live</p>
        </div>
        <div className="bg-white border-2 border-slate-100 rounded-[20px] p-5 shadow-sm">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Total Ad Spend</p>
          <p className="text-3xl font-black text-amber-600">${totalSpend.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-1">all time</p>
        </div>
      </div>

      {/* Row 1: Output chart + New vs Iterations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border-2 border-slate-100 rounded-[24px] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-black text-slate-800">Output Over Time</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weekly Produced</p>
            </div>
            <span className="text-2xl">📈</span>
          </div>
          <div className="flex items-end gap-3 h-36">
            {weeklyChartData.map((d, i) => {
              const heightPct = maxWeeklyCount > 0 ? (d.count / maxWeeklyCount) * 100 : 0;
              const isThisWeek = i === weeklyChartData.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col items-center" style={{ height: "100px" }}>
                    <div className="flex-1 w-full flex items-end relative group">
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                        <div className="bg-slate-800 text-white text-[10px] font-black px-3 py-1.5 rounded-xl whitespace-nowrap shadow-lg">
                          {d.label}: {d.count} ad{d.count !== 1 ? "s" : ""}
                        </div>
                        <div className="w-2 h-2 bg-slate-800 rotate-45 mx-auto -mt-1" />
                      </div>
                      <div
                        className={`w-full rounded-t-xl transition-all cursor-pointer ${isThisWeek ? "bg-indigo-600 hover:bg-indigo-700" : "bg-indigo-200 hover:bg-indigo-300"}`}
                        style={{ height: `${Math.max(heightPct, 5)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase text-center leading-tight">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border-2 border-slate-100 rounded-[24px] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-black text-slate-800">New vs Iterations</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">This Week</p>
            </div>
            <span className="text-2xl">🔁</span>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-indigo-50 rounded-2xl p-4 text-center border border-indigo-100">
              <p className="text-4xl font-black text-indigo-600 mb-1">{newCount}</p>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">New Concepts</p>
            </div>
            <div className="bg-emerald-50 rounded-2xl p-4 text-center border border-emerald-100">
              <p className="text-4xl font-black text-emerald-600 mb-1">{iterCount}</p>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Iterations</p>
            </div>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
            <div className="h-full bg-indigo-500 transition-all" style={{ width: `${(newCount / totalNI) * 100}%` }} />
            <div className="h-full bg-emerald-400 transition-all" style={{ width: `${(iterCount / totalNI) * 100}%` }} />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[9px] font-black text-indigo-400">New {Math.round((newCount / totalNI) * 100)}%</span>
            <span className="text-[9px] font-black text-emerald-400">Iter {Math.round((iterCount / totalNI) * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Row 2: Team Output + By Ad Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border-2 border-slate-100 rounded-[24px] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-black text-slate-800">Output by Team Member</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">This Week</p>
            </div>
            <span className="text-2xl">👷</span>
          </div>
          {teamOutput.length === 0 ? (
            <div className="text-center py-8 text-slate-300 font-bold">No output data yet</div>
          ) : (
            <div className="space-y-4">
              {teamOutput.map(([name, stats]) => {
                const total = stats.strategist + stats.editor;
                const maxTotal = Math.max(...teamOutput.map(([, s]) => s.strategist + s.editor), 1);
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-600 text-[10px]">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-black text-slate-700">{name}</span>
                      </div>
                      <span className="text-sm font-black text-slate-500">{total}</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(total / maxTotal) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white border-2 border-slate-100 rounded-[24px] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-black text-slate-800">By Ad Type</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">All Time</p>
            </div>
            <span className="text-2xl">🏷️</span>
          </div>
          {adTypeData.length === 0 ? (
            <div className="text-center py-8 text-slate-300 font-bold">No ads yet</div>
          ) : (
            <div className="space-y-5">
              {adTypeData.map(({ type, count, pct }) => (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${adTypeColors[type] || "bg-slate-300"}`} />
                      <span className="text-sm font-black text-slate-700">{type}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-400">{count} ads</span>
                      <span className="text-sm font-black text-slate-600">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${adTypeColors[type] || "bg-slate-300"} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex">
                  {adTypeData.map(({ type, pct }) => (
                    <div key={type} className={`h-full ${adTypeColors[type] || "bg-slate-300"} transition-all`} style={{ width: `${pct}%` }} title={`${type}: ${pct}%`} />
                  ))}
                </div>
                <div className="flex gap-4 mt-3 flex-wrap">
                  {adTypeData.map(({ type, pct }) => (
                    <div key={type} className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${adTypeColors[type] || "bg-slate-300"}`} />
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{type} {pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Creative Diversity */}
      <div className="bg-white border-2 border-slate-100 rounded-[24px] p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-black text-slate-800">Creative Diversity</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Format Split — All Time</p>
          </div>
          <span className="text-2xl">🎨</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Video", count: videoCount, pct: videoPct, color: "bg-indigo-500" },
            { label: "Static", count: staticCount, pct: staticPct, color: "bg-emerald-400" },
            { label: "Native", count: nativeCount, pct: nativePct, color: "bg-amber-400" },
          ].map(f => (
            <div key={f.label} className="bg-slate-50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-black text-slate-700">{f.label} Ad</span>
                <span className="text-xl font-black text-slate-800">{f.pct}%</span>
              </div>
              <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden mb-2">
                <div className={`h-full ${f.color} rounded-full transition-all`} style={{ width: `${f.pct}%` }} />
              </div>
              <p className="text-[9px] font-bold text-slate-400">{f.count} ads total</p>
            </div>
          ))}
        </div>
      </div>

      {/* Row 4: Pipeline Speed */}
      <div className="bg-white border-2 border-slate-100 rounded-[24px] p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-black text-slate-800">Pipeline Speed</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg Days Per Stage</p>
          </div>
          <span className="text-2xl">⚡</span>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {pipelineSpeed.map((s, i) => {
            const isStale = s.avgDays >= 5;
            return (
              <div key={i} className={`rounded-2xl p-4 text-center border-2 transition-all hover:shadow-md ${isStale ? "border-rose-200 bg-rose-50" : "border-slate-100 bg-slate-50"}`}>
                <p className={`text-2xl font-black mb-1 ${isStale ? "text-rose-600" : "text-slate-800"}`}>{s.avgDays}d</p>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter leading-tight">{s.stage}</p>
                <p className={`text-[8px] font-bold mt-1 ${isStale ? "text-rose-400" : "text-slate-300"}`}>{s.count} ads</p>
              </div>
            );
          })}
        </div>
        <p className="text-[9px] font-bold text-slate-400 mt-3">Stages with 5+ day average are flagged red</p>
      </div>

      {/* Row 5: Ad Spend Rankings */}
      {rankedSpend.length > 0 && (
        <div className="bg-white border-2 border-slate-100 rounded-[24px] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-black text-slate-800">Ad Spend Rankings</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">By Team Member</p>
            </div>
            <span className="text-2xl">💰</span>
          </div>
          <div className="space-y-4">
            {rankedSpend.map(([name, spend], i) => {
              const maxSpend = rankedSpend[0][1];
              return (
                <div key={name} className="flex items-center gap-4">
                  <span className={`text-[10px] font-black w-5 ${i === 0 ? "text-amber-500" : "text-slate-400"}`}>#{i + 1}</span>
                  <div className="flex items-center gap-2 w-32 shrink-0">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-600 text-[10px]">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-black text-slate-700 truncate">{name}</span>
                  </div>
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${(spend / maxSpend) * 100}%` }} />
                  </div>
                  <span className="text-sm font-black text-slate-700 w-24 text-right">${spend.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}