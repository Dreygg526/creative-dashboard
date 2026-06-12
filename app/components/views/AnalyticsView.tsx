"use client";
import { useState, useMemo, ReactNode } from "react";
import { Ad } from "../../types";

interface Props {
  ads: Ad[];
  onSelectAd: (ad: Ad) => void;
}

type SortKey = "name" | "cycle" | "launch" | "ads" | "spend" | "cpa" | "purchases" | "cvr" | "persona" | "core_emotion" | "problem" | "awareness";
type GroupBy = "none" | "cycle" | "persona" | "core_emotion" | "problem" | "awareness";
type FilterField = "persona" | "core_emotion" | "problem" | "awareness" | "cycle" | "result";

function getCycleNumber(dateStr: string, allDates: string[]): number {
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

interface Row {
  ad: Ad;
  name: string;
  cycle: number;
  launch: string;
  ads: number;
  spend: number;
  cpa: number;
  purchases: number;
  cvr: number;
  persona: string;
  core_emotion: string;
  problem: string;
  awareness: string;
  result: string;
}

export default function AnalyticsView({ ads, onSelectAd }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("purchases");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [dateRange, setDateRange] = useState<number>(60);
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filters, setFilters] = useState<Record<FilterField, string[]>>({
    persona: [], core_emotion: [], problem: [], awareness: [], cycle: [], result: [],
  });
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const allDates = useMemo(() => ads.map(a => a.created_at), [ads]);

  // Filter by date range
  const dateFilteredAds = useMemo(() => {
    if (dateRange === 0) return ads;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - dateRange);
    return ads.filter(a => new Date(a.created_at) >= cutoff);
  }, [ads, dateRange]);

  // Build rows
  const allRows = useMemo<Row[]>(() => {
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
        result: ad.result || "—",
      };
    });
  }, [dateFilteredAds, allDates]);

  // Distinct values for each filter field (from the date-filtered set)
  const filterOptions = useMemo(() => {
    const opts: Record<FilterField, string[]> = {
      persona: [], core_emotion: [], problem: [], awareness: [], cycle: [], result: [],
    };
    const collect = (field: FilterField, val: string) => {
      if (val && val !== "—" && !opts[field].includes(val)) opts[field].push(val);
    };
    allRows.forEach(r => {
      collect("persona", r.persona);
      collect("core_emotion", r.core_emotion);
      collect("problem", r.problem);
      collect("awareness", r.awareness);
      collect("cycle", `Cycle ${r.cycle}`);
      collect("result", r.result);
    });
    (Object.keys(opts) as FilterField[]).forEach(k => opts[k].sort());
    return opts;
  }, [allRows]);

  // Apply field filters
  const rows = useMemo(() => {
    return allRows.filter(r => {
      if (filters.persona.length && !filters.persona.includes(r.persona)) return false;
      if (filters.core_emotion.length && !filters.core_emotion.includes(r.core_emotion)) return false;
      if (filters.problem.length && !filters.problem.includes(r.problem)) return false;
      if (filters.awareness.length && !filters.awareness.includes(r.awareness)) return false;
      if (filters.cycle.length && !filters.cycle.includes(`Cycle ${r.cycle}`)) return false;
      if (filters.result.length && !filters.result.includes(r.result)) return false;
      return true;
    });
  }, [allRows, filters]);

  const sortRows = (list: Row[]) => {
    return [...list].sort((a, b) => {
      let av: any = a[sortKey];
      let bv: any = b[sortKey];
      if (sortKey === "launch") { av = new Date(a.launch).getTime(); bv = new Date(b.launch).getTime(); }
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
  };

  const sortedRows = useMemo(() => sortRows(rows), [rows, sortKey, sortDir]);

  // Group rows when grouping is active
  const groupKeyFor = (r: Row): string => {
    switch (groupBy) {
      case "cycle": return `Cycle ${r.cycle}`;
      case "persona": return r.persona;
      case "core_emotion": return r.core_emotion;
      case "problem": return r.problem;
      case "awareness": return r.awareness;
      default: return "";
    }
  };

  const groups = useMemo(() => {
    if (groupBy === "none") return null;
    const map: Record<string, Row[]> = {};
    sortedRows.forEach(r => {
      const k = groupKeyFor(r) || "—";
      if (!map[k]) map[k] = [];
      map[k].push(r);
    });
    // Sort group keys: put "—" last, otherwise alpha/numeric
    const keys = Object.keys(map).sort((a, b) => {
      if (a === "—") return 1;
      if (b === "—") return -1;
      return a.localeCompare(b, undefined, { numeric: true });
    });
    return keys.map(k => {
      const groupRows = map[k];
      const spend = groupRows.reduce((s, r) => s + r.spend, 0);
      const purchases = groupRows.reduce((s, r) => s + r.purchases, 0);
      const cpa = purchases > 0 ? spend / purchases : 0;
      const cvr = groupRows.length > 0 ? groupRows.reduce((s, r) => s + r.cvr, 0) / groupRows.length : 0;
      return { key: k, rows: groupRows, spend, purchases, cpa, cvr, count: groupRows.length };
    });
  }, [sortedRows, groupBy]);

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

  const toggleFilter = (field: FilterField, value: string) => {
    setFilters(prev => {
      const cur = prev[field];
      const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
      return { ...prev, [field]: next };
    });
  };

  const clearFilters = () => setFilters({ persona: [], core_emotion: [], problem: [], awareness: [], cycle: [], result: [] });

  const activeFilterCount = (Object.values(filters) as string[][]).reduce((sum, arr) => sum + arr.length, 0);

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
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
    none: "No Grouping",
    cycle: "Cycle",
    persona: "Persona",
    core_emotion: "Core Emotion",
    problem: "Problem",
    awareness: "Awareness",
  };

  const filterFieldLabels: Record<FilterField, string> = {
    persona: "Persona",
    core_emotion: "Core Emotion",
    problem: "Problem",
    awareness: "Awareness",
    cycle: "Cycle",
    result: "Result",
  };

  const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Render a single data row (used both flat and inside groups)
  const renderRow = (r: Row) => (
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
      <td className="px-4 py-3 text-[13px] text-gray-300 text-right whitespace-nowrap">{money(r.spend)}</td>
      <td className="px-4 py-3 text-[13px] text-gray-300 text-right whitespace-nowrap">{money(r.cpa)}</td>
      <td className="px-4 py-3 text-[13px] text-gray-300 text-right">{r.purchases}</td>
      <td className="px-4 py-3 text-[13px] text-gray-300 text-right">{r.cvr.toFixed(2)}%</td>
      <td className="px-4 py-3 text-[13px] text-gray-300 whitespace-nowrap">{r.persona}</td>
      <td className="px-4 py-3 text-[13px] text-gray-300 whitespace-nowrap">{r.core_emotion}</td>
      <td className="px-4 py-3 text-[13px] text-gray-300 whitespace-nowrap">{r.problem}</td>
      <td className="px-4 py-3 text-[13px] text-gray-300 whitespace-nowrap">{r.awareness}</td>
    </tr>
  );

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
              onClick={() => { setShowDateMenu(!showDateMenu); setShowGroupMenu(false); setShowFilterMenu(false); }}
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
        </div>

        <div className="flex items-center gap-3">
          {/* Group */}
          <div className="relative">
            <button
              onClick={() => { setShowGroupMenu(!showGroupMenu); setShowDateMenu(false); setShowFilterMenu(false); }}
              className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                groupBy !== "none" ? "bg-gray-100 text-gray-900 border-gray-100" : "bg-[#1a1a1d] text-gray-200 border-gray-700 hover:border-gray-600"
              }`}
            >
              <span>⊞</span> Group{groupBy !== "none" ? `: ${groupLabels[groupBy]}` : ""}
            </button>
            {showGroupMenu && (
              <div className="absolute top-full right-0 mt-1 bg-[#1a1a1d] border border-gray-700 rounded-lg shadow-xl z-20 py-1 min-w-[160px]">
                {(Object.keys(groupLabels) as GroupBy[]).map(g => (
                  <button
                    key={g}
                    onClick={() => { setGroupBy(g); setShowGroupMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-800 transition-all ${groupBy === g ? "text-white" : "text-gray-400"}`}
                  >
                    {groupBy === g ? "✓ " : ""}{groupLabels[g]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="relative">
            <button
              onClick={() => { setShowFilterMenu(!showFilterMenu); setShowDateMenu(false); setShowGroupMenu(false); }}
              className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                activeFilterCount > 0 ? "bg-gray-100 text-gray-900 border-gray-100" : "bg-[#1a1a1d] text-gray-200 border-gray-700 hover:border-gray-600"
              }`}
            >
              <span>▽</span> Filters
              {activeFilterCount > 0 && (
                <span className="bg-gray-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">{activeFilterCount}</span>
              )}
            </button>
            {showFilterMenu && (
              <div className="absolute top-full right-0 mt-1 bg-[#1a1a1d] border border-gray-700 rounded-lg shadow-xl z-20 py-2 w-[260px] max-h-[420px] overflow-y-auto">
                <div className="flex items-center justify-between px-3 pb-2 mb-1 border-b border-gray-800">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Filters</span>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-[10px] font-black text-gray-500 hover:text-red-400 uppercase tracking-widest">Clear all</button>
                  )}
                </div>
                {(Object.keys(filterFieldLabels) as FilterField[]).map(field => (
                  filterOptions[field].length > 0 && (
                    <div key={field} className="px-3 py-1.5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">{filterFieldLabels[field]}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {filterOptions[field].map(val => {
                          const active = filters[field].includes(val);
                          return (
                            <button
                              key={val}
                              onClick={() => toggleFilter(field, val)}
                              className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                                active ? "bg-gray-100 text-gray-900 border-gray-100" : "bg-[#0d0d0f] text-gray-400 border-gray-700 hover:border-gray-500"
                              }`}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )
                ))}
                {(Object.keys(filterFieldLabels) as FilterField[]).every(f => filterOptions[f].length === 0) && (
                  <p className="px-3 py-3 text-[11px] text-gray-600 font-medium italic text-center">No taggable data yet</p>
                )}
              </div>
            )}
          </div>
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
                  {activeFilterCount > 0 ? "No ads match your filters" : "No ads in this date range"}
                </td>
              </tr>
            ) : groups ? (
              // ── GROUPED VIEW ──
              groups.map(group => {
                const collapsed = collapsedGroups[group.key];
                return (
                  <GroupBlock
                    key={group.key}
                    group={group}
                    collapsed={collapsed}
                    onToggle={() => toggleGroupCollapse(group.key)}
                    money={money}
                    renderRow={renderRow}
                    colSpan={columns.length}
                  />
                );
              })
            ) : (
              // ── FLAT VIEW ──
              sortedRows.map(renderRow)
            )}
          </tbody>
          {sortedRows.length > 0 && (
            <tfoot className="sticky bottom-0 bg-[#0d0d0f] border-t border-gray-700">
              <tr className="font-bold">
                <td className="px-4 py-3 text-[12px] text-gray-400">{totals.totalAds} Concepts</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-[12px] text-gray-300 text-right">{totals.totalAds} Ads</td>
                <td className="px-4 py-3 text-[12px] text-gray-300 text-right whitespace-nowrap">{money(totals.totalSpend)}</td>
                <td className="px-4 py-3 text-[12px] text-gray-300 text-right whitespace-nowrap">{money(totals.avgCpa)}</td>
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

// ── GROUP BLOCK: header row (with subtotals) + child rows ──
function GroupBlock({ group, collapsed, onToggle, money, renderRow, colSpan }: {
  group: { key: string; rows: Row[]; spend: number; purchases: number; cpa: number; cvr: number; count: number };
  collapsed: boolean;
  onToggle: () => void;
  money: (n: number) => string;
  renderRow: (r: Row) => ReactNode;
  colSpan: number;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="bg-[#161618] border-b border-gray-800 cursor-pointer hover:bg-[#1a1a1d] transition-all"
      >
        <td className="px-4 py-2.5 text-[12px] font-black text-gray-100 whitespace-nowrap">
          <span className="inline-block w-4 text-gray-500">{collapsed ? "▶" : "▼"}</span>
          {group.key}
          <span className="ml-2 text-[10px] font-bold text-gray-500">({group.count})</span>
        </td>
        <td className="px-4 py-2.5"></td>
        <td className="px-4 py-2.5"></td>
        <td className="px-4 py-2.5 text-[12px] font-black text-gray-300 text-right">{group.count}</td>
        <td className="px-4 py-2.5 text-[12px] font-black text-gray-300 text-right whitespace-nowrap">{money(group.spend)}</td>
        <td className="px-4 py-2.5 text-[12px] font-black text-gray-300 text-right whitespace-nowrap">{money(group.cpa)}</td>
        <td className="px-4 py-2.5 text-[12px] font-black text-gray-300 text-right">{group.purchases}</td>
        <td className="px-4 py-2.5 text-[12px] font-black text-gray-300 text-right">{group.cvr.toFixed(2)}%</td>
        <td className="px-4 py-2.5" colSpan={4}></td>
      </tr>
      {!collapsed && group.rows.map(renderRow)}
    </>
  );
}