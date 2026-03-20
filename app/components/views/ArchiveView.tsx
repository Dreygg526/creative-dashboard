"use client";
import { useState, useMemo } from "react";
import { Ad } from "../../types";

interface Props {
  ads: Ad[];
  onSelectAd: (ad: Ad) => void;
}

export default function ArchiveView({ ads, onSelectAd }: Props) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterFormat, setFilterFormat] = useState("All");
  const [filterResult, setFilterResult] = useState("All");

  const archivedAds = useMemo(() => {
    return ads
      .filter(ad => ["Completed", "Killed"].includes(ad.status))
      .filter(ad => {
        const matchSearch = !search.trim() ||
          ad.concept_name.toLowerCase().includes(search.toLowerCase()) ||
          (ad.assigned_editor || "").toLowerCase().includes(search.toLowerCase()) ||
          (ad.product || "").toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === "All" || ad.status === filterStatus;
        const matchFormat = filterFormat === "All" || ad.ad_format === filterFormat;
        const matchResult = filterResult === "All" || ad.result === filterResult;
        return matchSearch && matchStatus && matchFormat && matchResult;
      })
      .sort((a, b) => new Date(b.stage_updated_at || b.created_at).getTime() - new Date(a.stage_updated_at || a.created_at).getTime());
  }, [ads, search, filterStatus, filterFormat, filterResult]);

  const completedCount = ads.filter(a => a.status === "Completed").length;
  const killedCount = ads.filter(a => a.status === "Killed").length;
  const winnersCount = ads.filter(a => a.status === "Completed" && a.result === "Winner").length;
  const hitRate = completedCount > 0 ? Math.round((winnersCount / completedCount) * 100) : 0;

  const formats = Array.from(new Set(ads.filter(a => ["Completed", "Killed"].includes(a.status)).map(a => a.ad_format).filter(Boolean)));

  return (
    <div className="flex-1 p-6 md:p-10 overflow-y-auto max-w-[1200px] mx-auto w-full">

      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-800 mb-1">Archive</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">
          All completed and killed ads
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-center shadow-sm">
          <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Archived</p>
          <p className="text-xl font-black text-slate-800">{completedCount + killedCount}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-center shadow-sm">
          <p className="text-[8px] font-black uppercase text-emerald-500 tracking-widest mb-1">Completed</p>
          <p className="text-xl font-black text-emerald-600">{completedCount}</p>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 text-center shadow-sm">
          <p className="text-[8px] font-black uppercase text-rose-500 tracking-widest mb-1">Killed</p>
          <p className="text-xl font-black text-rose-600">{killedCount}</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3 text-center shadow-sm">
          <p className="text-[8px] font-black uppercase text-indigo-500 tracking-widest mb-1">Hit Rate</p>
          <p className="text-xl font-black text-indigo-600">{hitRate}%</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-white border-2 border-slate-100 rounded-[24px] p-5 mb-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search by name, editor, product..."
              className="w-full border-2 border-slate-100 bg-slate-50 p-3 rounded-2xl text-sm font-medium outline-none focus:border-indigo-400 transition-all placeholder:text-slate-300 text-slate-900"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div>
            <select
              className="w-full border-2 border-slate-100 bg-slate-50 p-3 rounded-2xl text-sm font-black outline-none focus:border-indigo-400"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Killed">Killed</option>
            </select>
          </div>
          <div>
            <select
              className="w-full border-2 border-slate-100 bg-slate-50 p-3 rounded-2xl text-sm font-black outline-none focus:border-indigo-400"
              value={filterFormat}
              onChange={e => setFilterFormat(e.target.value)}
            >
              <option value="All">All Formats</option>
              {formats.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <select
              className="w-full border-2 border-slate-100 bg-slate-50 p-3 rounded-2xl text-sm font-black outline-none focus:border-indigo-400"
              value={filterResult}
              onChange={e => setFilterResult(e.target.value)}
            >
              <option value="All">All Results</option>
              <option value="Winner">Winner</option>
              <option value="Loser">Loser</option>
              <option value="Inconclusive">Inconclusive</option>
            </select>
          </div>
          {(search || filterStatus !== "All" || filterFormat !== "All" || filterResult !== "All") && (
            <button
              onClick={() => { setSearch(""); setFilterStatus("All"); setFilterFormat("All"); setFilterResult("All"); }}
              className="text-[10px] font-black text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-widest"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">
        {archivedAds.length} ads found
      </p>

      {/* Archive List */}
      {archivedAds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-300">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-lg font-bold">No archived ads found</p>
          <p className="text-sm font-medium">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {archivedAds.map(ad => {
            const isCompleted = ad.status === "Completed";
            const isWinner = ad.result === "Winner";
            const isLoser = ad.result === "Loser";
            return (
              <div
                key={ad.id}
                onClick={() => onSelectAd(ad)}
                className={`bg-white border-2 rounded-[20px] p-5 cursor-pointer hover:shadow-md transition-all ${
                  isCompleted ? "border-emerald-100 hover:border-emerald-200" : "border-rose-100 hover:border-rose-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="font-black text-slate-800 leading-snug">{ad.concept_name}</p>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                      isCompleted ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                    }`}>
                      {ad.status}
                    </span>
                    {ad.result && (
                      <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                        isWinner ? "bg-amber-100 text-amber-600" :
                        isLoser ? "bg-slate-100 text-slate-500" :
                        "bg-slate-100 text-slate-400"
                      }`}>
                        {isWinner ? "🏆 " : ""}{ad.result}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">{ad.ad_format}</span>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">{ad.ad_type}</span>
                  {ad.assigned_editor && (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md">
                      {ad.assigned_editor}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase">
                  <span>{ad.product}</span>
                  <span>{new Date(ad.stage_updated_at || ad.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}