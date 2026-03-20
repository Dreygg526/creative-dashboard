"use client";
import { useMemo } from "react";
import { Ad } from "../../types";

type DashboardViewMode = "Dashboard" | "Pipeline" | "MyQueue" | "Manager" | "Reports" | "Ideas" | "Learnings" | "Members" | "Settings";

interface Props {
  ads: Ad[];
  currentUser: string;
  currentRole: string;
  onSelectAd: (ad: Ad) => void;
  onNewAd?: () => void;
  onNavigate?: (view: DashboardViewMode) => void;
  allProfiles?: any[];
}

const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

function daysSince(date: string) {
  return Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 3600 * 24));
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    High: "bg-rose-500",
    Medium: "bg-amber-400",
    Low: "bg-slate-300"
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[priority] || "bg-slate-300"}`} />;
}

function AdCard({ ad, onClick, showDays = true, extra }: {
  ad: Ad;
  onClick: () => void;
  showDays?: boolean;
  extra?: React.ReactNode;
}) {
  const days = daysSince(ad.stage_updated_at || ad.created_at);
  const isStale = days >= 5;
  return (
    <div
      onClick={onClick}
      className="bg-white border-2 border-slate-100 rounded-[18px] p-4 cursor-pointer hover:border-indigo-200 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <PriorityDot priority={ad.priority} />
            <p className="font-black text-slate-800 text-sm truncate">{ad.concept_name}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">{ad.ad_format}</span>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">{ad.status}</span>
            {ad.priority === "High" && (
              <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-rose-100 text-rose-600 rounded-md">🔥 High</span>
            )}
          </div>
          {extra}
        </div>
        {showDays && (
          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg shrink-0 ${isStale ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-400"}`}>
            {days}d
          </span>
        )}
      </div>
    </div>
  );
}

