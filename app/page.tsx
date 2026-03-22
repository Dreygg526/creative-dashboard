"use client";
import { useEffect, useRef, useMemo, useState } from "react";
import DashboardView from "./components/views/DashboardView";

// Hooks
import { useSupabaseClient } from "./hooks/useSupabaseClient";
import { useAds } from "./hooks/useAds";
import { useIdeas } from "./hooks/useIdeas";
import { useLearnings } from "./hooks/useLearnings";
import { useNotifications } from "./hooks/useNotifications";
import { useAudio } from "./hooks/useAudio";
import { useKPIs } from "./hooks/useKPIs";
import { useAuth } from "./hooks/useAuth";
import { useAdSessions, formatTimer } from "./hooks/useAdSessions";

// Components
import NotificationDropdown from "./components/NotificationDropdown";
import NewAdModal from "./components/modals/NewAdModal";
import AdDetailModal from "./components/modals/AdDetailModal";
import { PromoteIdeaModal, SpendModal } from "./components/modals/OtherModals";
import LoginPage from "./components/LoginPage";

// Views
import PipelineView from "./components/views/PipelineView";
import { MyQueueView, ManagerView, ReportsView } from "./components/views/OtherViews";
import IdeasView from "./components/views/IdeasView";
import MembersView from "./components/views/MembersView";
import LearningsView from "./components/views/LearningsView";
import SettingsView from "./components/views/SettingsView";
import ArchiveView from "./components/views/ArchiveView";

// Constants & Utils
import { PRIORITY_ORDER } from "./constants";
import { IdeaEntry } from "./types";

type ViewMode = "Dashboard" | "Pipeline" | "MyQueue" | "Manager" | "Reports" | "Ideas" | "Learnings" | "Members" | "Settings" | "Archive";

