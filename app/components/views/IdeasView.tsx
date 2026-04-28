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
    <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[1000px] mx-auto w-full">
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Ideas Library</h2>
          <p className="text-gray-400 text-sm font-medium mt-0.5">Capture fast. Decide weekly.</p>
        </div>
        <div className="flex gap-3">
          {[
            { label: "Total", value: ideaCounts.total, bg: "bg-gray-100", text: "text-gray-700" },
            { label: "Pending", value: ideaCounts.pending, bg: "bg-amber-100", text: "text-amber-700" },
            { label: "Promoted", value: ideaCounts.promoted, bg: "bg-green-100", text: "text-green-700" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl px-4 py-2 text-center`}>
              <p className="text-[8px] font-black uppercase tracking-widest text-gray-500">{s.label}</p>
              <p className={`text-lg font-black ${s.text}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Capture Form */}
      <form onSubmit={onSubmit} className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 shadow-sm">
        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3">Log a New Idea</p>
        <div className="flex flex-col md:flex-row gap-3">
          <textarea
            required rows={2}
            placeholder="Describe the idea, angle, or creative direction..."
            className="flex-1 border border-gray-200 bg-gray-50 p-3.5 rounded-xl text-sm font-medium outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 resize-none transition-all placeholder:text-gray-300 text-gray-800"
            value={newIdeaText}
            onChange={e => setNewIdeaText(e.target.value)}
          />
          <div className="flex flex-col gap-2 md:w-48">
            <select
              className="border border-gray-200 bg-white p-3 rounded-xl text-sm font-black outline-none focus:border-green-500 text-gray-700"
              value={newIdeaType}
              onChange={e => setNewIdeaType(e.target.value)}
            >
              {IDEA_TYPE_TAGS.map(t => <option key={t}>{t}</option>)}
            </select>
            <button
              type="submit"
              disabled={isSubmittingIdea || !newIdeaText.trim()}
              className="bg-green-700 text-white px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-800 transition-all disabled:opacity-40"
            >
              {isSubmittingIdea ? "Saving..." : "+ Log Idea"}
            </button>
          </div>
        </div>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        {["All", "Pending", "Promoted", ...IDEA_TYPE_TAGS].map(f => (
          <button
            key={f}
            onClick={() => setIdeaFilter(f)}
            className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-tight transition-all border ${
              ideaFilter === f
                ? "bg-green-700 text-white border-green-700 shadow-sm"
                : "bg-white text-gray-500 border-gray-200 hover:border-green-300"
            }`}
          >
            {f}
            {f === "Pending" && ideaCounts.pending > 0 && (
              <span className="ml-1.5 bg-amber-400 text-white text-[8px] px-1.5 py-0.5 rounded-full">{ideaCounts.pending}</span>
            )}
          </button>
        ))}
      </div>

      {/* Ideas List */}
      {filteredIdeas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-300">
          <div className="text-6xl mb-4">💡</div>
          <p className="text-lg font-bold text-gray-400">No ideas here yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIdeas.map(idea => (
            <div
              key={idea.id}
              className={`bg-white border rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4 transition-all hover:shadow-md ${
                idea.promoted ? "border-green-200 opacity-70" : "border-gray-100 hover:border-green-200"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${getIdeaTypeStyle(idea.type_tag)}`}>{idea.type_tag}</span>
                  {idea.promoted && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">✓ Sent to Pipeline</span>
                  )}
                </div>
                <p className="text-sm font-bold text-gray-800 leading-snug break-words">{idea.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] font-black text-gray-400">by {idea.submitted_by}</span>
                  <span className="text-[10px] text-gray-300">•</span>
                  <span className="text-[10px] text-gray-400">{new Date(idea.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {canManageIdeas && !idea.promoted && (
                  <button onClick={() => onPromote(idea)} className="bg-green-700 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-800 transition-all whitespace-nowrap">
                    → Pipeline
                  </button>
                )}
                {(canManageIdeas || idea.submitted_by === currentUser) && (
                  <button onClick={() => onDelete(idea.id)} className="text-[10px] font-black text-gray-400 hover:text-red-500 px-3 py-2 rounded-xl hover:bg-red-50 transition-all uppercase tracking-widest">
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