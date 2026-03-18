"use client";
import { Ad } from "../../types";
import { getPriorityBadge } from "../../utils/helpers";

// ─── MY QUEUE ─────────────────────────────────────────────────────────────────

interface MyQueueProps {
  currentUser: string;
  myQueue: Ad[];
  setSelectedAd: (ad: Ad) => void;
}

export function MyQueueView({ currentUser, myQueue, setSelectedAd }: MyQueueProps) {
  return (
    <div className="flex-1 p-6 md:p-12 overflow-y-auto max-w-[900px] mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-800 mb-2">My Task Queue</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">Tasks assigned to {currentUser}</p>
      </div>
      {myQueue.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[32px] p-20 flex flex-col items-center justify-center text-slate-400">
          <span className="text-5xl mb-4">🎉</span>
          <p className="text-xl font-black">Inbox Zero!</p>
          <p className="font-bold">You're all caught up.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myQueue.map(ad => {
            const daysInStage = Math.floor((new Date().getTime() - new Date(ad.stage_updated_at || ad.created_at).getTime()) / (1000 * 3600 * 24));
            const isStale = daysInStage >= 5 && ad.status !== "Testing" && ad.status !== "Completed";
            return (
              <div key={ad.id} onClick={() => setSelectedAd(ad)} className="p-6 rounded-[24px] border-2 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-12 rounded-full ${getPriorityBadge(ad.priority)}`}></div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-indigo-600 mb-1">{ad.status}</p>
                    <h3 className="text-xl font-black text-slate-800">{ad.concept_name}</h3>
                    <p className="text-slate-400 font-bold">{ad.product} • {ad.ad_format}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Stage</p>
                    <p className={`text-sm font-black ${isStale ? "text-rose-500" : "text-slate-800"}`}>{daysInStage} Days</p>
                  </div>
                  <button className="bg-slate-800 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest">Open Ad</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MANAGER VIEW ─────────────────────────────────────────────────────────────

interface ManagerProps {
  workloads: Record<string, Ad[]>;
  setSelectedAd: (ad: Ad) => void;
}

export function ManagerView({ workloads, setSelectedAd }: ManagerProps) {
  return (
    <div className="flex-1 overflow-x-auto p-6 flex gap-6 items-start">
      {Object.entries(workloads).map(([person, tasks]) => (
        <div key={person} className="min-w-[300px] max-w-[300px] flex flex-col gap-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-black text-slate-800">{person}</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${tasks.length > 5 ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500"}`}>{tasks.length} Active</span>
          </div>
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-300 font-bold">Idle</div>
            ) : tasks.map(ad => (
              <div key={ad.id} onClick={() => setSelectedAd(ad)} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm cursor-pointer hover:border-indigo-400 transition-all">
                <p className="text-[9px] font-black uppercase text-indigo-500 mb-1">{ad.status}</p>
                <p className="font-bold text-slate-800 leading-tight">{ad.concept_name}</p>
                <div className="mt-3 flex justify-between items-center">
                  <div className={`w-2 h-2 rounded-full ${getPriorityBadge(ad.priority)}`}></div>
                  <p className="text-[9px] font-black text-slate-300">{Math.floor((new Date().getTime() - new Date(ad.stage_updated_at || ad.created_at).getTime()) / (1000 * 3600 * 24))}d</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── REPORTS VIEW ─────────────────────────────────────────────────────────────

interface ReportsProps {
  weeklyChartData: { label: string; count: number }[];
  avgDaysToUpload: string;
  pipelineVelocityData: { upload: string; testing: string };
  teamOutput: [string, { strategist: number; editor: number }][];
}

export function ReportsView({ weeklyChartData, avgDaysToUpload, pipelineVelocityData, teamOutput }: ReportsProps) {
  return (
    <div className="flex-1 p-6 md:p-12 overflow-y-auto max-w-[1100px] mx-auto w-full">
      <div className="mb-10">
        <h2 className="text-3xl font-black text-slate-800 mb-2">Creative Output Report</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">System intelligence & performance analytics</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm">
          <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2">📈 Output Trends <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">(Weekly Produced)</span></h3>
          <div className="flex items-end gap-3 h-40 pt-4">
            {weeklyChartData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-indigo-500 rounded-t-xl transition-all hover:bg-indigo-600 cursor-help relative group" style={{ height: `${Math.max(d.count * 15, 10)}%` }}>
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">{d.count} Ads</span>
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm">
          <h3 className="font-black text-slate-800 mb-6">⏱ Pipeline Velocity</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-end mb-2">
                <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Idea → Upload</p>
                <p className="text-xl font-black text-indigo-600">{avgDaysToUpload} Days</p>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(Number(avgDaysToUpload) * 10, 100)}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-end mb-2">
                <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Upload → Testing</p>
                <p className="text-xl font-black text-emerald-600">{pipelineVelocityData.testing} Days</p>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(Number(pipelineVelocityData.testing) * 20, 100)}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm md:col-span-2">
          <h3 className="font-black text-slate-800 mb-6 flex items-center justify-between">
            👷 Team Performance <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded">This Week</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-slate-50">
                  <th className="pb-4 text-[10px] font-black uppercase text-slate-400">Team Member</th>
                  <th className="pb-4 text-[10px] font-black uppercase text-slate-400">Strategist / Copy</th>
                  <th className="pb-4 text-[10px] font-black uppercase text-slate-400">Editing / Design</th>
                  <th className="pb-4 text-[10px] font-black uppercase text-slate-400">Total Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {teamOutput.map(([name, stats]) => (
                  <tr key={name} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 font-black text-slate-700">{name}</td>
                    <td className="py-4"><span className={`font-bold ${stats.strategist > 0 ? "text-indigo-600" : "text-slate-300"}`}>{stats.strategist} Produced</span></td>
                    <td className="py-4"><span className={`font-bold ${stats.editor > 0 ? "text-emerald-600" : "text-slate-300"}`}>{stats.editor} Produced</span></td>
                    <td className="py-4"><span className="bg-slate-100 px-3 py-1 rounded-full text-xs font-black text-slate-500">{stats.strategist + stats.editor} Tasks</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}