export default function App() {
  const { supabase, libError } = useSupabaseClient();
  const { isAudioUnlocked, playNotificationSound } = useAudio();
  const {
    user, profile, authLoading,
    signIn, signOut, resetPassword,
    inviteUser, getAllUsers,
    updateUserRole, deactivateUser
  } = useAuth(supabase);

  const currentUser = profile?.full_name || profile?.email || "User";
  const currentRole = profile?.role || "Editor";

  const isFounder = currentRole === "Founder";
  const isStrategist = currentRole === "Strategist";
  const isManager = isFounder || isStrategist;
  const isVA = currentRole === "VA";
  const isContentCoord = currentRole === "Content Coordinator";
  const canManageIdeas = isManager;
  const canCreateAd = isManager;

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "Dashboard";
    return (localStorage.getItem("creative_ops_view") as ViewMode) || "Dashboard";
  });

  const handleSetViewMode = (v: ViewMode) => {
    setViewMode(v);
    localStorage.setItem("creative_ops_view", v);
  };

  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [activeStage, setActiveStage] = useState("Idea");
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const currentUserRef = useRef(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  const {
    ads, loading, selectedAd, setSelectedAd,
    isNewAdOpen, setIsNewAdOpen,
    newAd, setNewAd,
    manualLogNote, setManualLogNote,
    fetchAds, handleCreateAd, handleUpdateAd, handleDeleteAd
  } = useAds(supabase, currentUser, currentRole);

  const {
    fetchIdeas,
    newIdeaText, setNewIdeaText,
    newIdeaType, setNewIdeaType,
    ideaFilter, setIdeaFilter,
    isSubmittingIdea,
    ideaToPromote, setIdeaToPromote,
    handleSubmitIdea, handleDeleteIdea, handlePromoteIdea,
    filteredIdeas, ideaCounts
  } = useIdeas(supabase, currentUser);

  const {
    learnings, fetchLearnings,
    learningsFilter, setLearningsFilter,
    isLearningFormOpen, setIsLearningFormOpen,
    newLearning, setNewLearning,
    adSearchQuery, setAdSearchQuery,
    isSubmittingLearning,
    expandedLearning, setExpandedLearning,
    handleSubmitLearning, handleDeleteLearning,
    handleMarkReviewed, handleUnmarkReviewed,
    filteredAdSearch, filteredLearnings, learningCounts
  } = useLearnings(supabase, currentUser, ads);

  const {
    notifications, fetchNotifications,
    isNotifOpen, setIsNotifOpen,
    unreadCount,
    markNotificationRead,
    handleClearAllNotifications
  } = useNotifications(supabase, currentUser, ads, setSelectedAd);

  const {
    hitRate, inTesting,
    conceptsVsIterations, avgDaysToUpload, creativeDiversity, rankedSpend,
    weeklyChartData, teamOutput, pipelineVelocityData
  } = useKPIs(ads);

  const {
    activeSessions,
    startSession,
    finishSession,
    getSessionForAd,
    fetchSessionsForAd,
    fetchAllSessions,
  } = useAdSessions(supabase, currentUser, currentRole);

  const loadAllProfiles = async () => {
    const data = await getAllUsers();
    setAllProfiles(data);
  };

  useEffect(() => {
    if (supabase && user) loadAllProfiles();
  }, [supabase, user, profile]);

  useEffect(() => {
    if (!supabase || !user) return;
    fetchAds();
    fetchIdeas();
    fetchLearnings();

    const adsChannel = supabase.channel("ads-main")
      .on("postgres_changes", { event: "*", schema: "public", table: "ads" }, () => fetchAds())
      .subscribe();
    const ideasChannel = supabase.channel("ideas-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "ideas" }, () => fetchIdeas())
      .subscribe();
    const learningsChannel = supabase.channel("learnings-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "learnings" }, () => fetchLearnings())
      .subscribe();
    const profilesChannel = supabase.channel("profiles-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => loadAllProfiles())
      .subscribe();
    const notifChannel = supabase.channel("notif-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload: any) => {
        if (payload.new.target_user === currentUserRef.current) {
          playNotificationSound();
          fetchNotifications();
        }
      })
      .subscribe((status: string) => setIsSubscribed(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(adsChannel);
      supabase.removeChannel(ideasChannel);
      supabase.removeChannel(learningsChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(notifChannel);
    };
  }, [supabase, user]);

  useEffect(() => { if (supabase && user) fetchNotifications(); }, [currentUser, supabase, user]);

  const myQueue = useMemo(() => {
    const queue = ads.filter(ad => {
      if (isVA) return ad.status === "Pending Upload";
      if (isStrategist) return ["Ad Revision", "Testing"].includes(ad.status);
      if (isContentCoord) return ["Preparing Content", "Content Revision Required"].includes(ad.status);
      if (ad.assigned_editor === currentUser) return ["Editor Assigned", "In Progress", "Content Revision Required", "Ad Revision"].includes(ad.status);
      return false;
    });
    return queue.sort((a, b) => {
      const pA = PRIORITY_ORDER[a.priority || "Medium"];
      const pB = PRIORITY_ORDER[b.priority || "Medium"];
      if (pA !== pB) return pA - pB;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [ads, currentUser, currentRole]);

  const workloads = useMemo(() => {
    const people = Array.from(new Set([
      ...ads.map(a => a.assigned_editor),
      ...ads.map(a => a.assigned_copywriter),
      "VA", "Strategist"
    ])).filter((p): p is string => !!p && p !== "Founder");
    const result: Record<string, typeof ads> = {};
    people.forEach(p => {
      result[p] = ads.filter(ad =>
        (ad.assigned_editor === p ||
          ad.assigned_copywriter === p ||
          (p === "VA" && ad.status === "Pending Upload") ||
          (p === "Strategist" && ["Ad Revision", "Testing"].includes(ad.status))) &&
        !["Completed", "Killed"].includes(ad.status)
      );
    });
    return result;
  }, [ads]);

  const allEditors = useMemo(() => {
    return allProfiles
      .filter(p => p.role === "Editor" && p.is_active)
      .map((p: any) => p.full_name)
      .sort();
  }, [allProfiles]);

  const allCopywriters = useMemo(() => {
    return allProfiles
      .filter(p => p.role === "Copywriter" && p.is_active)
      .map((p: any) => p.full_name)
      .sort();
  }, [allProfiles]);

  const allStrategists = useMemo(() => {
    return allProfiles
      .filter(p => p.role === "Strategist" && p.is_active)
      .map((p: any) => p.full_name)
      .sort();
  }, [allProfiles]);

  // Bulk action handlers
  const handleBulkReassign = async (adIds: string[], editor: string) => {
    for (const id of adIds) {
      await supabase.from("ads").update({ assigned_editor: editor }).eq("id", id);
    }
    fetchAds();
  };

  const handleBulkPriority = async (adIds: string[], priority: string) => {
    for (const id of adIds) {
      await supabase.from("ads").update({ priority }).eq("id", id);
    }
    fetchAds();
  };

  const handleBulkKill = async (adIds: string[]) => {
    for (const id of adIds) {
      await supabase.from("ads").update({
        status: "Killed",
        killed_at: new Date().toISOString()
      }).eq("id", id);
    }
    fetchAds();
  };

  const handleBulkMove = async (adIds: string[], status: string) => {
    for (const id of adIds) {
      await supabase.from("ads").update({ status }).eq("id", id);
    }
    fetchAds();
  };

  const handleBulkDelete = async (adIds: string[]) => {
    for (const id of adIds) {
      await supabase.from("ads").delete().eq("id", id);
    }
    fetchAds();
  };

  // Unified select ad handler — starts session automatically
  const handleSelectAd = (ad: any) => {
    setSelectedAd(ad);
    if (ad) startSession(ad.id);
  };

  const navItems: ViewMode[] = isFounder
    ? ["Dashboard", "Pipeline", "MyQueue", "Reports", "Ideas", "Learnings", "Members", "Archive"]
    : isStrategist
    ? ["Dashboard", "Pipeline", "MyQueue", "Reports", "Ideas", "Learnings"]
    : isVA
    ? ["Dashboard"]
    : isContentCoord
    ? ["Dashboard", "MyQueue", "Ideas"]
    : ["Dashboard", "MyQueue", "Ideas"];

  if (libError) return (
    <div className="min-h-screen flex items-center justify-center p-4 text-rose-600 font-bold">{libError}</div>
  );

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">Loading...</div>
  );

  if (!user) return (
    <LoginPage onLogin={signIn} onForgotPassword={resetPassword} />
  );

  if (!supabase) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">Initializing...</div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans text-[13px] flex flex-col">
      <datalist id="editor-autocomplete">{allEditors.map(n => <option key={n} value={n} />)}</datalist>
      <datalist id="copywriter-autocomplete">{allCopywriters.map(n => <option key={n} value={n} />)}</datalist>

      {/* ── NAV ── */}
      <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="p-3 md:p-4 max-w-[1800px] mx-auto border-b border-slate-50">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">

            <div className="flex justify-between items-center w-full lg:w-auto">
              <div className="flex items-center gap-3">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-800">Creative Ops</h1>
                <div className={`w-2 h-2 rounded-full ${isSubscribed ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
              </div>

              {/* Active session indicator in nav */}
              {Object.keys(activeSessions).length > 0 && (
                <div className="hidden lg:flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                    {Object.keys(activeSessions).length} Active Session{Object.keys(activeSessions).length > 1 ? "s" : ""}
                  </span>
                  <span className="text-[11px] font-black text-indigo-800 font-mono">
                    {formatTimer(Math.max(...Object.values(activeSessions).map(s => s.elapsedSeconds)))}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 lg:hidden">
                <div className="relative">
                  <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="text-xl p-2 relative">
                    🔔
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] min-w-[16px] h-[16px] flex items-center justify-center font-black rounded-full ring-2 ring-white animate-bounce">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  {isNotifOpen && (
                    <div className="absolute right-0 top-12">
                      <NotificationDropdown
                        notifications={notifications}
                        currentUser={currentUser}
                        unreadCount={unreadCount}
                        onRead={markNotificationRead}
                        onClearAll={handleClearAllNotifications}
                      />
                    </div>
                  )}
                </div>
                {canCreateAd && (
                  <button onClick={() => setIsNewAdOpen(true)} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium text-xs">
                    + New
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:gap-4">
              <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner flex-wrap gap-1">
                {navItems.map(v => (
                  <button
                    key={v}
                    onClick={() => handleSetViewMode(v)}
                    className={`relative px-4 py-1.5 rounded-lg font-bold transition-all ${viewMode === v ? "bg-white shadow-sm text-indigo-600" : "text-slate-500"}`}
                  >
                    {v === "MyQueue" ? "My Queue" : v}
                    {v === "Ideas" && ideaCounts.pending > 0 && (
                      <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-900 text-[8px] min-w-[15px] h-[15px] flex items-center justify-center font-black rounded-full">
                        {ideaCounts.pending}
                      </span>
                    )}
                  </button>
                ))}
                {isFounder && (
                  <button
                    onClick={() => handleSetViewMode("Manager")}
                    className={`px-4 py-1.5 rounded-lg font-bold transition-all ${viewMode === "Manager" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500"}`}
                  >
                    Workload
                  </button>
                )}
                {isFounder && (
                  <button
                    onClick={() => handleSetViewMode("Settings")}
                    className={`px-4 py-1.5 rounded-lg font-bold transition-all ${viewMode === "Settings" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500"}`}
                  >
                    Settings
                  </button>
                )}
              </div>

              <div className="relative">
                <div
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-2 border border-slate-200 bg-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-600 text-[10px]">
                    {currentUser.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 leading-none">{currentUser}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{currentRole}</p>
                  </div>
                  <span className={`text-[10px] transition-transform ${isUserDropdownOpen ? "rotate-180" : ""}`}>▼</span>
                  <button
                    onClick={e => { e.stopPropagation(); playNotificationSound(); }}
                    className={`ml-1 p-1 rounded-md transition-all ${isAudioUnlocked ? "text-emerald-600" : "text-slate-400"}`}
                  >
                    {isAudioUnlocked ? "🔊" : "🔇"}
                  </button>
                </div>
                {isUserDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 overflow-hidden">
                    <div className="px-4 py-2 border-b border-slate-50">
                      <p className="text-xs font-black text-slate-700">{currentUser}</p>
                      <p className="text-[10px] text-slate-400">{profile?.email}</p>
                    </div>
                    {isFounder && (
                      <button
                        onClick={() => { handleSetViewMode("Settings"); setIsUserDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-slate-50 text-slate-600 transition-colors"
                      >
                        ⚙️ Settings
                      </button>
                    )}
                    <button
                      onClick={() => { signOut(); setIsUserDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-rose-50 text-rose-500 transition-colors"
                    >
                      🚪 Sign Out
                    </button>
                  </div>
                )}
              </div>

              <div className="hidden lg:relative lg:block">
                <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="text-xl p-2 hover:bg-slate-100 rounded-full relative transition-colors">
                  🔔
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-rose-500 text-white text-[9px] min-w-[16px] h-[16px] flex items-center justify-center font-black rounded-full ring-2 ring-white animate-bounce">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {isNotifOpen && (
                  <NotificationDropdown
                    notifications={notifications}
                    currentUser={currentUser}
                    unreadCount={unreadCount}
                    onRead={markNotificationRead}
                    onClearAll={handleClearAllNotifications}
                  />
                )}
              </div>

              {canCreateAd && (
                <button
                  onClick={() => setIsNewAdOpen(true)}
                  className="hidden lg:block bg-indigo-600 text-white px-5 py-2 rounded-lg font-black hover:bg-indigo-700 text-sm shadow-sm transition-all"
                >
                  + New Ad
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {viewMode === "Dashboard" && (
          <DashboardView
            ads={ads}
            currentUser={currentUser}
            currentRole={currentRole}
            onSelectAd={handleSelectAd}
            onNewAd={() => setIsNewAdOpen(true)}
            onNavigate={handleSetViewMode}
            allProfiles={allProfiles}
            activeSessions={activeSessions}
            formatTimer={formatTimer}
          />
        )}
        {viewMode === "Pipeline" && (isFounder || isStrategist) && (
          <PipelineView
            ads={ads}
            activeStage={activeStage}
            setActiveStage={setActiveStage}
            setSelectedAd={handleSelectAd}
            currentRole={currentRole}
            currentUser={currentUser}
            allEditors={allEditors}
            allStrategists={allStrategists}
            onBulkReassign={handleBulkReassign}
            onBulkPriority={handleBulkPriority}
            onBulkKill={handleBulkKill}
            onBulkMove={handleBulkMove}
            onBulkDelete={handleBulkDelete}
            activeSessions={activeSessions}
            formatTimer={formatTimer}
          />
        )}
        {viewMode === "MyQueue" && (
          <MyQueueView
            currentUser={currentUser}
            myQueue={myQueue}
            setSelectedAd={handleSelectAd}
            activeSessions={activeSessions}
            formatTimer={formatTimer}
          />
        )}
        {viewMode === "Manager" && isFounder && (
          <ManagerView workloads={workloads} setSelectedAd={handleSelectAd} />
        )}
        {viewMode === "Reports" && isManager && (
          <ReportsView
            ads={ads}
            weeklyChartData={weeklyChartData}
            avgDaysToUpload={avgDaysToUpload}
            pipelineVelocityData={pipelineVelocityData}
            teamOutput={teamOutput}
            hitRate={hitRate}
            inTesting={inTesting}
            conceptsVsIterations={conceptsVsIterations}
            creativeDiversity={creativeDiversity}
            rankedSpend={rankedSpend}
          />
        )}
        {viewMode === "Ideas" && (
          <IdeasView
            currentUser={currentUser}
            ideas={[]}
            filteredIdeas={filteredIdeas}
            ideaCounts={ideaCounts}
            ideaFilter={ideaFilter}
            setIdeaFilter={setIdeaFilter}
            newIdeaText={newIdeaText}
            setNewIdeaText={setNewIdeaText}
            newIdeaType={newIdeaType}
            setNewIdeaType={setNewIdeaType}
            isSubmittingIdea={isSubmittingIdea}
            onSubmit={handleSubmitIdea}
            onDelete={handleDeleteIdea}
            onPromote={(idea: IdeaEntry) => setIdeaToPromote(idea)}
            canManageIdeas={canManageIdeas}
          />
        )}
        {viewMode === "Learnings" && (
          <LearningsView
            learnings={learnings}
            filteredLearnings={filteredLearnings}
            learningCounts={learningCounts}
            learningsFilter={learningsFilter}
            setLearningsFilter={setLearningsFilter}
            isLearningFormOpen={isLearningFormOpen}
            setIsLearningFormOpen={setIsLearningFormOpen}
            newLearning={newLearning}
            setNewLearning={setNewLearning}
            adSearchQuery={adSearchQuery}
            setAdSearchQuery={setAdSearchQuery}
            filteredAdSearch={filteredAdSearch}
            isSubmittingLearning={isSubmittingLearning}
            onSubmit={handleSubmitLearning}
            onDelete={handleDeleteLearning}
            onMarkReviewed={handleMarkReviewed}
            onUnmarkReviewed={handleUnmarkReviewed}
            currentUser={currentUser}
            currentRole={currentRole}
            expandedLearning={expandedLearning}
            setExpandedLearning={setExpandedLearning}
          />
        )}
        {viewMode === "Members" && isFounder && (
          <MembersView
            profiles={allProfiles}
            currentUser={currentUser}
          />
        )}
        {viewMode === "Archive" && isFounder && (
          <ArchiveView
            ads={ads}
            onSelectAd={handleSelectAd}
          />
        )}
        {viewMode === "Settings" && isFounder && profile && (
          <SettingsView
            currentProfile={profile}
            onInviteUser={inviteUser}
            onUpdateRole={updateUserRole}
            onDeactivateUser={deactivateUser}
            getAllUsers={getAllUsers}
          />
        )}
      </main>

      {/* ── MODALS ── */}
      {isNewAdOpen && canCreateAd && (
        <NewAdModal
          newAd={newAd}
          setNewAd={setNewAd}
          onSubmit={handleCreateAd}
          onClose={() => setIsNewAdOpen(false)}
          editors={allEditors}
          copywriters={allCopywriters}
        />
      )}
      {ideaToPromote && (
        <PromoteIdeaModal
          idea={ideaToPromote}
          onConfirm={(idea) => handlePromoteIdea(idea, setNewAd, setIsNewAdOpen, handleSetViewMode)}
          onCancel={() => setIdeaToPromote(null)}
        />
      )}
      {selectedAd && (
        <AdDetailModal
          selectedAd={selectedAd}
          ads={ads}
          manualLogNote={manualLogNote}
          setManualLogNote={setManualLogNote}
          setSelectedAd={setSelectedAd}
          onUpdate={handleUpdateAd}
          onDelete={handleDeleteAd}
          currentRole={currentRole}
          currentUser={currentUser}
          allEditors={allEditors}
          supabase={supabase}
          activeSession={getSessionForAd(selectedAd.id)}
          onFinishSession={() => finishSession(selectedAd.id)}
          fetchSessionsForAd={fetchSessionsForAd}
          fetchAllSessions={fetchAllSessions}
          formatTimer={formatTimer}
        />
      )}
    </div>
  );
}