function Section({ title, count, color, children, empty }: {
  title: string;
  count: number;
  color: string;
  children: React.ReactNode;
  empty: string;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${color}`}>
          {title}
        </span>
        <span className="text-[10px] font-black text-slate-400">{count}</span>
      </div>
      {count === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-[18px] p-8 text-center text-slate-300 font-bold text-sm">
          {empty}
        </div>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </div>
  );
}

// ── FOUNDER DASHBOARD ──
function FounderDashboard({ ads, onSelectAd, onNavigate, allProfiles }: Props) {
  const overdueAds = ads.filter(ad => {
    const days = daysSince(ad.stage_updated_at || ad.created_at);
    return days >= 5 && !["Completed", "Killed", "Testing"].includes(ad.status);
  }).sort((a, b) => daysSince(b.stage_updated_at || b.created_at) - daysSince(a.stage_updated_at || a.created_at));

  const activeAds = ads.filter(a => !["Completed", "Killed"].includes(a.status));

  const teamWorkload = useMemo(() => {
    if (!allProfiles) return [];
    return allProfiles
      .filter(p => p.role !== "Founder" && p.is_active)
      .map(p => {
        const assigned = activeAds.filter(ad =>
          ad.assigned_editor === p.full_name ||
          ad.assigned_copywriter === p.full_name ||
          (p.role === "VA" && ad.status === "Pending Upload") ||
          (p.role === "Strategist" && ["Ad Revision", "Testing"].includes(ad.status))
        );
        return { ...p, ads: assigned };
      })
      .sort((a, b) => b.ads.length - a.ads.length);
  }, [allProfiles, activeAds]);

  return (
    <div className="flex-1 p-6 md:p-10 overflow-y-auto max-w-[1200px] mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-800 mb-1">Command Centre</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">Full team overview</p>
      </div>

      {/* Quick shortcuts */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: "Output Report", icon: "📊", view: "Reports" as DashboardViewMode },
          { label: "Ideas Library", icon: "💡", view: "Ideas" as DashboardViewMode },
          { label: "Learnings Log", icon: "🧠", view: "Learnings" as DashboardViewMode },
        ].map(s => (
          <button
            key={s.view}
            onClick={() => onNavigate?.(s.view)}
            className="bg-white border-2 border-slate-100 rounded-2xl p-4 text-center hover:border-indigo-200 hover:shadow-md transition-all"
          >
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Overdue / Stale Ads */}
      {overdueAds.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-100 rounded-[24px] p-6 mb-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-4">
            ⚠️ Stuck Ads ({overdueAds.length}) — 5+ days in same stage
          </p>
          <div className="space-y-3">
            {overdueAds.slice(0, 5).map(ad => (
              <div
                key={ad.id}
                onClick={() => onSelectAd(ad)}
                className="bg-white rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:shadow-md transition-all"
              >
                <div>
                  <p className="font-black text-slate-800 text-sm">{ad.concept_name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{ad.status}</p>
                </div>
                <span className="text-[10px] font-black bg-rose-100 text-rose-600 px-3 py-1.5 rounded-xl">
                  {daysSince(ad.stage_updated_at || ad.created_at)}d stuck
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Workload */}
      <div className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Team Workload</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teamWorkload.map(person => (
            <div key={person.id} className="bg-white border-2 border-slate-100 rounded-[20px] p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-600 text-xs">
                    {person.full_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-sm">{person.full_name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{person.role}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-3 py-1 rounded-full ${person.ads.length === 0 ? "bg-slate-100 text-slate-400" : person.ads.length >= 4 ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"}`}>
                  {person.ads.length} active
                </span>
              </div>
              {person.ads.length > 0 && (
                <div className="space-y-1.5">
                  {person.ads.slice(0, 3).map((ad: Ad) => (
                    <div
                      key={ad.id}
                      onClick={() => onSelectAd(ad)}
                      className="flex items-center justify-between text-[10px] bg-slate-50 rounded-lg px-3 py-2 cursor-pointer hover:bg-indigo-50 transition-colors"
                    >
                      <span className="font-bold text-slate-600 truncate">{ad.concept_name}</span>
                      <span className="font-black text-slate-400 ml-2 shrink-0">{ad.status}</span>
                    </div>
                  ))}
                  {person.ads.length > 3 && (
                    <p className="text-[9px] font-black text-slate-400 text-center pt-1">+{person.ads.length - 3} more</p>
                  )}
                </div>
              )}
              {person.ads.length === 0 && (
                <p className="text-[10px] font-bold text-slate-300 text-center py-2">No active ads</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── STRATEGIST DASHBOARD ──
function StrategistDashboard({ ads, currentUser, onSelectAd, onNewAd, onNavigate }: Props) {
  const myAds = ads.filter(ad => ad.assigned_copywriter === currentUser || ad.assigned_editor === currentUser);

  const needsBrief = myAds.filter(ad => ["Idea", "Writing Brief"].includes(ad.status))
    .sort((a, b) => (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1));

  const awaitingReview = myAds.filter(ad => ["Brief Approved", "Content Ready", "Pending Upload"].includes(ad.status))
    .sort((a, b) => (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1));

  const revisionRequested = myAds.filter(ad => ["Brief Revision Required", "Ad Revision"].includes(ad.status))
    .sort((a, b) => (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1));

  const myCompleted = ads.filter(ad => ad.status === "Completed" && ad.assigned_copywriter === currentUser);
  const winners = myCompleted.filter(ad => ad.result === "Winner").length;
  const hitRate = myCompleted.length > 0 ? Math.round((winners / myCompleted.length) * 100) : 0;
  const avgRevs = myAds.length > 0
    ? (myAds.reduce((sum, ad) => sum + (ad.revision_count || 0), 0) / myAds.length).toFixed(1)
    : "0.0";

  return (
    <div className="flex-1 p-6 md:p-10 overflow-y-auto max-w-[900px] mx-auto w-full">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-800 mb-1">My Dashboard</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">Strategist view</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate?.("Ideas")}
            className="text-xs font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100"
          >
            + Log Idea
          </button>
          <button
            onClick={onNewAd}
            className="text-xs font-black text-white bg-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-700 transition-all shadow-sm"
          >
            + New Ad
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: "In Progress", val: myAds.filter(a => !["Completed", "Killed"].includes(a.status)).length },
          { label: "Hit Rate", val: hitRate + "%" },
          { label: "Avg Revisions", val: avgRevs },
        ].map((s, i) => (
          <div key={i} className="bg-white border-2 border-slate-100 rounded-2xl p-4 text-center">
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">{s.label}</p>
            <p className="text-xl font-black text-slate-800">{s.val}</p>
          </div>
        ))}
      </div>

      <Section title="Needs Brief" count={needsBrief.length} color="bg-amber-100 text-amber-700" empty="No briefs needed right now">
        {needsBrief.map(ad => <AdCard key={ad.id} ad={ad} onClick={() => onSelectAd(ad)} />)}
      </Section>
      <Section title="Awaiting My Review" count={awaitingReview.length} color="bg-indigo-100 text-indigo-700" empty="Nothing waiting for review">
        {awaitingReview.map(ad => <AdCard key={ad.id} ad={ad} onClick={() => onSelectAd(ad)} />)}
      </Section>
      <Section title="Revision Requested" count={revisionRequested.length} color="bg-rose-100 text-rose-700" empty="No revisions requested">
        {revisionRequested.map(ad => (
          <AdCard key={ad.id} ad={ad} onClick={() => onSelectAd(ad)}
            extra={ad.status === "Ad Revision" ? (
              <p className="text-[9px] font-black text-rose-500">Round {ad.revision_count || 1}/2</p>
            ) : undefined}
          />
        ))}
      </Section>
    </div>
  );
}

