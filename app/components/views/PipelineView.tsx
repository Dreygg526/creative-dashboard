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

export default function PipelineView({ ads, activeStage, setActiveStage, setSelectedAd, currentRole, currentUser }: Props) {
  const filteredAds = ads.filter(ad => ad.status === activeStage);

  const isFounder = currentRole === "Founder";
  const isStrategist = currentRole === "Strategist";

  const canClickAd = (ad: Ad) => {
    if (isFounder) return true;
    if (isStrategist) {
      // Strategist can only open ads assigned to them or in their stages
      return ad.assigned_copywriter === currentUser ||
        ["Ad Revision", "Testing", "Writing Brief", "Brief Revision Required"].includes(ad.status);
    }
    return false;
  };

  return (
    <>
      <div className="bg-white border-b border-slate-200 p-3 flex justify-center flex-wrap gap-2 overflow-x-auto">
        {STAGES.map(stage => (
          <button
            key={stage}
            onClick={() => setActiveStage(stage)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-tight transition-all
              ${activeStage === stage ? "bg-slate-800 text-white shadow-md" : "bg-slate-100 text-slate-500 border border-slate-200"}`}
          >
            {stage}
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${activeStage === stage ? "bg-slate-700 text-white" : "bg-white text-slate-400"}`}>
              {ads.filter(ad => ad.status === stage).length}
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 p-4 md:p-8 overflow-y-auto max-w-[1200px] mx-auto w-full">
        {filteredAds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300 opacity-60">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-lg font-bold">No ads currently in {activeStage}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredAds.map(ad => {
              const daysInStage = Math.floor((new Date().getTime() - new Date(ad.stage_updated_at || ad.created_at).getTime()) / (1000 * 3600 * 24));
              const testingDaysLeft = getDaysLeftInTesting(ad.live_date);
              const isTestingLocked = ad.status === "Testing" && testingDaysLeft > 0;
              const isStale = daysInStage >= 5 && ad.status !== "Testing" && ad.status !== "Completed" && ad.status !== "Killed";
              const clickable = canClickAd(ad);

              return (
                <div
                  key={ad.id}
                  onClick={() => clickable && setSelectedAd(ad)}
                  className={`p-6 rounded-[24px] border-2 shadow-sm transition-all relative overflow-hidden ${getCardColor(ad.status)} ${clickable ? "cursor-pointer hover:scale-[1.01] hover:shadow-lg" : "cursor-default opacity-75"}`}
                >
                  {/* Read-only badge for non-clickable cards */}
                  {!clickable && (
                    <div className="absolute top-2 left-2 text-[8px] font-black uppercase px-2 py-0.5 bg-slate-200 text-slate-500 rounded-full tracking-widest">
                      Read Only
                    </div>
                  )}

                  <div className={`absolute top-0 right-0 px-3 py-1 text-[9px] font-black uppercase rounded-bl-xl ${getPriorityBadge(ad.priority)}`}>
                    {ad.priority}
                  </div>

                  <p className="font-black text-lg mb-3 text-slate-800 leading-snug mt-2">{ad.concept_name}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-[10px] font-black px-2 py-0.5 bg-white/60 text-slate-500 border border-slate-200 rounded-md uppercase">{ad.ad_type}</span>
                    <span className="text-[10px] font-black px-2 py-0.5 bg-white/60 text-slate-500 border border-slate-200 rounded-md uppercase">{ad.ad_format}</span>
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