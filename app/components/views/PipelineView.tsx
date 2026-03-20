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
}

function isOverdue(dateStr?: string) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function formatDueDate(dateStr?: string) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function PipelineView({ ads, activeStage, setActiveStage, setSelectedAd, currentRole, currentUser }: Props) {
  const isFounder = currentRole === "Founder";
  const isStrategist = currentRole === "Strategist";

  const [search, setSearch] = useState("");
  const [filterEditor, setFilterEditor] = useState("All");
  const [filterFormat, setFilterFormat] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterAdType, setFilterAdType] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  const editors = useMemo(() => {
    const all = ads.map(a => a.assigned_editor).filter(Boolean) as string[];
    return Array.from(new Set(all)).sort();
  }, [ads]);

  const formats = useMemo(() => {
    const all = ads.map(a => a.ad_format).filter(Boolean) as string[];
    return Array.from(new Set(all)).sort();
  }, [ads]);

  const hasActiveFilters = search || filterEditor !== "All" || filterFormat !== "All" || filterPriority !== "All" || filterAdType !== "All";

  const clearFilters = () => {
    setSearch("");
    setFilterEditor("All");
    setFilterFormat("All");
    setFilterPriority("All");
    setFilterAdType("All");
  };

  const filteredAds = useMemo(() => {
    return ads.filter(ad => {
      if (ad.status !== activeStage) return false;
      if (search.trim() &&
        !ad.concept_name.toLowerCase().includes(search.toLowerCase()) &&
        !(ad.product || "").toLowerCase().includes(search.toLowerCase()) &&
        !(ad.assigned_editor || "").toLowerCase().includes(search.toLowerCase())) return false;
      if (filterEditor !== "All" && ad.assigned_editor !== filterEditor) return false;
      if (filterFormat !== "All" && ad.ad_format !== filterFormat) return false;
      if (filterPriority !== "All" && ad.priority !== filterPriority) return false;
      if (filterAdType !== "All" && ad.ad_type !== filterAdType) return false;
      return true;
    });
  }, [ads, activeStage, search, filterEditor, filterFormat, filterPriority, filterAdType]);

  const canClickAd = (ad: Ad) => {
    if (isFounder) return true;
    if (isStrategist) {
      return ad.assigned_copywriter === currentUser ||
        ["Ad Revision", "Testing", "Writing Brief", "Brief Revision Required"].includes(ad.status);
    }
    return false;
  };

  return (
    <>
      {/* Stage tabs */}
      <div className="bg-white border-b border-slate-200 p-3 flex justify-center flex-wrap gap-2 overflow-x-auto">
        {STAGES.map(stage => {
          const isArchived = ["Completed", "Killed"].includes(stage);
          const stageCount = ads.filter(ad => ad.status === stage).length;
          return (
            <button
              key={stage}
              onClick={() => setActiveStage(stage)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-tight transition-all
                ${activeStage === stage
                  ? "bg-slate-800 text-white shadow-md"
                  : isArchived
                  ? "bg-slate-50 text-slate-300 border border-slate-100 italic"
                  : "bg-slate-100 text-slate-500 border border-slate-200"
                }`}
            >
              {stage}
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${
                activeStage === stage ? "bg-slate-700 text-white"
                : isArchived ? "bg-slate-100 text-slate-300"
                : "bg-white text-slate-400"
              }`}>
                {stageCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + Filter Bar */}
      <div className="bg-white border-b border-slate-100 px-4 py-3">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search ads by name, product, editor..."
                className="w-full pl-9 pr-4 py-2.5 border-2 border-slate-100 bg-slate-50 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 transition-all placeholder:text-slate-300 text-slate-900"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest border-2 transition-all ${
                showFilters || hasActiveFilters
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              Filters
              {hasActiveFilters && (
                <span className="bg-white text-indigo-600 text-[9px] font-black px-1.5 py-0.5 rounded-full">ON</span>
              )}
            </button>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-[10px] font-black text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-widest">
                Clear
              </button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Editor</label>
                <select className="w-full border-2 border-slate-100 bg-slate-50 p-2.5 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 text-slate-900" value={filterEditor} onChange={e => setFilterEditor(e.target.value)}>
                  <option value="All">All Editors</option>
                  {editors.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Format</label>
                <select className="w-full border-2 border-slate-100 bg-slate-50 p-2.5 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 text-slate-900" value={filterFormat} onChange={e => setFilterFormat(e.target.value)}>
                  <option value="All">All Formats</option>
                  {formats.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Priority</label>
                <select className="w-full border-2 border-slate-100 bg-slate-50 p-2.5 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 text-slate-900" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                  <option value="All">All Priorities</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ad Type</label>
                <select className="w-full border-2 border-slate-100 bg-slate-50 p-2.5 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 text-slate-900" value={filterAdType} onChange={e => setFilterAdType(e.target.value)}>
                  <option value="All">All Types</option>
                  <option value="New Concept">New Concept</option>
                  <option value="Iteration">Iteration</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto max-w-[1200px] mx-auto w-full">
        {["Completed", "Killed"].includes(activeStage) && (
          <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <span className="text-xl">📦</span>
            <p className="text-sm font-bold text-slate-500">
              These ads are archived. View the full Archive section for search and filters.
            </p>
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
              <button onClick={clearFilters} className="mt-3 text-sm font-black text-indigo-500 hover:text-indigo-700">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredAds.map(ad => {
              const daysInStage = Math.floor((new Date().getTime() - new Date(ad.stage_updated_at || ad.created_at).getTime()) / (1000 * 3600 * 24));
              const testingDaysLeft = getDaysLeftInTesting(ad.live_date);
              const isTestingLocked = ad.status === "Testing" && testingDaysLeft > 0;
              const isStale = daysInStage >= 5 && !["Testing", "Completed", "Killed"].includes(ad.status);
              const clickable = canClickAd(ad);
              const overdue = isOverdue(ad.due_date) && !["Completed", "Killed"].includes(ad.status);
              const dueDate = formatDueDate(ad.due_date);

              return (
                <div
                  key={ad.id}
                  onClick={() => clickable && setSelectedAd(ad)}
                  className={`p-6 rounded-[24px] border-2 shadow-sm transition-all relative overflow-hidden ${
                    overdue ? "border-rose-300 bg-rose-50/30" : getCardColor(ad.status)
                  } ${clickable ? "cursor-pointer hover:scale-[1.01] hover:shadow-lg" : "cursor-default opacity-75"}`}
                >
                  {!clickable && (
                    <div className="absolute top-2 left-2 text-[8px] font-black uppercase px-2 py-0.5 bg-slate-200 text-slate-500 rounded-full tracking-widest">
                      Read Only
                    </div>
                  )}

                  {/* Overdue banner */}
                  {overdue && (
                    <div className="absolute top-0 left-0 right-0 bg-rose-500 text-white text-[9px] font-black uppercase tracking-widest text-center py-1">
                      ⚠️ Overdue — Due {dueDate}
                    </div>
                  )}

                  <div className={`absolute top-0 right-0 px-3 py-1 text-[9px] font-black uppercase rounded-bl-xl ${getPriorityBadge(ad.priority)}`}>
                    {ad.priority}
                  </div>

                  <p className={`font-black text-lg mb-3 text-slate-800 leading-snug ${overdue ? "mt-6" : "mt-2"}`}>
                    {ad.concept_name}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-[10px] font-black px-2 py-0.5 bg-white/60 text-slate-500 border border-slate-200 rounded-md uppercase">{ad.ad_type}</span>
                    <span className="text-[10px] font-black px-2 py-0.5 bg-white/60 text-slate-500 border border-slate-200 rounded-md uppercase">{ad.ad_format}</span>
                    {ad.assigned_editor && (
                      <span className="text-[10px] font-black px-2 py-0.5 bg-white/60 text-slate-500 border border-slate-200 rounded-md uppercase">
                        ✂️ {ad.assigned_editor}
                      </span>
                    )}
                    {dueDate && !overdue && (
                      <span className="text-[10px] font-black px-2 py-0.5 bg-white/60 text-slate-500 border border-slate-200 rounded-md uppercase">
                        📅 {dueDate}
                      </span>
                    )}
                  </div>

                  {isTestingLocked && (
                    <div className="mb-4 bg-indigo-600 text-white px-3 py-1.5 rounded-xl flex items-center gap-2 w-fit">
                      <span className="text-xs">⏱️</span>
                      <span className="text-[10px] font-black uppercase tracking-widest">Unlocks in {testingDaysLeft} Days</span>
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-slate-900/5 flex justify-between items-center text-[10px] font-bold uppercase">
                    <span className={`${isStale ? "text-rose-600 animate-pulse font-black" : "text-slate-400"}`}>
                      ⏱️ {daysInStage} Days In Stage
                    </span>
                    {ad.status === "Ad Revision" && (
                      <span className="text-rose-600 font-black">Round {ad.revision_count || 1}/2</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}