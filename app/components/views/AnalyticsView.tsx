"use client";
import { useState, useMemo } from "react";
import { Ad } from "../../types";

interface Props {
  ads: Ad[];
  onSelectAd: (ad: Ad) => void;
}

type SortKey = "name" | "cycle" | "launch" | "ads" | "spend" | "cpa" | "purchases" | "cvr" | "persona" | "core_emotion" | "problem" | "awareness";
type GroupBy = "concepts" | "cycles" | "personas";

function getCycleNumber(dateStr: string, allDates: string[]): number {
  // Cycle number = how many distinct weeks since the earliest ad
  const getWeekStart = (d: string) => {
    const date = new Date(d);
    const day = date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((day + 6) % 7));
    return monday.toISOString().split("T")[0];
  };
  const weeks = Array.from(new Set(allDates.map(getWeekStart))).sort();
  const myWeek = getWeekStart(dateStr);
  return weeks.indexOf(myWeek) + 1;
}

function formatLaunchDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AnalyticsView({ ads, onSelectAd }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("purchases");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [groupBy, setGroupBy] = useState<GroupBy>("concepts");
  const [dateRange, setDateRange] = useState<number>(60);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showDateMenu, setShowDateMenu] = useState(false);

  const allDates = useMemo(() => ads.map(a => a.created_at), [ads]);

  // Filter by date range
  const dateFilteredAds = useMemo(() => {
    if (dateRange === 0) return ads;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - dateRange);
    return ads.filter(a => new Date(a.created_at) >= cutoff);
  }, [ads, dateRange]);

  // Build rows
  const rows = useMemo(() => {
    return dateFilteredAds.map(ad => {
      const spend = Number(ad.ad_spend || 0);
      const purchases = Number((ad as any).purchases || 0);
      const cvr = Number((ad as any).cvr || 0);
      const cpa = purchases > 0 ? spend / purchases : 0;
      const cycleNum = getCycleNumber(ad.created_at, allDates);
      return {
        ad,
        name: ad.concept_name,
        cycle: cycleNum,
        launch: ad.created_at,
        ads: 1,
        spend,
        cpa,
        purchases,
        cvr,
        persona: (ad as any).persona || "—",
        core_emotion: (ad as any).core_emotion || "—",
        problem: (ad as any).problem || "—",
        awareness: ad.awareness || "—",
      };
    });
  }, [dateFilteredAds, allDates]);

  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      let av: any = a[sortKey];
      let bv: any = b[sortKey];
      if (sortKey === "launch") { av = new Date(a.launch).getTime(); bv = new Date(b.launch).getTime(); }
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return sorted;
  }, [rows, sortKey, sortDir]);

  // Totals
  const totals = useMemo(() => {
    const totalAds = rows.length;
    const totalSpend = rows.reduce((s, r) => s + r.spend, 0);
    const totalPurchases = rows.reduce((s, r) => s + r.purchases, 0);
    const avgCpa = totalPurchases > 0 ? totalSpend / totalPurchases : 0;
    const avgCvr = rows.length > 0 ? rows.reduce((s, r) => s + r.cvr, 0) / rows.length : 0;
    const uniquePersonas = new Set(rows.map(r => r.persona).filter(p => p !== "—")).size;
    const uniqueEmotions = new Set(rows.map(r => r.core_emotion).filter(p => p !== "—")).size;
    const uniqueProblems = new Set(rows.map(r => r.problem).filter(p => p !== "—")).size;
    const uniqueAwareness = new Set(rows.map(r => r.awareness).filter(p => p !== "—")).size;
    return { totalAds, totalSpend, totalPurchases, avgCpa, avgCvr, uniquePersonas, uniqueEmotions, uniqueProblems, uniqueAwareness };
  }, [rows]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className={`ml-1 text-[8px] ${sortKey === col ? "text-white" : "text-gray-600"}`}>
      {sortKey === col ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
    </span>
  );

  const columns: { key: SortKey; label: string; align?: string }[] = [
    { key: "name", label: "Name" },
    { key: "cycle", label: "Cycle" },
    { key: "launch", label: "Launch Date" },
    { key: "ads", label: "# of Ads", align: "right" },
    { key: "spend", label: "Spend", align: "right" },
    { key: "cpa", label: "CPA", align: "right" },
    { key: "purchases", label: "Purchases", align: "right" },
    { key: "cvr", label: "CVR", align: "right" },
    { key: "persona", label: "Persona" },
    { key: "core_emotion", label: "Core Emotion" },
    { key: "problem", label: "Problem" },
    { key: "awareness", label: "Awareness" },
  ];

  const groupLabels: Record<GroupBy, string> = {
    concepts: "Concepts",
    cycles: "Cycles",
    personas: "Personas",
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0d0d0f] text-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">▤</span>
          <h2 className="text-base font-bold text-gray-100">Analytics</h2>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center gap-3">
          {/* Date range */}
          <div className="relative">
            <button
              onClick={() => { setShowDateMenu(!showDateMenu); setShowGroupMenu(false); }}
              className="flex items-center gap-2 bg-[#1a1a1d] border border-gray-700 rounded-lg px-3 py-2 text-xs font-medium text-gray-200 hover:border-gray-600 transition-all"
            >
              <span>📅</span>
              {dateRange === 0 ? "All time" : `Last ${dateRange} days`}
            </button>
            {showDateMenu && (
              <div className="absolute top-full left-0 mt-1 bg-[#1a1a1d] border border-gray-700 rounded-lg shadow-xl z-20 py-1 min-w-[140px]">
                {[7, 30, 60, 90, 0].map(days => (
                  <button
                    key={days}
                    onClick={() => { setDateRange(days); setShowDateMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-800 transition-all ${dateRange === days ? "text-white" : "text-gray-400"}`}
                  >
                    {days === 0 ? "All time" : `Last ${days} days`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Group by */}
          <div className="relative">
            <button
              onClick={() => { setShowGroupMenu(!showGroupMenu); setShowDateMenu(false); }}
              className="flex items-center gap-2 bg-[#1a1a1d] border border-gray-700 rounded-lg px-3 py-2 text-xs font-medium text-gray-200 hover:border-gray-600 transition-all"
            >
              {groupLabels[groupBy]}
              <span className="text-[8px] text-gray-500">▼</span>
            </button>
            {showGroupMenu && (
              <div className="absolute top-full left-0 mt-1 bg-[#1a1a1d] border border-gray-700 rounded-lg shadow-xl z-20 py-1 min-w-[140px]">
                {(Object.keys(groupLabels) as GroupBy[]).map(g => (
                  <button
                    key={g}
                    onClick={() => { setGroupBy(g); setShowGroupMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-800 transition-all ${groupBy === g ? "text-white" : "text-gray-400"}`}
                  >
                    {groupLabels[g]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-[#1a1a1d] border border-gray-700 rounded-lg px-3 py-2 text-xs font-medium text-gray-200 hover:border-gray-600 transition-all">
            <span>⊞</span> Group
          </button>
          <button className="flex items-center gap-2 bg-[#1a1a1d] border border-gray-700 rounded-lg px-3 py-2 text-xs font-medium text-gray-200 hover:border-gray-600 transition-all">
            <span>▽</span> Filters
            <span className="bg-gray-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">1</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-[#0d0d0f] z-10">
            <tr className="border-b border-gray-800">
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-200 transition-all whitespace-nowrap ${col.align === "right" ? "text-right" : "text-left"}`}
                >
                  {col.label}
                  <SortIcon col={col.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-20 text-gray-500 font-medium">
                  No ads in this date range
                </td>
              </tr>
            ) : (
              sortedRows.map((r, i) => (
                <tr
                  key={r.ad.id}
                  onClick={() => onSelectAd(r.ad)}
                  className="border-b border-gray-800/50 hover:bg-[#1a1a1d] cursor-pointer transition-all"
                >
                  <td className="px-4 py-3 text-[13px] font-medium text-gray-100 whitespace-nowrap">
                    {r.ad.imprint_number ? `C${r.ad.imprint_number} | ` : ""}{r.name}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-gray-300 whitespace-nowrap">Cycle {r.cycle}</td>
                  <td className="px-4 py-3 text-[13px] text-gray-300 whitespace-nowrap">{formatLaunchDate(r.launch)}</td>
                  <td className="px-4 py-3 text-[13px] text-gray-300 text-right">{r.ads}</td>
                  <td className="px-4 py-3 text-[13px] text-gray-300 text-right whitespace-nowrap">${r.spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-[13px] text-gray-300 text-right whitespace-nowrap">${r.cpa.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-[13px] text-gray-300 text-right">{r.purchases}</td>
                  <td className="px-4 py-3 text-[13px] text-gray-300 text-right">{r.cvr.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-[13px] text-gray-300 whitespace-nowrap">{r.persona}</td>
                  <td className="px-4 py-3 text-[13px] text-gray-300 whitespace-nowrap">{r.core_emotion}</td>
                  <td className="px-4 py-3 text-[13px] text-gray-300 whitespace-nowrap">{r.problem}</td>
                  <td className="px-4 py-3 text-[13px] text-gray-300 whitespace-nowrap">{r.awareness}</td>
                </tr>
              ))
            )}
          </tbody>
          {sortedRows.length > 0 && (
            <tfoot className="sticky bottom-0 bg-[#0d0d0f] border-t border-gray-700">
              <tr className="font-bold">
                <td className="px-4 py-3 text-[12px] text-gray-400">{totals.totalAds} Concepts</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-[12px] text-gray-300 text-right">{totals.totalAds} Ads</td>
                <td className="px-4 py-3 text-[12px] text-gray-300 text-right whitespace-nowrap">${totals.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="px-4 py-3 text-[12px] text-gray-300 text-right whitespace-nowrap">${totals.avgCpa.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="px-4 py-3 text-[12px] text-gray-300 text-right">{totals.totalPurchases}</td>
                <td className="px-4 py-3 text-[12px] text-gray-300 text-right">{totals.avgCvr.toFixed(2)}%</td>
                <td className="px-4 py-3 text-[12px] text-gray-500">{totals.uniquePersonas} Unique</td>
                <td className="px-4 py-3 text-[12px] text-gray-500">{totals.uniqueEmotions} Unique</td>
                <td className="px-4 py-3 text-[12px] text-gray-500">{totals.uniqueProblems} Unique</td>
                <td className="px-4 py-3 text-[12px] text-gray-500">{totals.uniqueAwareness} Unique</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}