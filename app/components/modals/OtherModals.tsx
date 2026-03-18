import { IdeaEntry } from "../../types";
import { getIdeaTypeStyle } from "../../utils/helpers";

interface PromoteIdeaModalProps {
  idea: IdeaEntry;
  onConfirm: (idea: IdeaEntry) => void;
  onCancel: () => void;
}

export function PromoteIdeaModal({ idea, onConfirm, onCancel }: PromoteIdeaModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-[32px] w-full max-w-sm shadow-2xl">
        <div className="text-4xl mb-4 text-center">🚀</div>
        <h2 className="text-xl font-black text-slate-800 text-center mb-2">Send to Pipeline?</h2>
        <p className="text-sm text-slate-500 font-medium text-center mb-2 leading-relaxed">
          This will pre-fill the New Ad form with this idea.
        </p>
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6">
          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full border ${getIdeaTypeStyle(idea.type_tag)} inline-block mb-2`}>{idea.type_tag}</span>
          <p className="text-sm font-bold text-slate-700 leading-snug">{idea.description}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-widest bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">Cancel</button>
          <button onClick={() => onConfirm(idea)} className="flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm">Promote It</button>
        </div>
      </div>
    </div>
  );
}

interface SpendModalProps {
  rankedSpend: [string, number][];
  onClose: () => void;
}

export function SpendModal({ rankedSpend, onClose }: SpendModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-[32px] w-full max-w-sm shadow-2xl">
        <h2 className="text-2xl font-black mb-5 flex items-center gap-2 text-slate-800">💰 Spend Leaderboard</h2>
        <div className="space-y-4 mb-8">
          {rankedSpend.map(([name, spend]) => (
            <div key={name} className="flex justify-between items-center border-b-2 border-slate-50 pb-3">
              <span className="font-bold text-slate-700">{name}</span>
              <span className="font-black text-indigo-600">${spend.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="w-full bg-slate-100 text-slate-700 py-4 rounded-2xl font-black hover:bg-slate-200 transition-colors uppercase text-xs tracking-widest">Close</button>
      </div>
    </div>
  );
}