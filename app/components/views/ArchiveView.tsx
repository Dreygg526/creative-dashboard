"use client";
import { useState, useMemo } from "react";
import { Ad } from "../../types";

interface Props {
  ads: Ad[];
  onSelectAd: (ad: Ad) => void;
}

function getDaysUntilDeletion(killedAt?: string): number | null {
  if (!killedAt) return null;
  const killed = new Date(killedAt);
  const deleteAt = new Date(killed.getTime() + 30 * 24 * 60 * 60 * 1000);
  const daysLeft = Math.ceil((deleteAt.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
  return daysLeft > 0 ? daysLeft : 0;
}

export default function ArchiveView({ ads, onSelectAd }: Props) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterFormat, setFilterFormat] = useState("All");
  const [filterResult, setFilterResult] = useState("All");

  const archivedAds = useMemo(() => {
    return ads
      .filter(ad => ["Winner", "Killed"].includes(ad.status))
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

  const winnerCount = ads.filter(a => a.status === "Winner").length;
  const killedCount = ads.filter(a => a.status === "Killed").length;
  const winnersCount = ads.filter(a => a.status === "Winner" && a.result === "Winner").length;
  const hitRate = winnerCount > 0 ? Math.round((winnersCount / winnerCount) * 100) : 0;

  const formats = Array.from(new Set(ads.filter(a => ["Winner", "Killed"].includes(a.status)).map(a => a.ad_format).filter(Boolean)));

  return (
    <div className="flex-1 p-6 md:p-10 overflow-y-auto max-w-[1200px] mx-auto w-full">

      <div className="mb-8">
        <h2 className="text-3xl font-black text-white mb-1">Archive</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">All Winner and killed ads</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-center">
          <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1">Total Archived</p>
          <p className="text-xl font-black text-white">{winnerCount + killedCount}</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3 text-center">
          <p className="text-[8px] font-black uppercase text-emerald-400 tracking-widest mb-1">Winner</p>
          <p className="text-xl font-black text-emerald-400">{winnerCount}</p>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl px-4 py-3 text-center">
          <p className="text-[8px] font-black uppercase text-rose-400 tracking-widest mb-1">Killed</p>
          <p className="text-xl font-black text-rose-400">{killedCount}</p>
        </div>
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl px-4 py-3 text-center">
          <p className="text-[8px] font-black uppercase text-indigo-400 tracking-widest mb-1">Hit Rate</p>
          <p className="text-xl font-black text-indigo-400">{hitRate}%</p>
        </div>
      </div>

      {killedCount > 0 && (
        <div className="bg-rose-500/10 border-2 border-rose-500/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <span className="text-xl">💀</span>
          <p className="text-sm font-bold text-rose-400">Killed ads are automatically deleted 30 days after being killed. The countdown is shown on each killed ad card.</p>
        </div>
      )}

      {/* Search + Filters */}
      <div className="bg-white/5 border border-white/10 rounded-[24px] p-5 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search by name, editor, product..."
              className="w-full border-2 border-white/10 bg-white/5 p-3 rounded-2xl text-sm font-medium outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600 text-slate-100"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div>
            <select className="w-full border-2 border-white/10 bg-[#2a2b2c] p-3 rounded-2xl text-sm font-black outline-none focus:border-indigo-500 text-slate-100" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="All">All Statuses</option>
              <option value="Winner">Winner</option>
              <option value="Killed">Killed</option>
            </select>
          </div>
          <div>
            <select className="w-full border-2 border-white/10 bg-[#2a2b2c] p-3 rounded-2xl text-sm font-black outline-none focus:border-indigo-500 text-slate-100" value={filterFormat} onChange={e => setFilterFormat(e.target.value)}>
              <option value="All">All Formats</option>
              {formats.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <select className="w-full border-2 border-white/10 bg-[#2a2b2c] p-3 rounded-2xl text-sm font-black outline-none focus:border-indigo-500 text-slate-100" value={filterResult} onChange={e => setFilterResult(e.target.value)}>
              <option value="All">All Results</option>
              <option value="Winner">Winner</option>
              <option value="Loser">Loser</option>
              <option value="Inconclusive">Inconclusive</option>
            </select>
          </div>
          {(search || filterStatus !== "All" || filterFormat !== "All" || filterResult !== "All") && (
            <button
              onClick={() => { setSearch(""); setFilterStatus("All"); setFilterFormat("All"); setFilterResult("All"); }}
              className="text-[10px] font-black text-slate-500 hover:text-rose-400 transition-colors uppercase tracking-widest"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4">
        {archivedAds.length} ads found
      </p>

      {archivedAds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-600">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-lg font-bold text-slate-400">No archived ads found</p>
          <p className="text-sm font-medium">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {archivedAds.map(ad => {
            const isWinner = ad.status === "Winner" || ad.result === "Winner";
            const isLoser = ad.result === "Loser";
            const daysUntilDeletion = ad.status === "Killed" ? getDaysUntilDeletion(ad.killed_at) : null;
            const deletingSoon = daysUntilDeletion !== null && daysUntilDeletion <= 5;

            return (
              <div
                key={ad.id}
                onClick={() => onSelectAd(ad)}
                className={`border-2 rounded-[20px] overflow-hidden cursor-pointer hover:shadow-md transition-all ${
                  deletingSoon ? "border-rose-500/40 bg-rose-500/10" :
                  isWinner ? "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40" :
                  "border-rose-500/20 bg-rose-500/5 hover:border-rose-500/40"
                }`}
              >
                {daysUntilDeletion !== null && (
                  <div className={`w-full text-center text-[9px] font-black uppercase tracking-widest py-1 ${
                    deletingSoon ? "bg-rose-600 text-white" : "bg-slate-800 text-slate-300"
                  }`}>
                    💀 Deletes in {daysUntilDeletion} day{daysUntilDeletion !== 1 ? "s" : ""}
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="font-black text-slate-100 leading-snug">{ad.concept_name}</p>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                        isWinner ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                      }`}>
                        {ad.status}
                      </span>
                      {ad.result && (
                        <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                          isWinner ? "bg-amber-500/20 text-amber-400" :
                          isLoser ? "bg-white/10 text-slate-400" :
                          "bg-white/10 text-slate-500"
                        }`}>
                          {isWinner ? "🏆 " : ""}{ad.result}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-white/10 text-slate-400 rounded-md">{ad.ad_format}</span>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-white/10 text-slate-400 rounded-md">{ad.ad_type}</span>
                    {ad.assigned_editor && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-md">
                        {ad.assigned_editor}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase">
                    <span>{ad.product}</span>
                    <span>{new Date(ad.stage_updated_at || ad.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}