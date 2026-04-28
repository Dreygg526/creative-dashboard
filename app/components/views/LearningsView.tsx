"use client";
import { LearningEntry, NewLearningForm, Ad } from "../../types";
import { getLearningResultStyle } from "../../utils/helpers";

interface Props {
  learnings: LearningEntry[];
  filteredLearnings: LearningEntry[];
  learningCounts: { total: number; winner: number; loser: number; inconclusive: number; reviewed: number };
  learningsFilter: string;
  setLearningsFilter: (f: string) => void;
  isLearningFormOpen: boolean;
  setIsLearningFormOpen: (v: boolean) => void;
  newLearning: NewLearningForm;
  setNewLearning: (v: NewLearningForm) => void;
  adSearchQuery: string;
  setAdSearchQuery: (v: string) => void;
  filteredAdSearch: Ad[];
  isSubmittingLearning: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onDelete: (id: string) => void;
  onMarkReviewed: (id: string) => void;
  onUnmarkReviewed: (id: string) => void;
  currentUser: string;
  currentRole: string;
  expandedLearning: string | null;
  setExpandedLearning: (id: string | null) => void;
}

export default function LearningsView({
  filteredLearnings, learningCounts, learningsFilter, setLearningsFilter,
  isLearningFormOpen, setIsLearningFormOpen,
  newLearning, setNewLearning,
  adSearchQuery, setAdSearchQuery,
  filteredAdSearch, isSubmittingLearning,
  onSubmit, onDelete, onMarkReviewed, onUnmarkReviewed,
  currentUser, currentRole,
  expandedLearning, setExpandedLearning
}: Props) {
  const isFounder = currentRole === "Founder";
  const canManage = currentRole === "Founder" || currentRole === "Strategist";

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[1000px] mx-auto w-full">
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Creative Learnings</h2>
          <p className="text-gray-400 text-sm font-medium mt-0.5">What worked, what didn't, and why.</p>
        </div>
        <button
          onClick={() => setIsLearningFormOpen(!isLearningFormOpen)}
          className="bg-green-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-800 transition-all shadow-sm"
        >
          + Log Learning
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {[
          { label: "Total", value: learningCounts.total, bg: "bg-gray-100", text: "text-gray-700" },
          { label: "Winners", value: learningCounts.winner, bg: "bg-green-100", text: "text-green-700" },
          { label: "Losers", value: learningCounts.loser, bg: "bg-red-100", text: "text-red-600" },
          { label: "Inconclusive", value: learningCounts.inconclusive, bg: "bg-gray-100", text: "text-gray-600" },
          ...(isFounder ? [{ label: "Reviewed", value: learningCounts.reviewed, bg: "bg-blue-100", text: "text-blue-600" }] : []),
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl px-4 py-3 text-center flex-1`}>
            <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-1">{s.label}</p>
            <p className={`text-xl font-black ${s.text}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Log Form */}
      {isLearningFormOpen && (
        <form onSubmit={onSubmit} className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 shadow-sm">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Log a New Learning</p>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Link to Ad (optional)</label>
              <input
                type="text"
                placeholder="Search Winner or killed ads..."
                className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm font-medium outline-none focus:border-green-500 transition-all placeholder:text-gray-300 text-gray-800"
                value={adSearchQuery}
                onChange={e => setAdSearchQuery(e.target.value)}
              />
              {adSearchQuery && filteredAdSearch.length > 0 && (
                <div className="mt-2 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-md">
                  {filteredAdSearch.map(ad => (
                    <button
                      key={ad.id}
                      type="button"
                      onClick={() => {
                        setNewLearning({ ...newLearning, ad_id: ad.id, ad_name: ad.concept_name });
                        setAdSearchQuery(ad.concept_name);
                      }}
                      className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-green-50 transition-colors border-b border-gray-50 last:border-0 text-gray-800"
                    >
                      {ad.concept_name}
                      <span className={`ml-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${ad.status === "Winner" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {ad.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {newLearning.ad_id && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] font-black text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                    Linked: {newLearning.ad_name}
                  </span>
                  <button type="button" onClick={() => { setNewLearning({ ...newLearning, ad_id: "", ad_name: "" }); setAdSearchQuery(""); }} className="text-[10px] font-black text-gray-400 hover:text-red-500 transition-colors">
                    Remove
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Ad Link (URL)</label>
              <input
                type="url"
                placeholder="https://..."
                className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm font-medium outline-none focus:border-green-500 transition-all placeholder:text-gray-300 text-gray-800"
                value={newLearning.ad_link}
                onChange={e => setNewLearning({ ...newLearning, ad_link: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">Result</label>
              <div className="flex gap-3">
                {(["Winner", "Loser", "Inconclusive"] as const).map(r => {
                  const style = getLearningResultStyle(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewLearning({ ...newLearning, result: r })}
                      className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest border-2 transition-all ${
                        newLearning.result === r
                          ? r === "Winner" ? "bg-green-600 text-white border-green-600" :
                            r === "Loser" ? "bg-red-500 text-white border-red-500" :
                            "bg-gray-500 text-white border-gray-500"
                          : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      {style.icon} {r}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Key Insight</label>
              <textarea
                required rows={3}
                placeholder="What worked or didn't and why? Be specific..."
                className="w-full border border-gray-200 bg-gray-50 p-3.5 rounded-xl text-sm font-medium outline-none focus:border-green-500 resize-none transition-all placeholder:text-gray-300 text-gray-800"
                value={newLearning.insight}
                onChange={e => setNewLearning({ ...newLearning, insight: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setIsLearningFormOpen(false)} className="text-sm font-bold text-gray-400 px-4 py-2 hover:bg-gray-100 rounded-xl">Cancel</button>
              <button type="submit" disabled={isSubmittingLearning || !newLearning.insight.trim()} className="bg-green-700 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-800 transition-all disabled:opacity-40">
                {isSubmittingLearning ? "Saving..." : "Save Learning"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        {["All", "Winner", "Loser", "Inconclusive"].map(f => {
          const style = f !== "All" ? getLearningResultStyle(f) : null;
          return (
            <button
              key={f}
              onClick={() => setLearningsFilter(f)}
              className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-tight transition-all border ${
                learningsFilter === f
                  ? "bg-green-700 text-white border-green-700 shadow-sm"
                  : "bg-white text-gray-500 border-gray-200 hover:border-green-300"
              }`}
            >
              {style ? `${style.icon} ` : ""}{f}
            </button>
          );
        })}
      </div>

      {/* Learnings List */}
      {filteredLearnings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-300">
          <div className="text-6xl mb-4">🧠</div>
          <p className="text-lg font-bold text-gray-400">No learnings logged yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLearnings.map(learning => {
            const style = getLearningResultStyle(learning.result);
            const isExpanded = expandedLearning === learning.id;
            return (
              <div key={learning.id} className={`bg-white border rounded-2xl p-5 transition-all hover:shadow-md ${
                learning.is_reviewed ? "border-blue-200" :
                style.badge.includes("emerald") || style.badge.includes("green") ? "border-green-200" :
                style.badge.includes("rose") || style.badge.includes("red") ? "border-red-200" :
                "border-gray-100"
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${style.badge}`}>
                        {style.icon} {learning.result}
                      </span>
                      {learning.is_reviewed && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-blue-100 text-blue-600 border border-blue-200">✓ Reviewed</span>
                      )}
                      {learning.ad_name && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">{learning.ad_name}</span>
                      )}
                    </div>
                    <p className={`text-sm font-bold text-gray-800 leading-snug ${!isExpanded ? "line-clamp-2" : ""}`}>{learning.insight}</p>
                    {learning.insight.length > 120 && (
                      <button onClick={() => setExpandedLearning(isExpanded ? null : learning.id)} className="text-[10px] font-black text-green-700 mt-1 hover:text-green-800">
                        {isExpanded ? "Show less" : "Read more"}
                      </button>
                    )}
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-[10px] font-black text-gray-400">by {learning.logged_by}</span>
                      <span className="text-[10px] text-gray-300">•</span>
                      <span className="text-[10px] text-gray-400">{new Date(learning.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                      {learning.ad_link && (
                        <>
                          <span className="text-[10px] text-gray-300">•</span>
                          <a href={learning.ad_link} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-green-700 hover:text-green-800 transition-colors">View Ad ↗</a>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {isFounder && (
                      <button
                        onClick={() => learning.is_reviewed ? onUnmarkReviewed(learning.id) : onMarkReviewed(learning.id)}
                        className={`text-[10px] font-black px-3 py-2 rounded-xl uppercase tracking-widest transition-all ${
                          learning.is_reviewed ? "bg-blue-100 text-blue-600 hover:bg-blue-200" : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-green-700"
                        }`}
                      >
                        {learning.is_reviewed ? "✓ Reviewed" : "Mark Reviewed"}
                      </button>
                    )}
                    {canManage && (
                      <button onClick={() => onDelete(learning.id)} className="text-[10px] font-black text-gray-300 hover:text-red-500 px-3 py-2 rounded-xl hover:bg-red-50 transition-all uppercase tracking-widest">
                        Delete
                      </button>
                    )}
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