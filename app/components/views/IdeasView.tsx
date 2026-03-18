import { IdeaEntry } from "../../types";
import { IDEA_TYPE_TAGS } from "../../constants";
import { getIdeaTypeStyle } from "../../utils/helpers";

interface Props {
  currentUser: string;
  ideas: IdeaEntry[];
  filteredIdeas: IdeaEntry[];
  ideaCounts: { total: number; pending: number; promoted: number };
  ideaFilter: string;
  setIdeaFilter: (f: string) => void;
  newIdeaText: string;
  setNewIdeaText: (v: string) => void;
  newIdeaType: string;
  setNewIdeaType: (v: string) => void;
  isSubmittingIdea: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onDelete: (id: string) => void;
  onPromote: (idea: IdeaEntry) => void;
  canManageIdeas: boolean;
}

export default function IdeasView({
  currentUser, filteredIdeas, ideaCounts, ideaFilter, setIdeaFilter,
  newIdeaText, setNewIdeaText, newIdeaType, setNewIdeaType,
  isSubmittingIdea, onSubmit, onDelete, onPromote, canManageIdeas
}: Props) {
  return (
    <div className="flex-1 p-6 md:p-10 overflow-y-auto max-w-[1000px] mx-auto w-full">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 mb-1">Ideas Library</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">Capture fast. Decide weekly.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2 text-center shadow-sm">
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Total</p>
            <p className="text-lg font-black text-slate-800">{ideaCounts.total}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2 text-center shadow-sm">
            <p className="text-[8px] font-black uppercase text-amber-500 tracking-widest">Pending</p>
            <p className="text-lg font-black text-amber-600">{ideaCounts.pending}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2 text-center shadow-sm">
            <p className="text-[8px] font-black uppercase text-emerald-500 tracking-widest">Promoted</p>
            <p className="text-lg font-black text-emerald-600">{ideaCounts.promoted}</p>
          </div>
        </div>
      </div>

      {/* Capture Form */}
      <form onSubmit={onSubmit} className="bg-white border-2 border-slate-100 rounded-[28px] p-6 mb-8 shadow-sm">
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Log a New Idea</p>
        <div className="flex flex-col md:flex-row gap-3">
          <textarea
            required rows={2}
            placeholder="Describe the idea, angle, or creative direction..."
            className="flex-1 border-2 border-slate-100 bg-slate-50 p-4 rounded-2xl text-sm font-medium outline-none focus:border-amber-400 resize-none transition-all placeholder:text-slate-300"
            value={newIdeaText}
            onChange={e => setNewIdeaText(e.target.value)}
          />
          <div className="flex flex-col gap-3 md:w-52">
            <select
              className="border-2 border-slate-100 bg-slate-50 p-3 rounded-2xl text-sm font-black outline-none focus:border-amber-400 transition-all"
              value={newIdeaType}
              onChange={e => setNewIdeaType(e.target.value)}
            >
              {IDEA_TYPE_TAGS.map(t => <option key={t}>{t}</option>)}
            </select>
            <button
              type="submit"
              disabled={isSubmittingIdea || !newIdeaText.trim()}
              className="bg-amber-400 text-slate-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-500 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmittingIdea ? "Saving..." : "+ Log Idea"}
            </button>
          </div>
        </div>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["All", "Pending", "Promoted", ...IDEA_TYPE_TAGS].map(f => (
          <button
            key={f}
            onClick={() => setIdeaFilter(f)}
            className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-tight transition-all border ${
              ideaFilter === f ? "bg-slate-800 text-white border-slate-800 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
            }`}
          >
            {f}
            {f === "Pending" && ideaCounts.pending > 0 && (
              <span className="ml-1.5 bg-amber-400 text-slate-900 text-[8px] px-1.5 py-0.5 rounded-full">{ideaCounts.pending}</span>
            )}
          </button>
        ))}
      </div>

      {/* Ideas List */}
      {filteredIdeas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-300 opacity-60">
          <div className="text-6xl mb-4">💡</div>
          <p className="text-lg font-bold">No ideas here yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIdeas.map(idea => (
            <div
              key={idea.id}
              className={`bg-white border-2 rounded-[20px] p-5 flex flex-col md:flex-row md:items-center gap-4 transition-all hover:shadow-md ${
                idea.promoted ? "border-emerald-200 bg-emerald-50/30 opacity-70" : "border-slate-100 hover:border-amber-200"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${getIdeaTypeStyle(idea.type_tag)}`}>{idea.type_tag}</span>
                  {idea.promoted && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">✓ Sent to Pipeline</span>
                  )}
                </div>
                <p className="text-sm font-bold text-slate-800 leading-snug break-words">{idea.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] font-black text-slate-400">by {idea.submitted_by}</span>
                  <span className="text-[10px] text-slate-300">•</span>
                  <span className="text-[10px] text-slate-400">{new Date(idea.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {canManageIdeas && !idea.promoted && (
                  <button onClick={() => onPromote(idea)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm whitespace-nowrap">
                    → Pipeline
                  </button>
                )}
                {(canManageIdeas || idea.submitted_by === currentUser) && (
                  <button onClick={() => onDelete(idea.id)} className="text-[10px] font-black text-slate-300 hover:text-rose-500 px-3 py-2 rounded-xl hover:bg-rose-50 transition-all uppercase tracking-widest">
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}