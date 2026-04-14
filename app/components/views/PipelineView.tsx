"use client";
import { useState, useMemo } from "react";
import { Ad } from "../../types";
import { STAGES } from "../../constants";
import { getCardColor, getPriorityBadge, getDaysLeftInTesting } from "../../utils/helpers";

interface Props {
  ads: Ad[];
  activeStage: string;
  setActiveStage: (s: string) => void;
  setSelectedAd: (ad: Ad) => void;
  currentRole: string;
  currentUser: string;
  allEditors?: string[];
  allStrategists?: string[];
  onBulkReassign?: (adIds: string[], editor: string) => void;
  onBulkPriority?: (adIds: string[], priority: string) => void;
  onBulkKill?: (adIds: string[]) => void;
  onBulkMove?: (adIds: string[], status: string) => void;
  onBulkDelete?: (adIds: string[]) => void;
  activeSessions?: Record<string, { sessionId: string; elapsedSeconds: number; startedAt: string }>;
  formatTimer?: (seconds: number) => string;
}

function isOverdue(dateStr?: string) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function formatDueDate(dateStr?: string) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getDaysUntilDeletion(killedAt?: string): number | null {
  if (!killedAt) return null;
  const killed = new Date(killedAt);
  const deleteAt = new Date(killed.getTime() + 30 * 24 * 60 * 60 * 1000);
  const daysLeft = Math.ceil((deleteAt.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
  return daysLeft > 0 ? daysLeft : 0;
}

function isMyAd(ad: Ad, currentRole: string, currentUser: string): boolean {
  if (currentRole === "Founder") return false;
  if (currentRole === "Strategist") return ad.assigned_copywriter === currentUser;
  if (currentRole === "Editor" || currentRole === "Graphic Designer") return ad.assigned_editor === currentUser;
  if (currentRole === "VA") return ad.status === "Pending Upload";
  if (currentRole === "Content Coordinator") return ["Preparing Content", "Content Revision Required"].includes(ad.status);
  return false;
}

export default function PipelineView({
  ads, activeStage, setActiveStage, setSelectedAd,
  currentRole, currentUser, allEditors = [], allStrategists = [],
  onBulkReassign, onBulkPriority, onBulkKill, onBulkMove, onBulkDelete,
  activeSessions, formatTimer
}: Props) {
  const isFounder = currentRole === "Founder";
  const isStrategist = currentRole === "Strategist";

  const [search, setSearch] = useState("");
  const [filterEditor, setFilterEditor] = useState("All");
  const [filterStrategist, setFilterStrategist] = useState("All");
  const [filterProduct, setFilterProduct] = useState("All");
  const [filterFormat, setFilterFormat] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterAdType, setFilterAdType] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [bulkEditor, setBulkEditor] = useState("");
  const [bulkPriority, setBulkPriority] = useState("High");
  const [bulkStatus, setBulkStatus] = useState("");

  const editors = useMemo(() => {
    const all = ads.map(a => a.assigned_editor).filter(Boolean) as string[];
    return Array.from(new Set([...all, ...allEditors])).sort();
  }, [ads, allEditors]);

  const strategists = useMemo(() => {
    const all = ads.map(a => a.assigned_copywriter).filter(Boolean) as string[];
    return Array.from(new Set([...all, ...allStrategists])).sort();
  }, [ads, allStrategists]);

  const formats = useMemo(() => {
    const all = ads.map(a => a.ad_format).filter(Boolean) as string[];
    return Array.from(new Set(all)).sort();
  }, [ads]);

  const products = useMemo(() => {
    const all = ads.map(a => a.product).filter(Boolean) as string[];
    return Array.from(new Set(all)).sort();
  }, [ads]);

  const hasActiveFilters = !!(search || filterEditor !== "All" || filterStrategist !== "All" || filterProduct !== "All" || filterFormat !== "All" || filterPriority !== "All" || filterAdType !== "All");

  const clearFilters = () => {
    setSearch("");
    setFilterEditor("All");
    setFilterStrategist("All");
    setFilterProduct("All");
    setFilterFormat("All");
    setFilterPriority("All");
    setFilterAdType("All");
  };

  const filteredAds = useMemo(() => {
    return ads.filter(ad => {
      if (ad.status !== activeStage) return false;
      if (search.trim()) {
        const q = search.toLowerCase().replace(/^#/, "").replace(/^dtc\s*/i, "");
        const imprintStr = ad.imprint_number ? String(ad.imprint_number).padStart(4, "0") : "";
        const imprintMatch = imprintStr.includes(q) || String(ad.imprint_number || "").includes(q);
        if (
          !imprintMatch &&
          !ad.concept_name.toLowerCase().includes(q) &&
          !(ad.product || "").toLowerCase().includes(q) &&
          !(ad.assigned_editor || "").toLowerCase().includes(q) &&
          !(ad.assigned_copywriter || "").toLowerCase().includes(q)
        ) return false;
      }
      if (filterEditor !== "All" && ad.assigned_editor !== filterEditor) return false;
      if (filterStrategist !== "All" && ad.assigned_copywriter !== filterStrategist) return false;
      if (filterProduct !== "All" && ad.product !== filterProduct) return false;
      if (filterFormat !== "All" && ad.ad_format !== filterFormat) return false;
      if (filterPriority !== "All" && ad.priority !== filterPriority) return false;
      if (filterAdType !== "All" && ad.ad_type !== filterAdType) return false;
      return true;
    });
  }, [ads, activeStage, search, filterEditor, filterStrategist, filterProduct, filterFormat, filterPriority, filterAdType]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAds.map(a => a.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setBulkAction("");
  };

  const executeBulkAction = () => {
    const ids = Array.from(selectedIds);
    if (bulkAction === "reassign" && bulkEditor) {
      onBulkReassign?.(ids, bulkEditor);
    } else if (bulkAction === "priority") {
      onBulkPriority?.(ids, bulkPriority);
    } else if (bulkAction === "kill") {
      if (confirm(`Kill ${ids.length} ads? They will be permanently deleted after 30 days.`)) {
        onBulkKill?.(ids);
      }
    } else if (bulkAction === "move" && bulkStatus) {
      onBulkMove?.(ids, bulkStatus);
    } else if (bulkAction === "delete") {
      if (confirm(`Permanently delete ${ids.length} ad${ids.length > 1 ? "s" : ""}? This cannot be undone.`)) {
        onBulkDelete?.(ids);
      }
    }
    clearSelection();
  };

  const nextStages = useMemo(() => {
    const stages = [
      "Idea", "Writing Brief", "Brief Revision Required", "Brief Approved",
      "Editor Assigned", "In Progress", "Ad Revision",
      "Pending Upload", "Testing", "Winner", "Killed"
    ];
    return stages.filter(s => s !== activeStage);
  }, [activeStage]);

  const filterSelectClass = "w-full border-2 border-white/10 bg-[#2a2b2c] p-2.5 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 text-slate-100";

  return (
    <>
      {/* Stage tabs */}
      <div className="bg-[#1e1f20] border-b border-white/10 p-3 flex justify-center flex-wrap gap-2 overflow-x-auto">
        {STAGES.map(stage => {
          const isArchived = ["Winner", "Killed"].includes(stage);
          const stageCount = ads.filter(ad => ad.status === stage).length;
          return (
            <button
              key={stage}
              onClick={() => { setActiveStage(stage); setSelectedIds(new Set()); clearSelection(); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-tight transition-all
                ${activeStage === stage
                  ? "bg-indigo-500 text-white shadow-md"
                  : isArchived
                  ? "bg-white/5 text-slate-600 border border-white/5 italic"
                  : "bg-white/5 text-slate-400 border border-white/10 hover:text-slate-200"
                }`}
            >
              {stage}
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${
                activeStage === stage ? "bg-indigo-600 text-white"
                : isArchived ? "bg-white/5 text-slate-600"
                : "bg-white/10 text-slate-400"
              }`}>
                {stageCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + Filter Bar */}
      <div className="bg-[#1e1f20] border-b border-white/10 px-4 py-3">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, product, editor, strategist..."
                className="w-full pl-9 pr-4 py-2.5 border-2 border-white/10 bg-white/5 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600 text-slate-100"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest border-2 transition-all ${
                showFilters || hasActiveFilters
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white/5 text-slate-400 border-white/10 hover:border-white/20"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              Filters
              {hasActiveFilters && <span className="bg-white text-indigo-600 text-[9px] font-black px-1.5 py-0.5 rounded-full">ON</span>}
            </button>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-[10px] font-black text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-widest">
                Clear
              </button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Editor</label>
                <select className={filterSelectClass} value={filterEditor} onChange={e => setFilterEditor(e.target.value)}>
                  <option value="All">All Editors</option>
                  {editors.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Strategist</label>
                <select className={filterSelectClass} value={filterStrategist} onChange={e => setFilterStrategist(e.target.value)}>
                  <option value="All">All Strategists</option>
                  {strategists.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Product</label>
                <select className={filterSelectClass} value={filterProduct} onChange={e => setFilterProduct(e.target.value)}>
                  <option value="All">All Products</option>
                  {products.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Format</label>
                <select className={filterSelectClass} value={filterFormat} onChange={e => setFilterFormat(e.target.value)}>
                  <option value="All">All Formats</option>
                  {formats.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Priority</label>
                <select className={filterSelectClass} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                  <option value="All">All Priorities</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ad Type</label>
                <select className={filterSelectClass} value={filterAdType} onChange={e => setFilterAdType(e.target.value)}>
                  <option value="All">All Types</option>
                  <option value="New Concept">New Concept</option>
                  <option value="Iteration">Iteration</option>
                  <option value="Ideation">Ideation</option>
                  <option value="Imitation">Imitation</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto max-w-[1200px] mx-auto w-full pb-32">

        {activeStage === "Winner" && (
          <div className="bg-white/5 border-2 border-white/10 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <span className="text-xl">📦</span>
            <p className="text-sm font-bold text-slate-400">These ads are archived. View the full Archive section for search and filters.</p>
          </div>
        )}

        {activeStage === "Killed" && (
          <div className="bg-rose-500/10 border-2 border-rose-500/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <span className="text-xl">💀</span>
            <p className="text-sm font-bold text-rose-400">Killed ads are permanently deleted after 30 days.</p>
          </div>
        )}

        {isFounder && filteredAds.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              checked={selectedIds.size === filteredAds.length && filteredAds.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
            />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select All"}
            </span>
            {selectedIds.size > 0 && (
              <button onClick={clearSelection} className="text-[10px] font-black text-rose-400 hover:text-rose-600 uppercase tracking-widest">
                Clear
              </button>
            )}
          </div>
        )}

        {hasActiveFilters && (
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">
            {filteredAds.length} result{filteredAds.length !== 1 ? "s" : ""} found
          </p>
        )}

        {filteredAds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300 opacity-60">
            <div className="text-6xl mb-4">{hasActiveFilters ? "🔍" : "📭"}</div>
            <p className="text-lg font-bold">
              {hasActiveFilters ? "No ads match your filters" : `No ads currently in ${activeStage}`}
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-3 text-sm font-black text-indigo-500 hover:text-indigo-700">Clear filters</button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredAds.map(ad => {
              const daysInStage = Math.floor((new Date().getTime() - new Date(ad.stage_updated_at || ad.created_at).getTime()) / (1000 * 3600 * 24));
              const testingDaysLeft = getDaysLeftInTesting(ad.live_date);
              const isStale = daysInStage >= 5 && !["Testing", "Winner", "Killed"].includes(ad.status);
              const overdue = isOverdue(ad.due_date) && !["Winner", "Killed"].includes(ad.status);
              const dueDate = formatDueDate(ad.due_date);
              const isSelected = selectedIds.has(ad.id);
              const daysUntilDeletion = ad.status === "Killed" ? getDaysUntilDeletion(ad.killed_at) : null;
              const myTask = isMyAd(ad, currentRole, currentUser);
              const session = activeSessions?.[ad.id];
              const isKilled = ad.status === "Killed";

              return (
                <div
                  key={ad.id}
                  onClick={() => { if (!isSelected) setSelectedAd(ad); }}
                  className={`p-6 rounded-[24px] border-2 shadow-sm transition-all relative overflow-hidden cursor-pointer hover:scale-[1.01] hover:shadow-lg ${
                    isSelected ? "border-indigo-400 ring-2 ring-indigo-500/20 bg-indigo-500/10" :
                    session ? "border-indigo-500/40 bg-indigo-500/10" :
                    overdue ? "border-rose-500/40 bg-rose-500/10" :
                    "border-white/10 bg-white/5 hover:border-indigo-500/30 hover:bg-white/8"
                  }`}
                >
                  {isFounder && (
                    <div
                      className="absolute top-3 left-3 z-10"
                      onClick={e => { e.stopPropagation(); toggleSelect(ad.id); }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(ad.id)}
                        className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  )}

                  {overdue && (
                    <div className="absolute top-0 left-0 right-0 bg-rose-500 text-white text-[9px] font-black uppercase tracking-widest text-center py-1">
                      ⚠️ Overdue — Due {dueDate}
                    </div>
                  )}

                  {isKilled && daysUntilDeletion !== null && (
                    <div className={`absolute top-0 left-0 right-0 text-white text-[9px] font-black uppercase tracking-widest text-center py-1 ${
                      daysUntilDeletion <= 5 ? "bg-rose-600" : "bg-slate-700"
                    }`}>
                      💀 Deletes in {daysUntilDeletion} day{daysUntilDeletion !== 1 ? "s" : ""}
                    </div>
                  )}

                  {/* Priority badge */}
                  <div className={`absolute top-0 right-0 px-3 py-1 text-[9px] font-black uppercase rounded-bl-xl ${
                    ad.priority === "High" ? "priority-high" :
                    ad.priority === "Medium" ? "priority-medium" :
                    "priority-low"
                  }`}>
                    {ad.priority}
                  </div>

                  <div className="w-full">
                    <div className={`flex items-baseline gap-3 mb-3 ${overdue || isKilled ? "mt-6" : isFounder ? "mt-2 ml-6" : "mt-2"}`}>
                      {ad.imprint_number && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-sm font-black font-mono text-amber-400 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded-md">
                            DTC #{String(ad.imprint_number).padStart(4, "0")}
                          </span>
                          {isKilled && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              KILLED
                            </span>
                          )}
                        </div>
                      )}
                      <p className="font-black text-lg text-slate-100 leading-snug">
                        {ad.concept_name}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="text-[10px] font-black px-2 py-0.5 bg-white/10 text-slate-400 border border-white/10 rounded-md uppercase">{ad.ad_type}</span>
                      <span className="text-[10px] font-black px-2 py-0.5 bg-white/10 text-slate-400 border border-white/10 rounded-md uppercase">{ad.ad_format}</span>
                      {ad.assigned_editor && (
                        <span className="text-[10px] font-black px-2 py-0.5 bg-white/10 text-slate-400 border border-white/10 rounded-md uppercase">
                          ✂️ {ad.assigned_editor}
                        </span>
                      )}
                      {ad.assigned_copywriter && (
                        <span className="text-[10px] font-black px-2 py-0.5 bg-white/10 text-slate-400 border border-white/10 rounded-md uppercase">
                          ✍️ {ad.assigned_copywriter}
                        </span>
                      )}
                      {ad.product && (
                        <span className="text-[10px] font-black px-2 py-0.5 bg-white/10 text-slate-400 border border-white/10 rounded-md uppercase">
                          📦 {ad.product}
                        </span>
                      )}
                    </div>

                    {ad.due_date && !overdue && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          📅 Due {formatDueDate(ad.due_date)}
                        </span>
                      </div>
                    )}

                    {ad.status === "Testing" && testingDaysLeft !== null && (
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest mb-3 ${
                        testingDaysLeft <= 2 ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        🧪 {testingDaysLeft > 0 ? `${testingDaysLeft}d left in testing` : "Testing complete"}
                      </div>
                    )}

                    {isStale && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest mb-3 bg-amber-500/20 text-amber-400">
                        ⏳ {daysInStage}d in this stage
                      </div>
                    )}

                    {(ad.revision_count ?? 0) > 0 && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest mb-3 bg-white/10 text-slate-400 ml-2">
                        🔄 {ad.revision_count} revision{(ad.revision_count ?? 0) !== 1 ? "s" : ""}
                      </div>
                    )}

                    {ad.review_link && (
                      <div className="mt-2 mb-2">
                        <a
                          href={ad.review_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-black text-indigo-500 hover:text-indigo-700 transition-colors uppercase tracking-widest"
                          onClick={e => e.stopPropagation()}
                        >
                          View Review File ↗
                        </a>
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase ${isStale ? "text-rose-600 font-black" : "text-slate-400"}`}>
                        ⏱️ {daysInStage}d in stage
                      </span>
                      {myTask && session && formatTimer && (
                        <div className="flex items-center gap-1.5 bg-indigo-600 text-white px-2.5 py-1 rounded-lg">
                          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Active</span>
                          <span className="font-black text-xs font-mono">{formatTimer(session.elapsedSeconds)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bulk Actions Bar — Founder only */}
        {isFounder && selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-4 z-50 border border-slate-700">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-300">
              {selectedIds.size} selected
            </span>
            <div className="w-px h-5 bg-slate-700" />
            <select
              value={bulkAction}
              onChange={e => setBulkAction(e.target.value)}
              className="bg-slate-800 border border-slate-600 text-white text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-indigo-400"
            >
              <option value="">Choose action...</option>
              <option value="reassign">Reassign Editor</option>
              <option value="priority">Set Priority</option>
              <option value="move">Move Stage</option>
              <option value="kill">Kill Ads</option>
              <option value="delete">Delete Permanently</option>
            </select>
            {bulkAction === "reassign" && (
              <select value={bulkEditor} onChange={e => setBulkEditor(e.target.value)} className="bg-slate-800 border border-slate-600 text-white text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-indigo-400">
                <option value="">Select editor...</option>
                {editors.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            )}
            {bulkAction === "priority" && (
              <select value={bulkPriority} onChange={e => setBulkPriority(e.target.value)} className="bg-slate-800 border border-slate-600 text-white text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-indigo-400">
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            )}
            {bulkAction === "move" && (
              <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} className="bg-slate-800 border border-slate-600 text-white text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-indigo-400">
                <option value="">Select stage...</option>
                {nextStages.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <button onClick={executeBulkAction} disabled={!bulkAction} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all">
              Apply
            </button>
            <button onClick={clearSelection} className="text-slate-400 hover:text-white text-xs font-black uppercase tracking-widest transition-colors">
              Cancel
            </button>
          </div>
        )}
      </div>
    </>
  );
}