"use client";
import { useState, useMemo } from "react";
import { Ad } from "../../types";

interface Props {
  ads: Ad[];
  onSelectAd: (ad: Ad) => void;
}

function getWeekLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((day + 6) % 7));
  return monday.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getWeekKey(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((day + 6) % 7));
  return monday.toISOString().split("T")[0];
}

interface Cycle {
  key: string;
  label: string;
  ads: Ad[];
  total: number;
  tested: number;
  winners: number;
  hitRate: number;
}

export default function CyclesView({ ads, onSelectAd }: Props) {
  const [expandedCycle, setExpandedCycle] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const cycles = useMemo((): Cycle[] => {
    const map: Record<string, Ad[]> = {};
    ads.forEach(ad => {
      const key = getWeekKey(ad.created_at);
      if (!map[key]) map[key] = [];
      map[key].push(ad);
    });

    return Object.entries(map)
      .map(([key, cycleAds]) => {
        const tested = cycleAds.filter(a => ["Testing", "Winner", "Killed"].includes(a.status)).length;
        const winners = cycleAds.filter(a => a.result === "Winner" || a.status === "Winner").length;
        const hitRate = tested > 0 ? Math.round((winners / tested) * 100) : 0;
        return {
          key,
          label: `Week of ${getWeekLabel(key)}`,
          ads: cycleAds.sort((a, b) => (a.imprint_number || 0) - (b.imprint_number || 0)),
          total: cycleAds.length,
          tested,
          winners,
          hitRate,
        };
      })
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [ads]);

  const filteredCycles = useMemo(() => {
    if (!search.trim()) return cycles;
    const q = search.toLowerCase();
    return cycles.map(cycle => ({
      ...cycle,
      ads: cycle.ads.filter(ad =>
        ad.concept_name.toLowerCase().includes(q) ||
        (ad.product || "").toLowerCase().includes(q) ||
        (ad.assigned_editor || "").toLowerCase().includes(q) ||
        (ad.assigned_copywriter || "").toLowerCase().includes(q) ||
        String(ad.imprint_number || "").includes(q)
      )
    })).filter(cycle => cycle.ads.length > 0);
  }, [cycles, search]);

  const totalCycles = cycles.length;
  const totalWinners = cycles.reduce((s, c) => s + c.winners, 0);
  const totalTested = cycles.reduce((s, c) => s + c.tested, 0);
  const overallRate = totalTested > 0 ? Math.round((totalWinners / totalTested) * 100) : 0;

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[1100px] mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-100">Cycles</h2>
        <p className="text-gray-500 text-sm font-medium mt-0.5">Ads grouped by the week they were created</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Cycles", value: totalCycles, color: "text-gray-100", sub: "weeks with ads" },
          { label: "Total Ads", value: ads.length, color: "text-gray-100", sub: "all time" },
          { label: "Total Tested", value: totalTested, color: "text-blue-400", sub: "entered testing" },
          { label: "Overall Hit Rate", value: `${overallRate}%`, color: overallRate >= 30 ? "text-green-400" : overallRate >= 15 ? "text-amber-500" : "text-red-400", sub: `${totalWinners} winners` },
        ].map(s => (
          <div key={s.label} className="bg-[#141416] border border-gray-800 rounded-2xl p-5 shadow-sm">
            <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest mb-2">{s.label}</p>
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] font-bold text-gray-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="mb-5 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search by concept, product, editor, DTC number..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-700 bg-[#1a1a1d] rounded-xl text-sm font-medium outline-none focus:border-gray-500 transition-all placeholder:text-gray-600 text-gray-100"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 font-black text-sm">✕</button>
        )}
      </div>

      {/* Cycles list */}
      {filteredCycles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-700">
          <div className="text-6xl mb-4">📅</div>
          <p className="text-lg font-bold text-gray-500">No cycles found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCycles.map((cycle, cycleIdx) => {
            const isExpanded = expandedCycle === cycle.key;
            const isStrong = cycle.hitRate >= 30 && cycle.tested >= 2;
            const isWeak = cycle.tested >= 3 && cycle.hitRate < 10;
            const isCurrent = cycleIdx === 0 && !search;

            return (
              <div key={cycle.key} className={`bg-[#141416] border rounded-2xl shadow-sm overflow-hidden transition-all ${
                isStrong ? "border-green-900" : isWeak ? "border-red-900" : "border-gray-800"
              }`}>
                {/* Cycle Header */}
                <div
                  className={`flex items-center justify-between p-5 cursor-pointer hover:bg-[#1a1a1d] transition-all ${isExpanded ? "border-b border-gray-800" : ""}`}
                  onClick={() => setExpandedCycle(isExpanded ? null : cycle.key)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-10 rounded-full ${
                      isStrong ? "bg-green-500" :
                      isWeak ? "bg-red-400" :
                      cycle.winners > 0 ? "bg-amber-400" :
                      "bg-gray-700"
                    }`} />
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-black text-gray-100">{cycle.label}</p>
                        {isCurrent && <span className="text-[8px] font-black bg-[#1f1f23] text-gray-200 px-2 py-0.5 rounded-full uppercase">Current</span>}
                        {isStrong && <span className="text-[8px] font-black bg-green-950 text-green-400 px-2 py-0.5 rounded-full uppercase">🔥 Strong</span>}
                        {isWeak && <span className="text-[8px] font-black bg-red-950 text-red-400 px-2 py-0.5 rounded-full uppercase">⚠️ Weak</span>}
                      </div>
                      <p className="text-[10px] font-bold text-gray-500">{cycle.total} ads created this week</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Total</p>
                      <p className="text-lg font-black text-gray-200">{cycle.total}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Tested</p>
                      <p className="text-lg font-black text-blue-400">{cycle.tested}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Winners</p>
                      <p className="text-lg font-black text-green-400">{cycle.winners}</p>
                    </div>
                    <div className="text-right min-w-[56px]">
                      <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Hit Rate</p>
                      <p className={`text-xl font-black ${
                        cycle.tested === 0 ? "text-gray-700" :
                        cycle.hitRate >= 30 ? "text-green-400" :
                        cycle.hitRate >= 15 ? "text-amber-500" :
                        "text-red-400"
                      }`}>{cycle.tested === 0 ? "—" : `${cycle.hitRate}%`}</p>
                    </div>
                    <span className={`text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""} text-sm`}>▼</span>
                  </div>
                </div>

                {/* Expanded Ads */}
                {isExpanded && (
                  <div className="p-4 bg-[#0d0d0f]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {cycle.ads.map(ad => {
                        const isWinner = ad.result === "Winner" || ad.status === "Winner";
                        const isKilled = ad.status === "Killed";
                        const isTesting = ad.status === "Testing";
                        const isActive = !["Winner", "Killed", "Testing"].includes(ad.status);

                        return (
                          <div
                            key={ad.id}
                            onClick={() => onSelectAd(ad)}
                            className={`bg-[#141416] rounded-xl border p-4 cursor-pointer hover:shadow-md transition-all ${
                              isWinner ? "border-green-900 bg-green-950/20" :
                              isKilled ? "border-gray-800 opacity-50" :
                              isTesting ? "border-blue-900 bg-blue-950/20" :
                              "border-gray-800 hover:border-gray-700"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {ad.imprint_number && (
                                  <span className="text-[9px] font-black font-mono text-amber-500 bg-amber-950/50 border border-amber-900 px-1.5 py-0.5 rounded-md">
                                    DTC #{ad.imprint_number}
                                  </span>
                                )}
                                {isWinner && <span className="text-[9px] font-black bg-green-950 text-green-400 px-1.5 py-0.5 rounded-md">🏆 Winner</span>}
                                {isKilled && <span className="text-[9px] font-black bg-[#0d0d0f] text-gray-500 px-1.5 py-0.5 rounded-md">💀 Killed</span>}
                                {isTesting && <span className="text-[9px] font-black bg-blue-950 text-blue-400 px-1.5 py-0.5 rounded-md">🧪 Testing</span>}
                              </div>
                              <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${
                                ad.priority === "High" ? "bg-red-500" :
                                ad.priority === "Medium" ? "bg-amber-400" :
                                "bg-gray-600"
                              }`} />
                            </div>
                            <p className="font-black text-gray-100 text-sm leading-snug mb-2">{ad.concept_name}</p>
                            <div className="flex flex-wrap gap-1">
                              {ad.ad_format && <span className="text-[8px] font-black px-1.5 py-0.5 bg-[#0d0d0f] text-gray-400 rounded-md uppercase">{ad.ad_format}</span>}
                              {ad.sub_avatar && <span className="text-[8px] font-black px-1.5 py-0.5 bg-violet-950 text-violet-400 rounded-md uppercase">{ad.sub_avatar}</span>}
                              {ad.angle && <span className="text-[8px] font-black px-1.5 py-0.5 bg-orange-950 text-orange-400 rounded-md uppercase">{ad.angle}</span>}
                              {ad.assigned_editor && <span className="text-[8px] font-black px-1.5 py-0.5 bg-blue-950 text-blue-400 rounded-md uppercase">✂️ {ad.assigned_editor}</span>}
                            </div>
                            {isActive && (
                              <p className="text-[8px] font-bold text-gray-500 mt-2 uppercase tracking-widest">{ad.status}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}