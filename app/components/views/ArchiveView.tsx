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

  const selectClass = "w-full border border-gray-200 bg-white p-3 rounded-xl text-sm font-black outline-none focus:border-green-500 text-gray-700";

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[1200px] mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-900">Archive</h2>
        <p className="text-gray-400 text-sm font-medium mt-0.5">All Winner and killed ads</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 text-center shadow-sm">
          <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-1">Total Archived</p>
          <p className="text-xl font-black text-gray-800">{winnerCount + killedCount}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-center shadow-sm">
          <p className="text-[8px] font-black uppercase text-green-600 tracking-widest mb-1">Winner</p>
          <p className="text-xl font-black text-green-700">{winnerCount}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-center shadow-sm">
          <p className="text-[8px] font-black uppercase text-red-500 tracking-widest mb-1">Killed</p>
          <p className="text-xl font-black text-red-600">{killedCount}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 text-center shadow-sm">
          <p className="text-[8px] font-black uppercase text-blue-500 tracking-widest mb-1">Hit Rate</p>
          <p className="text-xl font-black text-blue-600">{hitRate}%</p>
        </div>
      </div>

      {killedCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <span className="text-xl">💀</span>
          <p className="text-sm font-bold text-red-600">Killed ads are automatically deleted 30 days after being killed.</p>
        </div>
      )}

      {/* Search + Filters */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search by name, editor, product..."
              className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm font-medium outline-none focus:border-green-500 transition-all placeholder:text-gray-300 text-gray-800"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div>
            <select className={selectClass} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="All">All Statuses</option>
              <option value="Winner">Winner</option>
              <option value="Killed">Killed</option>
            </select>
          </div>
          <div>
            <select className={selectClass} value={filterFormat} onChange={e => setFilterFormat(e.target.value)}>
              <option value="All">All Formats</option>
              {formats.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <select className={selectClass} value={filterResult} onChange={e => setFilterResult(e.target.value)}>
              <option value="All">All Results</option>
              <option value="Winner">Winner</option>
              <option value="Loser">Loser</option>
              <option value="Inconclusive">Inconclusive</option>
            </select>
          </div>
          {(search || filterStatus !== "All" || filterFormat !== "All" || filterResult !== "All") && (
            <button onClick={() => { setSearch(""); setFilterStatus("All"); setFilterFormat("All"); setFilterResult("All"); }} className="text-[10px] font-black text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest">
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">{archivedAds.length} ads found</p>

      {archivedAds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-300">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-lg font-bold text-gray-400">No archived ads found</p>
          <p className="text-sm font-medium text-gray-300">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {archivedAds.map(ad => {
            const isWinner = ad.status === "Winner" || ad.result === "Winner";
            const isLoser = ad.result === "Loser";
            const daysUntilDeletion = ad.status === "Killed" ? getDaysUntilDeletion(ad.killed_at) : null;
            const deletingSoon = daysUntilDeletion !== null && daysUntilDeletion <= 5;

            return (
              <div
                key={ad.id}
                onClick={() => onSelectAd(ad)}
                className={`bg-white border rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-all ${
                  deletingSoon ? "border-red-300" :
                  isWinner ? "border-green-200 hover:border-green-300" :
                  "border-red-100 hover:border-red-200"
                }`}
              >
                {daysUntilDeletion !== null && (
                  <div className={`w-full text-center text-[9px] font-black uppercase tracking-widest py-1 ${deletingSoon ? "bg-red-600 text-white" : "bg-gray-600 text-white"}`}>
                    💀 Deletes in {daysUntilDeletion} day{daysUntilDeletion !== 1 ? "s" : ""}
                  </div>
                )}
                <div className={`h-1 ${isWinner ? "bg-green-400" : "bg-red-300"}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="font-black text-gray-800 leading-snug">{ad.concept_name}</p>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${isWinner ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {ad.status}
                      </span>
                      {ad.result && (
                        <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                          isWinner ? "bg-amber-100 text-amber-700" :
                          isLoser ? "bg-gray-100 text-gray-500" :
                          "bg-gray-100 text-gray-400"
                        }`}>
                          {isWinner ? "🏆 " : ""}{ad.result}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md">{ad.ad_format}</span>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md">{ad.ad_type}</span>
                    {ad.assigned_editor && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-green-50 text-green-700 rounded-md">{ad.assigned_editor}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-bold text-gray-400 uppercase">
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