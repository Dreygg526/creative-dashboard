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
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white mb-1">Ideas Library</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">Capture fast. Decide weekly.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2 text-center">
            <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Total</p>
            <p className="text-lg font-black text-white">{ideaCounts.total}</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-2 text-center">
            <p className="text-[8px] font-black uppercase text-amber-400 tracking-widest">Pending</p>
            <p className="text-lg font-black text-amber-400">{ideaCounts.pending}</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-2 text-center">
            <p className="text-[8px] font-black uppercase text-emerald-400 tracking-widest">Promoted</p>
            <p className="text-lg font-black text-emerald-400">{ideaCounts.promoted}</p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="bg-white/5 border border-white/10 rounded-[28px] p-6 mb-8">
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4">Log a New Idea</p>
        <div className="flex flex-col md:flex-row gap-3">
          <textarea
            required rows={2}
            placeholder="Describe the idea, angle, or creative direction..."
            className="flex-1 border-2 border-white/10 bg-white/5 p-4 rounded-2xl text-sm font-medium outline-none focus:border-amber-400 resize-none transition-all placeholder:text-slate-600 text-slate-100"
            value={newIdeaText}
            onChange={e => setNewIdeaText(e.target.value)}
          />
          <div className="flex flex-col gap-3 md:w-52">
            <select
              className="border-2 border-white/10 bg-[#2a2b2c] p-3 rounded-2xl text-sm font-black outline-none focus:border-amber-400 transition-all text-slate-100"
              value={newIdeaType}
              onChange={e => setNewIdeaType(e.target.value)}
            >
              {IDEA_TYPE_TAGS.map(t => <option key={t}>{t}</option>)}
            </select>
            <button
              type="submit"
              disabled={isSubmittingIdea || !newIdeaText.trim()}
              className="bg-amber-400 text-slate-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-300 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmittingIdea ? "Saving..." : "+ Log Idea"}
            </button>
          </div>
        </div>
      </form>

      <div className="flex flex-wrap gap-2 mb-6">
        {["All", "Pending", "Promoted", ...IDEA_TYPE_TAGS].map(f => (
          <button
            key={f}
            onClick={() => setIdeaFilter(f)}
            className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-tight transition-all border ${
              ideaFilter === f
                ? "bg-indigo-500 text-white border-indigo-500 shadow-sm"
                : "bg-white/5 text-slate-400 border-white/10 hover:border-white/20"
            }`}
          >
            {f}
            {f === "Pending" && ideaCounts.pending > 0 && (
              <span className="ml-1.5 bg-amber-400 text-slate-900 text-[8px] px-1.5 py-0.5 rounded-full">{ideaCounts.pending}</span>
            )}
          </button>
        ))}
      </div>

      {filteredIdeas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-600 opacity-60">
          <div className="text-6xl mb-4">💡</div>
          <p className="text-lg font-bold">No ideas here yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIdeas.map(idea => (
            <div
              key={idea.id}
              className={`border-2 rounded-[20px] p-5 flex flex-col md:flex-row md:items-center gap-4 transition-all hover:shadow-md ${
                idea.promoted
                  ? "border-emerald-500/20 bg-emerald-500/5 opacity-70"
                  : "border-white/10 bg-white/5 hover:border-amber-400/30"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${getIdeaTypeStyle(idea.type_tag)}`}>{idea.type_tag}</span>
                  {idea.promoted && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">✓ Sent to Pipeline</span>
                  )}
                </div>
                <p className="text-sm font-bold text-slate-200 leading-snug break-words">{idea.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] font-black text-slate-500">by {idea.submitted_by}</span>
                  <span className="text-[10px] text-slate-600">•</span>
                  <span className="text-[10px] text-slate-500">{new Date(idea.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {canManageIdeas && !idea.promoted && (
                  <button onClick={() => onPromote(idea)} className="bg-indigo-500 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-400 transition-all shadow-sm whitespace-nowrap">
                    → Pipeline
                  </button>
                )}
                {(canManageIdeas || idea.submitted_by === currentUser) && (
                  <button onClick={() => onDelete(idea.id)} className="text-[10px] font-black text-slate-600 hover:text-rose-400 px-3 py-2 rounded-xl hover:bg-rose-500/10 transition-all uppercase tracking-widest">
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