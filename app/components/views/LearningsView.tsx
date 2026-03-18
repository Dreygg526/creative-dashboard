"use client";
import { LearningEntry, NewLearningForm, Ad } from "../../types";
import { getLearningResultStyle } from "../../utils/helpers";

interface Props {
  learnings: LearningEntry[];
  filteredLearnings: LearningEntry[];
  learningCounts: { total: number; winner: number; loser: number; inconclusive: number };
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
  currentUser: string;
  expandedLearning: string | null;
  setExpandedLearning: (id: string | null) => void;
}

export default function LearningsView({
  filteredLearnings, learningCounts, learningsFilter, setLearningsFilter,
  isLearningFormOpen, setIsLearningFormOpen,
  newLearning, setNewLearning,
  adSearchQuery, setAdSearchQuery,
  filteredAdSearch, isSubmittingLearning,
  onSubmit, onDelete, currentUser,
  expandedLearning, setExpandedLearning
}: Props) {
  const canManage = currentUser === "Founder" || currentUser === "Strategist";

  return (
    <div className="flex-1 p-6 md:p-10 overflow-y-auto max-w-[1000px] mx-auto w-full">

      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 mb-1">Creative Learnings</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">
            What worked, what did not, and why.
          </p>
        </div>
        <button
          onClick={() => setIsLearningFormOpen(!isLearningFormOpen)}
          className="bg-indigo-600 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm"
        >
          + Log Learning
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-8">
        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-center shadow-sm flex-1">
          <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Total</p>
          <p className="text-xl font-black text-slate-800">{learningCounts.total}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-center shadow-sm flex-1">
          <p className="text-[8px] font-black uppercase text-emerald-500 tracking-widest mb-1">Winners</p>
          <p className="text-xl font-black text-emerald-600">{learningCounts.winner}</p>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 text-center shadow-sm flex-1">
          <p className="text-[8px] font-black uppercase text-rose-500 tracking-widest mb-1">Losers</p>
          <p className="text-xl font-black text-rose-600">{learningCounts.loser}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-center shadow-sm flex-1">
          <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Inconclusive</p>
          <p className="text-xl font-black text-slate-600">{learningCounts.inconclusive}</p>
        </div>
      </div>

      {/* Log Form */}
      {isLearningFormOpen && (
        <form onSubmit={onSubmit} className="bg-white border-2 border-slate-100 rounded-[28px] p-6 mb-8 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Log a New Learning</p>
          <div className="space-y-4">

            {/* Ad Search */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Link to Ad (optional)</label>
              <input
                type="text"
                placeholder="Search completed or killed ads..."
                className="w-full border-2 border-slate-100 bg-slate-50 p-3 rounded-2xl text-sm font-medium outline-none focus:border-indigo-400 transition-all placeholder:text-slate-300"
                value={adSearchQuery}
                onChange={e => setAdSearchQuery(e.target.value)}
              />
              {adSearchQuery && filteredAdSearch.length > 0 && (
                <div className="mt-2 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md">
                  {filteredAdSearch.map(ad => (
                    <button
                      key={ad.id}
                      type="button"
                      onClick={() => {
                        setNewLearning({ ...newLearning, ad_id: ad.id, ad_name: ad.concept_name });
                        setAdSearchQuery(ad.concept_name);
                      }}
                      className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0"
                    >
                      <span className="text-slate-800">{ad.concept_name}</span>
                      <span className={`ml-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${ad.status === "Completed" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                        {ad.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {newLearning.ad_id && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                    Linked: {newLearning.ad_name}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setNewLearning({ ...newLearning, ad_id: "", ad_name: "" }); setAdSearchQuery(""); }}
                    className="text-[10px] font-black text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Ad Link URL */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Ad Link (URL)</label>
              <input
                type="url"
                placeholder="https://... paste link to the actual ad"
                className="w-full border-2 border-slate-100 bg-slate-50 p-3 rounded-2xl text-sm font-medium outline-none focus:border-indigo-400 transition-all placeholder:text-slate-300"
                value={newLearning.ad_link}
                onChange={e => setNewLearning({ ...newLearning, ad_link: e.target.value })}
              />
            </div>

            {/* Result */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Result</label>
              <div className="flex gap-3">
                {(["Winner", "Loser", "Inconclusive"] as const).map(r => {
                  const style = getLearningResultStyle(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewLearning({ ...newLearning, result: r })}
                      className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border-2 transition-all ${newLearning.result === r ? `${style.badge} border-current shadow-sm` : "bg-white border-slate-200 text-slate-400"}`}
                    >
                      {style.icon} {r}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Insight */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Key Insight</label>
              <textarea
                required
                rows={3}
                placeholder="What worked or did not and why? Be specific — hook, angle, format, audience..."
                className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-medium outline-none focus:border-indigo-400 resize-none transition-all placeholder:text-slate-300"
                value={newLearning.insight}
                onChange={e => setNewLearning({ ...newLearning, insight: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsLearningFormOpen(false)}
                className="text-sm font-bold text-slate-400 px-4 py-2 hover:bg-slate-50 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingLearning || !newLearning.insight.trim()}
                className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-40"
              >
                {isSubmittingLearning ? "Saving..." : "Save Learning"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["All", "Winner", "Loser", "Inconclusive"].map(f => {
          const style = f !== "All" ? getLearningResultStyle(f) : null;
          return (
            <button
              key={f}
              onClick={() => setLearningsFilter(f)}
              className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-tight transition-all border ${
                learningsFilter === f
                  ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              }`}
            >
              {style ? `${style.icon} ` : ""}{f}
            </button>
          );
        })}
      </div>

      {/* Learnings List */}
      {filteredLearnings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-300 opacity-60">
          <div className="text-6xl mb-4">🧠</div>
          <p className="text-lg font-bold">No learnings logged yet</p>
          <p className="text-sm font-medium">Click + Log Learning to add the first one</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLearnings.map(learning => {
            const style = getLearningResultStyle(learning.result);
            const isExpanded = expandedLearning === learning.id;
            return (
              <div
                key={learning.id}
                className={`bg-white border-2 rounded-[20px] p-5 transition-all hover:shadow-md ${
                  style.badge.includes("emerald") ? "border-emerald-100" :
                  style.badge.includes("rose") ? "border-rose-100" : "border-slate-100"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${style.badge}`}>
                        {style.icon} {learning.result}
                      </span>
                      {learning.ad_name && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                          {learning.ad_name}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm font-bold text-slate-800 leading-snug ${!isExpanded ? "line-clamp-2" : ""}`}>
                      {learning.insight}
                    </p>
                    {learning.insight.length > 120 && (
                      <button
                        onClick={() => setExpandedLearning(isExpanded ? null : learning.id)}
                        className="text-[10px] font-black text-indigo-500 mt-1 hover:text-indigo-700"
                      >
                        {isExpanded ? "Show less" : "Read more"}
                      </button>
                    )}
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-[10px] font-black text-slate-400">by {learning.logged_by}</span>
                      <span className="text-[10px] text-slate-300">•</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(learning.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      {learning.ad_link && (
                        <>
                          <span className="text-[10px] text-slate-300">•</span>
                          <a
                            href={learning.ad_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-black text-indigo-500 hover:text-indigo-700 transition-colors"
                          >
                            View Ad ↗
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => onDelete(learning.id)}
                      className="text-[10px] font-black text-slate-300 hover:text-rose-500 px-3 py-2 rounded-xl hover:bg-rose-50 transition-all uppercase tracking-widest shrink-0"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}