// ── EDITOR DASHBOARD ──
function EditorDashboard({ ads, currentUser, onSelectAd }: Props) {
  const myAds = ads.filter(ad => ad.assigned_editor === currentUser);

  const currentlyEditing = myAds.filter(ad => ad.status === "In Progress")
    .sort((a, b) => (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1));
  const waitingForMe = myAds.filter(ad => ad.status === "Editor Assigned")
    .sort((a, b) => (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1));
  const revisionRequired = myAds.filter(ad => ["Content Revision Required", "Ad Revision"].includes(ad.status))
    .sort((a, b) => (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1));

  const thisMonth = new Date();
  thisMonth.setDate(1);
  const completedThisMonth = myAds.filter(ad =>
    ad.status === "Completed" && new Date(ad.stage_updated_at) >= thisMonth
  ).length;
  const avgRevs = myAds.length > 0
    ? (myAds.reduce((sum, ad) => sum + (ad.revision_count || 0), 0) / myAds.length).toFixed(1)
    : "0.0";

  return (
    <div className="flex-1 p-6 md:p-10 overflow-y-auto max-w-[900px] mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-3xl font-black text-slate-800 mb-1">My Dashboard</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">Editor view</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
        {[
          { label: "Completed This Month", val: completedThisMonth },
          { label: "Avg Revision Rounds", val: avgRevs },
        ].map((s, i) => (
          <div key={i} className="bg-white border-2 border-slate-100 rounded-2xl p-4 text-center">
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">{s.label}</p>
            <p className="text-xl font-black text-slate-800">{s.val}</p>
          </div>
        ))}
      </div>

      <Section title="Currently Editing" count={currentlyEditing.length} color="bg-indigo-100 text-indigo-700" empty="Nothing in progress">
        {currentlyEditing.map(ad => (
          <AdCard key={ad.id} ad={ad} onClick={() => onSelectAd(ad)}
            extra={<p className="text-[9px] font-bold text-slate-400">{daysSince(ad.stage_updated_at || ad.created_at)} days in this stage</p>}
          />
        ))}
      </Section>
      <Section title="Waiting For Me" count={waitingForMe.length} color="bg-amber-100 text-amber-700" empty="Nothing waiting">
        {waitingForMe.map(ad => <AdCard key={ad.id} ad={ad} onClick={() => onSelectAd(ad)} />)}
      </Section>
      <Section title="Revision Required" count={revisionRequired.length} color="bg-rose-100 text-rose-700" empty="No revisions needed">
        {revisionRequired.map(ad => (
          <AdCard key={ad.id} ad={ad} onClick={() => onSelectAd(ad)}
            extra={<p className="text-[9px] font-black text-rose-500">Round {ad.revision_count || 1}/2</p>}
          />
        ))}
      </Section>
    </div>
  );
}

// ── VA DASHBOARD ──
function VADashboard({ ads, onSelectAd }: Props) {
  const pendingAds = ads
    .filter(ad => ad.status === "Pending Upload")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="flex-1 p-6 md:p-10 overflow-y-auto max-w-[900px] mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-800 mb-1">Upload Queue</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">
          {pendingAds.length} ads pending upload — oldest first
        </p>
      </div>

      {pendingAds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-300">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-lg font-bold">All caught up!</p>
          <p className="text-sm font-medium">No ads pending upload right now</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingAds.map(ad => (
            <div
              key={ad.id}
              className="bg-white border-2 border-slate-100 rounded-[20px] p-5 hover:border-indigo-200 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-black text-slate-800 mb-1">{ad.concept_name}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">{ad.ad_format}</span>
                    {ad.assigned_editor && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md">
                        Editor: {ad.assigned_editor}
                      </span>
                    )}
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-50 text-amber-600 rounded-md">
                      {daysSince(ad.created_at)}d old
                    </span>
                  </div>
                  {ad.review_link && (
                    <a
                      href={ad.review_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-black text-indigo-500 hover:text-indigo-700 transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      View Review File ↗
                    </a>
                  )}
                </div>
                <button
                  onClick={() => onSelectAd(ad)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm shrink-0"
                >
                  Mark Uploaded
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── CONTENT COORDINATOR DASHBOARD ──
function ContentCoordDashboard({ ads, onSelectAd }: Props) {
  const myAds = ads
    .filter(ad => ["Preparing Content", "Content Revision Required"].includes(ad.status))
    .sort((a, b) => (PRIORITY_ORDER[a.priority] || 1) - (PRIORITY_ORDER[b.priority] || 1));

  return (
    <div className="flex-1 p-6 md:p-10 overflow-y-auto max-w-[900px] mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-800 mb-1">My Queue</h2>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">Content Coordinator view</p>
      </div>

      {myAds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-300">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-lg font-bold">All clear!</p>
          <p className="text-sm">No content stages need attention right now</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myAds.map(ad => (
            <AdCard key={ad.id} ad={ad} onClick={() => onSelectAd(ad)}
              extra={
                ad.status === "Content Revision Required"
                  ? <p className="text-[9px] font-black text-rose-500 mt-1">Revision needed</p>
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── MAIN EXPORT ──
export default function DashboardView(props: Props) {
  const { currentRole } = props;
  if (currentRole === "Founder") return <FounderDashboard {...props} />;
  if (currentRole === "Strategist") return <StrategistDashboard {...props} />;
  if (currentRole === "Editor" || currentRole === "Graphic Designer") return <EditorDashboard {...props} />;
  if (currentRole === "VA") return <VADashboard {...props} />;
  if (currentRole === "Content Coordinator") return <ContentCoordDashboard {...props} />;
  return null;
}