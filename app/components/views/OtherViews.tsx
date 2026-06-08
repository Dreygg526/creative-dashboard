"use client";
import { useMemo, useState } from "react";
import { Ad } from "../../types";

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
    <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[900px] mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-100">My Task Queue</h2>
        <p className="text-gray-500 text-sm font-medium mt-0.5">Tasks assigned to {currentUser}</p>
      </div>

      {activeSessions && Object.keys(activeSessions).length > 0 && (
        <div className="bg-green-950/30 border border-green-900 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <p className="text-[11px] font-black text-green-400 uppercase tracking-widest">
            {Object.keys(activeSessions).length} active session{Object.keys(activeSessions).length > 1 ? "s" : ""} running
          </p>
        </div>
      )}

      {myQueue.length === 0 ? (
        <div className="bg-[#141416] border-2 border-dashed border-gray-800 rounded-2xl p-20 flex flex-col items-center justify-center text-gray-500">
          <span className="text-5xl mb-4">🎉</span>
          <p className="text-xl font-black text-gray-300">Inbox Zero!</p>
          <p className="font-bold text-sm mt-1">You're all caught up.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {myQueue.map(ad => {
            const daysInStage = Math.floor((new Date().getTime() - new Date(ad.stage_updated_at || ad.created_at).getTime()) / (1000 * 3600 * 24));
            const isStale = daysInStage >= 5 && ad.status !== "Testing" && ad.status !== "Winner";
            const session = activeSessions?.[ad.id];
            const isActive = !!session;

            return (
              <div
                key={ad.id}
                onClick={() => setSelectedAd(ad)}
                className={`bg-[#141416] rounded-2xl border p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:shadow-md transition-all ${
                  isActive ? "border-green-900 bg-green-950/20" : "border-gray-800 hover:border-gray-700"
                }`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-1 h-12 rounded-full shrink-0 ${
                    ad.priority === "High" ? "bg-red-500" :
                    ad.priority === "Medium" ? "bg-amber-400" :
                    "bg-gray-600"
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase text-gray-400 mb-1">{ad.status}</p>
                    <h3 className="text-lg font-black text-gray-100 truncate">{ad.concept_name}</h3>
                    <p className="text-gray-500 font-bold text-sm">{ad.product} • {ad.ad_format}</p>
                    {isActive && formatTimer && (
                      <div className="mt-2 inline-flex items-center gap-2 bg-green-700 text-white px-3 py-1.5 rounded-xl">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Session Active</span>
                        <span className="font-black text-sm font-mono">{formatTimer(session.elapsedSeconds)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto border-t md:border-t-0 border-gray-800 pt-4 md:pt-0">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">In Stage</p>
                    <p className={`text-sm font-black ${isStale ? "text-red-400" : "text-gray-200"}`}>{daysInStage} Days</p>
                  </div>
                  <button className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                    isActive ? "bg-green-700 text-white hover:bg-green-600" : "bg-[#1f1f23] text-gray-200 hover:bg-[#2a2a2e]"
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
    <div className="flex-1 overflow-x-auto p-6 flex gap-4 items-start">
      {Object.entries(workloads).map(([person, tasks]) => (
        <div key={person} className="min-w-[280px] max-w-[280px] flex flex-col gap-3">
          <div className="flex justify-between items-center bg-[#141416] p-4 rounded-2xl border border-gray-800 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#1f1f23] flex items-center justify-center font-black text-gray-200 text-xs">
                {person.charAt(0).toUpperCase()}
              </div>
              <h3 className="font-black text-gray-100 text-sm">{person}</h3>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
              tasks.length > 5 ? "bg-red-950 text-red-400" : "bg-[#0d0d0f] text-gray-400"
            }`}>{tasks.length} Active</span>
          </div>
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-gray-800 rounded-2xl text-gray-500 font-bold text-sm">Idle</div>
            ) : tasks.map(ad => (
              <div
                key={ad.id}
                onClick={() => setSelectedAd(ad)}
                className={`bg-[#141416] p-4 rounded-xl border cursor-pointer hover:border-gray-700 hover:shadow-sm transition-all ${
                  ad.status === "Done, Waiting for Approval" ? "border-green-900 bg-green-950/20" : "border-gray-800"
                }`}
              >
                <p className={`text-[9px] font-black uppercase mb-1 ${
                  ad.status === "Done, Waiting for Approval" ? "text-green-400" : "text-gray-500"
                }`}>{ad.status === "Done, Waiting for Approval" ? "✋ " + ad.status : ad.status}</p>
                <p className="font-bold text-gray-100 text-sm leading-tight">{ad.concept_name}</p>
                <div className="mt-2 flex justify-between items-center">
                  <div className={`w-2 h-2 rounded-full ${
                    ad.priority === "High" ? "bg-red-500" :
                    ad.priority === "Medium" ? "bg-amber-400" :
                    "bg-gray-600"
                  }`} />
                  <p className="text-[9px] font-black text-gray-500">
                    {Math.floor((new Date().getTime() - new Date(ad.stage_updated_at || ad.created_at).getTime()) / (1000 * 3600 * 24))}d
                  </p>
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

type Dimension = "sub_avatar" | "angle" | "concept" | "awareness";

function getWeekKey(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((day + 6) % 7));
  return monday.toISOString().split("T")[0];
}

function getWeekLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((day + 6) % 7));
  return monday.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function calcDimStats(ads: Ad[], dimension: Dimension) {
  const map: Record<string, { tested: number; winners: number; total: number }> = {};
  ads.forEach(ad => {
    const key = (ad[dimension] as string) || "";
    if (!key) return;
    if (!map[key]) map[key] = { tested: 0, winners: 0, total: 0 };
    map[key].total += 1;
    if (["Testing", "Winner", "Killed"].includes(ad.status)) map[key].tested += 1;
    if (ad.result === "Winner" || ad.status === "Winner") map[key].winners += 1;
  });
  return Object.entries(map)
    .map(([name, s]) => ({ name, ...s, rate: s.tested > 0 ? Math.round((s.winners / s.tested) * 100) : 0 }))
    .sort((a, b) => b.winners - a.winners || b.rate - a.rate);
}

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
  rankedHitRate?: { name: string; tested: number; winners: number; rate: number }[];
}

export function ReportsView({
  ads, weeklyChartData, avgDaysToUpload, pipelineVelocityData,
  teamOutput, hitRate, inTesting, conceptsVsIterations, creativeDiversity, rankedSpend, rankedHitRate
}: ReportsProps) {

  const maxWeeklyCount = Math.max(...weeklyChartData.map(d => d.count), 1);

  const [activeDim, setActiveDim] = useState<Dimension>("sub_avatar");
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState("");

  const dimStats = useMemo(() => calcDimStats(ads, activeDim), [ads, activeDim]);

  const dimLabels: Record<Dimension, string> = {
    sub_avatar: "Sub Avatar",
    angle: "Angle",
    concept: "Concept",
    awareness: "Awareness",
  };
  const dimEmojis: Record<Dimension, string> = {
    sub_avatar: "👤",
    angle: "🎯",
    concept: "💡",
    awareness: "🧠",
  };

  // ── CYCLE PERFORMANCE DATA ──
  const cyclePerformance = useMemo(() => {
    const map: Record<string, { total: number; tested: number; winners: number }> = {};
    ads.forEach(ad => {
      const key = getWeekKey(ad.created_at);
      if (!map[key]) map[key] = { total: 0, tested: 0, winners: 0 };
      map[key].total += 1;
      if (["Testing", "Winner", "Killed"].includes(ad.status)) map[key].tested += 1;
      if (ad.result === "Winner" || ad.status === "Winner") map[key].winners += 1;
    });
    return Object.entries(map)
      .map(([key, s]) => ({
        key,
        label: getWeekLabel(key),
        ...s,
        rate: s.tested > 0 ? Math.round((s.winners / s.tested) * 100) : 0,
      }))
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-10); // last 10 cycles
  }, [ads]);

  const maxCycleRate = Math.max(...cyclePerformance.map(c => c.rate), 1);

  const handleGetInsights = async () => {
    setIsLoadingAI(true);
    setAiError("");
    setAiInsights(null);
    try {
      const allDims: Dimension[] = ["sub_avatar", "angle", "concept", "awareness"];
      const summaryData = allDims.map(dim => ({
        dimension: dimLabels[dim],
        breakdown: calcDimStats(ads, dim).slice(0, 8).map(s => ({
          name: s.name,
          total: s.total,
          tested: s.tested,
          winners: s.winners,
          hitRate: `${s.rate}%`,
        }))
      }));

      const totalAds = ads.length;
      const testedAds = ads.filter(a => ["Testing", "Winner", "Killed"].includes(a.status)).length;
      const winners = ads.filter(a => a.result === "Winner" || a.status === "Winner").length;
      const overallRate = testedAds > 0 ? Math.round((winners / testedAds) * 100) : 0;

      const prompt = `You are a senior DTC performance marketing strategist analyzing creative ad data.

Overall: ${totalAds} total ads, ${testedAds} tested, ${winners} winners, ${overallRate}% overall hit rate.

Breakdown by dimension:
${JSON.stringify(summaryData, null, 2)}

Provide a concise strategic analysis (max 300 words) covering:
1. Which sub avatars, angles, concepts, and awareness states are performing best and worst
2. What patterns you see (e.g. "problem aware + X angle consistently wins")
3. 2-3 specific, actionable recommendations for what to double down on and what to retire
4. Any red flags (e.g. concepts tested many times with 0 winners)

Be direct, specific, and data-driven. Use short paragraphs and bold key insights with **.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || "",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 600,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      const text = data.content?.[0]?.text || "";
      if (!text) throw new Error("Empty response");
      setAiInsights(text);
    } catch (err: any) {
      setAiError("Failed to get insights. Try again.");
      console.error(err);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const pipelineSpeed = useMemo(() => {
    const stages = ["Idea", "Writing Brief", "Brief Approved", "Editor Assigned", "In Progress", "Ad Revision", "Pending Upload", "Testing"];
    return stages.map(stage => {
      const stageAds = ads.filter(ad => ad.status === stage);
      const avgDays = stageAds.length > 0
        ? Math.round(stageAds.reduce((sum, ad) => sum + Math.floor((new Date().getTime() - new Date(ad.stage_updated_at || ad.created_at).getTime()) / (1000 * 3600 * 24)), 0) / stageAds.length)
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
    ads.forEach(ad => { const type = ad.ad_type || "Unknown"; counts[type] = (counts[type] || 0) + 1; });
    const total = ads.length || 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([type, count]) => ({ type, count, pct: Math.round((count / total) * 100) }));
  }, [ads]);

  const adTypeColors: Record<string, string> = {
    "New Concept": "bg-green-500",
    "Iteration": "bg-blue-400",
    "Ideation": "bg-amber-400",
    "Imitation": "bg-red-400",
    "Unknown": "bg-gray-600",
  };

  const totalSpend = ads.reduce((sum, ad) => sum + Number(ad.ad_spend || 0), 0);
  const cardClass = "bg-[#141416] border border-gray-800 rounded-2xl p-6 shadow-sm";

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[1300px] mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-100">Creative Output Report</h2>
        <p className="text-gray-500 text-sm font-medium mt-0.5">All charts pull live from the database</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Volume This Week", value: weeklyChartData[weeklyChartData.length - 1]?.count || 0, sub: "ads created", color: "text-gray-100" },
          { label: "Overall Hit Rate", value: `${hitRate}%`, sub: "winners / total tested", color: hitRate >= 30 ? "text-green-400" : hitRate >= 15 ? "text-amber-500" : "text-red-400" },
          { label: "In Testing", value: inTesting, sub: "ads live", color: "text-blue-400" },
          { label: "Total Ad Spend", value: `$${totalSpend.toLocaleString()}`, sub: "all time", color: "text-amber-500" },
        ].map(s => (
          <div key={s.label} className="bg-[#141416] border border-gray-800 rounded-2xl p-5 shadow-sm">
            <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest mb-2">{s.label}</p>
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] font-bold text-gray-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-black text-gray-100">Output Over Time</h3>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Weekly Produced</p>
            </div>
            <span className="text-2xl">📈</span>
          </div>
          <div className="flex items-end gap-2 h-36">
            {weeklyChartData.map((d, i) => {
              const heightPct = maxWeeklyCount > 0 ? (d.count / maxWeeklyCount) * 100 : 0;
              const isThisWeek = i === weeklyChartData.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col items-center" style={{ height: "100px" }}>
                    <div className="flex-1 w-full flex items-end relative group">
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                        <div className="bg-[#0d0d0f] border border-gray-700 text-gray-100 text-[10px] font-black px-3 py-1.5 rounded-xl whitespace-nowrap shadow-lg">
                          {d.label}: {d.count} ad{d.count !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div
                        className={`w-full rounded-t-xl transition-all cursor-pointer ${isThisWeek ? "bg-gray-100 hover:bg-white" : "bg-gray-700 hover:bg-gray-600"}`}
                        style={{ height: `${Math.max(heightPct, 5)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-gray-500 uppercase text-center leading-tight">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-black text-gray-100">New vs Iterations</h3>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">This Week</p>
            </div>
            <span className="text-2xl">🔁</span>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-green-950/30 rounded-2xl p-4 text-center border border-green-900">
              <p className="text-4xl font-black text-green-400 mb-1">{newCount}</p>
              <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">New Concepts</p>
            </div>
            <div className="bg-blue-950/30 rounded-2xl p-4 text-center border border-blue-900">
              <p className="text-4xl font-black text-blue-400 mb-1">{iterCount}</p>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Iterations</p>
            </div>
          </div>
          <div className="h-3 bg-[#0d0d0f] rounded-full overflow-hidden flex">
            <div className="h-full bg-green-500 transition-all" style={{ width: `${(newCount / totalNI) * 100}%` }} />
            <div className="h-full bg-blue-400 transition-all" style={{ width: `${(iterCount / totalNI) * 100}%` }} />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[9px] font-black text-green-500">New {Math.round((newCount / totalNI) * 100)}%</span>
            <span className="text-[9px] font-black text-blue-500">Iter {Math.round((iterCount / totalNI) * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-black text-gray-100">Output by Team Member</h3>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">This Week</p>
            </div>
            <span className="text-2xl">👷</span>
          </div>
          {teamOutput.length === 0 ? (
            <div className="text-center py-8 text-gray-500 font-bold">No output data yet</div>
          ) : (
            <div className="space-y-4">
              {teamOutput.map(([name, stats]) => {
                const total = stats.strategist + stats.editor;
                const maxTotal = Math.max(...teamOutput.map(([, s]) => s.strategist + s.editor), 1);
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#1f1f23] flex items-center justify-center font-black text-gray-200 text-[10px]">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-black text-gray-200">{name}</span>
                      </div>
                      <span className="text-sm font-black text-gray-400">{total}</span>
                    </div>
                    <div className="h-2.5 bg-[#0d0d0f] rounded-full overflow-hidden">
                      <div className="h-full bg-gray-300 rounded-full transition-all" style={{ width: `${(total / maxTotal) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-black text-gray-100">By Ad Type</h3>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">All Time</p>
            </div>
            <span className="text-2xl">🏷️</span>
          </div>
          {adTypeData.length === 0 ? (
            <div className="text-center py-8 text-gray-500 font-bold">No ads yet</div>
          ) : (
            <div className="space-y-4">
              {adTypeData.map(({ type, count, pct }) => (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${adTypeColors[type] || "bg-gray-600"}`} />
                      <span className="text-sm font-black text-gray-200">{type}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-gray-500">{count} ads</span>
                      <span className="text-sm font-black text-gray-300">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-2.5 bg-[#0d0d0f] rounded-full overflow-hidden">
                    <div className={`h-full ${adTypeColors[type] || "bg-gray-600"} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Creative Diversity */}
      <div className={`${cardClass} mb-6`}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-black text-gray-100">Creative Diversity</h3>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Format Split — All Time</p>
          </div>
          <span className="text-2xl">🎨</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Video", count: videoCount, pct: videoPct, color: "bg-green-500" },
            { label: "Static", count: staticCount, pct: staticPct, color: "bg-blue-400" },
            { label: "Native", count: nativeCount, pct: nativePct, color: "bg-amber-400" },
          ].map(f => (
            <div key={f.label} className="bg-[#0d0d0f] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-black text-gray-200">{f.label} Ad</span>
                <span className="text-xl font-black text-gray-100">{f.pct}%</span>
              </div>
              <div className="h-2.5 bg-[#1a1a1d] rounded-full overflow-hidden mb-2">
                <div className={`h-full ${f.color} rounded-full transition-all`} style={{ width: `${f.pct}%` }} />
              </div>
              <p className="text-[9px] font-bold text-gray-500">{f.count} ads total</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline Speed */}
      <div className={`${cardClass} mb-6`}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-black text-gray-100">Pipeline Speed</h3>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Avg Days Per Stage</p>
          </div>
          <span className="text-2xl">⚡</span>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {pipelineSpeed.map((s, i) => {
            const isStale = s.avgDays >= 5;
            return (
              <div key={i} className={`rounded-2xl p-4 text-center border-2 transition-all ${isStale ? "border-red-900 bg-red-950/30" : "border-gray-800 bg-[#0d0d0f]"}`}>
                <p className={`text-2xl font-black mb-1 ${isStale ? "text-red-400" : "text-gray-100"}`}>{s.avgDays}d</p>
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-tighter leading-tight">{s.stage}</p>
                <p className={`text-[8px] font-bold mt-1 ${isStale ? "text-red-500" : "text-gray-600"}`}>{s.count} ads</p>
              </div>
            );
          })}
        </div>
        <p className="text-[9px] font-bold text-gray-500 mt-3">Stages with 5+ day average are flagged red</p>
      </div>

      {/* Ad Spend Rankings */}
      {rankedSpend.length > 0 && (
        <div className={`${cardClass} mb-6`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-black text-gray-100">Ad Spend Rankings</h3>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">By Team Member</p>
            </div>
            <span className="text-2xl">💰</span>
          </div>
          <div className="space-y-4">
            {rankedSpend.map(([name, spend], i) => {
              const maxSpend = rankedSpend[0][1];
              return (
                <div key={name} className="flex items-center gap-4">
                  <span className={`text-[10px] font-black w-5 ${i === 0 ? "text-amber-500" : "text-gray-500"}`}>#{i + 1}</span>
                  <div className="flex items-center gap-2 w-32 shrink-0">
                    <div className="w-6 h-6 rounded-full bg-[#1f1f23] flex items-center justify-center font-black text-gray-200 text-[10px]">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-black text-gray-200 truncate">{name}</span>
                  </div>
                  <div className="flex-1 h-2.5 bg-[#0d0d0f] rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${(spend / maxSpend) * 100}%` }} />
                  </div>
                  <span className="text-sm font-black text-gray-200 w-24 text-right">${spend.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hit Rate Per Person */}
      {rankedHitRate && rankedHitRate.length > 0 && (
        <div className={`${cardClass} mb-6`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-black text-gray-100">Hit Rate Per Person</h3>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Winners / Total Ads Tested — All Time</p>
            </div>
            <span className="text-2xl">🎯</span>
          </div>
          <div className="space-y-5">
            {rankedHitRate.map((person, i) => (
              <div key={person.name}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-black w-5 ${i === 0 ? "text-amber-500" : "text-gray-500"}`}>#{i + 1}</span>
                    <div className="w-7 h-7 rounded-full bg-[#1f1f23] flex items-center justify-center font-black text-gray-200 text-[11px]">
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-black text-gray-200">{person.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Tested</p>
                      <p className="text-sm font-black text-gray-200">{person.tested}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Winners</p>
                      <p className="text-sm font-black text-green-400">{person.winners}</p>
                    </div>
                    <div className="text-right min-w-[48px]">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Rate</p>
                      <p className={`text-lg font-black ${person.rate >= 30 ? "text-green-400" : person.rate >= 15 ? "text-amber-500" : "text-red-400"}`}>
                        {person.rate}%
                      </p>
                    </div>
                  </div>
                </div>
                <div className="h-3 bg-[#0d0d0f] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${person.rate >= 30 ? "bg-green-500" : person.rate >= 15 ? "bg-amber-400" : "bg-red-400"}`}
                    style={{ width: `${Math.min(person.rate, 100)}%` }}
                  />
                </div>
                <p className="text-[9px] font-bold text-gray-500 mt-1">{person.winners} winner{person.winners !== 1 ? "s" : ""} out of {person.tested} tested</p>
              </div>
            ))}
          </div>
          <p className="text-[9px] font-bold text-gray-500 mt-4 border-t border-gray-800 pt-3">
            🟢 30%+ = Strong &nbsp;|&nbsp; 🟡 15–29% = Average &nbsp;|&nbsp; 🔴 Under 15% = Needs improvement
          </p>
        </div>
      )}

      {/* ─── CYCLE PERFORMANCE ─── */}
      {cyclePerformance.length > 0 && (
        <div className={`${cardClass} mb-6`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-black text-gray-100">Cycle Performance</h3>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Hit Rate Per Week — Are We Improving?</p>
            </div>
            <span className="text-2xl">📅</span>
          </div>
          <div className="flex items-end gap-3 h-40 mb-4">
            {cyclePerformance.map((c, i) => {
              const isLatest = i === cyclePerformance.length - 1;
              const heightPct = maxCycleRate > 0 ? (c.rate / maxCycleRate) * 100 : 0;
              const barColor = c.rate >= 30 ? "bg-green-500" : c.rate >= 15 ? "bg-amber-400" : c.tested === 0 ? "bg-gray-700" : "bg-red-400";
              return (
                <div key={c.key} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex flex-col items-center" style={{ height: "120px" }}>
                    <div className="flex-1 w-full flex items-end relative group">
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                        <div className="bg-[#0d0d0f] border border-gray-700 text-gray-100 text-[10px] font-black px-3 py-2 rounded-xl whitespace-nowrap shadow-lg text-center">
                          <p>{c.label}</p>
                          <p>{c.rate}% hit rate</p>
                          <p className="text-gray-500">{c.winners}W / {c.tested} tested</p>
                        </div>
                      </div>
                      <div
                        className={`w-full rounded-t-xl transition-all ${barColor} ${isLatest ? "opacity-100" : "opacity-75"}`}
                        style={{ height: `${c.tested === 0 ? 8 : Math.max(heightPct, 8)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[8px] font-black text-gray-500 uppercase text-center leading-tight">{c.label}</span>
                  <span className={`text-[9px] font-black ${
                    c.tested === 0 ? "text-gray-700" :
                    c.rate >= 30 ? "text-green-400" :
                    c.rate >= 15 ? "text-amber-500" :
                    "text-red-400"
                  }`}>{c.tested === 0 ? "—" : `${c.rate}%`}</span>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-800">
            {(() => {
              const tested = cyclePerformance.filter(c => c.tested > 0);
              const best = tested.length > 0 ? tested.reduce((a, b) => a.rate > b.rate ? a : b) : null;
              const trend = tested.length >= 2
                ? tested[tested.length - 1].rate - tested[tested.length - 2].rate
                : 0;
              const recentAvg = tested.slice(-3).length > 0
                ? Math.round(tested.slice(-3).reduce((s, c) => s + c.rate, 0) / tested.slice(-3).length)
                : 0;
              return [
                { label: "Best Cycle", value: best ? `${best.rate}%` : "—", sub: best ? best.label : "No data", color: "text-green-400" },
                { label: "Trend", value: trend === 0 ? "—" : trend > 0 ? `+${trend}%` : `${trend}%`, sub: "vs last cycle", color: trend > 0 ? "text-green-400" : trend < 0 ? "text-red-400" : "text-gray-500" },
                { label: "3-Cycle Avg", value: recentAvg > 0 ? `${recentAvg}%` : "—", sub: "recent hit rate", color: recentAvg >= 30 ? "text-green-400" : recentAvg >= 15 ? "text-amber-500" : "text-red-400" },
              ].map(s => (
                <div key={s.label} className="bg-[#0d0d0f] rounded-xl p-3 text-center">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">{s.label}</p>
                  <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[9px] font-bold text-gray-500 mt-0.5">{s.sub}</p>
                </div>
              ));
            })()}
          </div>
          <p className="text-[9px] font-bold text-gray-500 mt-3">Showing last {cyclePerformance.length} cycles. Hover bars for details.</p>
        </div>
      )}

      {/* ─── CREATIVE INTELLIGENCE ─── */}
      <div className="mt-2 space-y-6">

        {/* Dimension Breakdown */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-black text-gray-100">Creative Intelligence</h3>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Performance by Targeting Dimension</p>
            </div>
            <span className="text-2xl">🔬</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            {(Object.keys(dimLabels) as Dimension[]).map(dim => (
              <button
                key={dim}
                onClick={() => setActiveDim(dim)}
                className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all border ${
                  activeDim === dim
                    ? "bg-gray-100 text-gray-900 border-gray-100"
                    : "bg-[#1a1a1d] text-gray-400 border-gray-700 hover:border-gray-500"
                }`}
              >
                {dimEmojis[dim]} {dimLabels[dim]}
              </button>
            ))}
          </div>
          {dimStats.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <p className="font-black text-lg mb-1">No data yet</p>
              <p className="text-sm">Tag ads with {dimLabels[activeDim]} to see performance here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dimStats.map((s, i) => {
                const isStrong = s.rate >= 30 && s.tested >= 2;
                const isWeak = s.tested >= 3 && s.rate < 10;
                const isUntested = s.tested === 0;
                return (
                  <div key={s.name} className={`rounded-2xl p-4 border transition-all ${
                    isStrong ? "border-green-900 bg-green-950/20" :
                    isWeak ? "border-red-900 bg-red-950/20" :
                    "border-gray-800 bg-[#0d0d0f]"
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className={`text-[10px] font-black w-5 shrink-0 ${i === 0 && s.winners > 0 ? "text-amber-500" : "text-gray-500"}`}>#{i + 1}</span>
                        <span className="text-sm font-black text-gray-100 truncate">{s.name}</span>
                        {isStrong && <span className="text-[8px] font-black bg-green-950 text-green-400 px-2 py-0.5 rounded-full uppercase shrink-0">🔥 Strong</span>}
                        {isWeak && <span className="text-[8px] font-black bg-red-950 text-red-400 px-2 py-0.5 rounded-full uppercase shrink-0">⚠️ Weak</span>}
                        {isUntested && <span className="text-[8px] font-black bg-[#1f1f23] text-gray-500 px-2 py-0.5 rounded-full uppercase shrink-0">Not Tested</span>}
                      </div>
                      <div className="flex items-center gap-4 shrink-0 ml-4">
                        <div className="text-right">
                          <p className="text-[8px] font-black text-gray-500 uppercase">Total</p>
                          <p className="text-sm font-black text-gray-300">{s.total}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-black text-gray-500 uppercase">Tested</p>
                          <p className="text-sm font-black text-gray-300">{s.tested}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-black text-gray-500 uppercase">Winners</p>
                          <p className="text-sm font-black text-green-400">{s.winners}</p>
                        </div>
                        <div className="text-right min-w-[48px]">
                          <p className="text-[8px] font-black text-gray-500 uppercase">Hit Rate</p>
                          <p className={`text-lg font-black ${
                            isUntested ? "text-gray-500" :
                            s.rate >= 30 ? "text-green-400" :
                            s.rate >= 15 ? "text-amber-500" :
                            "text-red-400"
                          }`}>{isUntested ? "—" : `${s.rate}%`}</p>
                        </div>
                      </div>
                    </div>
                    {!isUntested && (
                      <div className="h-2 bg-[#1a1a1d] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            s.rate >= 30 ? "bg-green-500" :
                            s.rate >= 15 ? "bg-amber-400" :
                            "bg-red-400"
                          }`}
                          style={{ width: `${Math.min(s.rate, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-[9px] font-bold text-gray-500 mt-4 border-t border-gray-800 pt-3">
            🟢 30%+ hit rate = Strong &nbsp;|&nbsp; 🟡 15–29% = Average &nbsp;|&nbsp; 🔴 Under 15% = Needs review
          </p>
        </div>

        {/* AI Insights */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-black text-gray-100">AI Strategic Insights</h3>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Claude analyzes your creative data</p>
            </div>
            <span className="text-2xl">🤖</span>
          </div>
          {!aiInsights && !isLoadingAI && (
            <div className="text-center py-8">
              <p className="text-gray-500 font-bold text-sm mb-4">Get a strategic breakdown of what's working and what to cut — powered by Claude</p>
              <button
                onClick={handleGetInsights}
                className="bg-gray-100 text-gray-900 px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-white transition-all shadow-sm"
              >
                🧠 Analyze My Creative Data
              </button>
            </div>
          )}
          {isLoadingAI && (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="w-10 h-10 border-4 border-gray-700 border-t-gray-200 rounded-full animate-spin mb-4" />
              <p className="font-black text-gray-300">Claude is analyzing your data...</p>
              <p className="text-xs text-gray-500 mt-1">Looking at angles, sub avatars, concepts, and awareness levels</p>
            </div>
          )}
          {aiError && (
            <div className="bg-red-950/30 border border-red-900 rounded-xl p-4 text-center">
              <p className="text-red-400 font-black text-sm">{aiError}</p>
              <button onClick={handleGetInsights} className="mt-3 text-xs font-black text-red-400 hover:text-red-300 uppercase tracking-widest">Try Again</button>
            </div>
          )}
          {aiInsights && (
            <div>
              <div className="bg-[#0d0d0f] border border-gray-800 rounded-2xl p-5 space-y-2">
                {aiInsights.split("\n").filter(Boolean).map((line, i) => {
                  const isBold = line.startsWith("**") || line.startsWith("###") || line.startsWith("##");
                  const clean = line.replace(/\*\*/g, "").replace(/###?/g, "").trim();
                  if (!clean) return null;
                  return (
                    <p key={i} className={`${isBold ? "font-black text-gray-100 text-sm" : "text-gray-400 text-sm font-medium"}`}>
                      {clean}
                    </p>
                  );
                })}
              </div>
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleGetInsights}
                  disabled={isLoadingAI}
                  className="text-[10px] font-black text-gray-500 hover:text-gray-200 uppercase tracking-widest px-3 py-1.5 hover:bg-[#1a1a1d] rounded-lg transition-all disabled:opacity-40"
                >
                  🔄 Refresh Analysis
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}