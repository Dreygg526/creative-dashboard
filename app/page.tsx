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
  const { isAudioUnlocked, unlockAudio, playNotificationSound } = useAudio();

  const playNotificationSoundRef = useRef(playNotificationSound);
  useEffect(() => {
    playNotificationSoundRef.current = playNotificationSound;
  }, [playNotificationSound]);

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
  const canCreateAd = true;

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

  const [products, setProducts] = useState<string[]>([]);

  const loadProducts = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "products")
      .single();
    if (data?.value && Array.isArray(data.value)) {
      setProducts(data.value);
    }
  };

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

  const fetchNotificationsRef = useRef(fetchNotifications);
  useEffect(() => {
    fetchNotificationsRef.current = fetchNotifications;
  }, [fetchNotifications]);

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
    if (supabase && user) {
      loadAllProfiles();
      loadProducts();
    }
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
    const settingsChannel = supabase.channel("settings-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, () => loadProducts())
      .subscribe();
    const notifChannel = supabase.channel("notif-realtime-v2")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload: any) => {
        console.log("🔔 NOTIF FIRED", payload.new);
        console.log("🔔 TARGET:", payload.new.target_user);
        console.log("🔔 CURRENT USER:", currentUserRef.current);
        console.log("🔔 MATCH:", payload.new.target_user === currentUserRef.current);
        if (payload.new.target_user === currentUserRef.current) {
          console.log("🔊 PLAYING SOUND NOW");
          playNotificationSoundRef.current();
          fetchNotificationsRef.current();
        }
      })
      .subscribe((status: string) => {
        console.log("📡 NOTIF CHANNEL STATUS:", status);
        setIsSubscribed(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(adsChannel);
      supabase.removeChannel(ideasChannel);
      supabase.removeChannel(learningsChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(notifChannel);
    };
  }, [supabase, user?.id]);

  useEffect(() => { if (supabase && user) fetchNotificationsRef.current(); }, [currentUser, supabase, user]);

  const myQueue = useMemo(() => {
    const queue = ads.filter(ad => {
      if (isVA) return ad.status === "Pending Upload";
      if (isStrategist) return ["Ad Revision", "Testing", "Done, Waiting for Approval"].includes(ad.status);
      if (isContentCoord) return ["Preparing Content", "Content Revision Required"].includes(ad.status);
      if (ad.assigned_editor === currentUser) return ["Editor Assigned", "In Progress", "Done, Waiting for Approval", "Content Revision Required", "Ad Revision"].includes(ad.status);
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
          (p === "Strategist" && ["Ad Revision", "Testing", "Done, Waiting for Approval"].includes(ad.status))) &&
        !["Completed", "Killed"].includes(ad.status)
      );
    });
    return result;
  }, [ads]);

  const allEditors = useMemo(() => {
    return allProfiles
      .filter(p => (p.role === "Editor" || p.role === "Graphic Designer") && p.is_active)
      .map((p: any) => p.full_name)
      .sort();
  }, [allProfiles]);

  const allEditorProfiles = useMemo(() => {
    return allProfiles
      .filter(p => (p.role === "Editor" || p.role === "Graphic Designer") && p.is_active)
      .sort((a: any, b: any) => a.full_name.localeCompare(b.full_name));
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

  const handleSelectAd = (ad: any) => {
    setSelectedAd(ad);
    if (ad) startSession(ad);
  };

  const notifyFounder = async (adId: string, adName: string, message?: string) => {
    const { data: founders } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("role", "Founder")
      .eq("is_active", true)
      .limit(1);
    const founderName = founders?.[0]?.full_name;
    if (founderName) {
      await supabase.from("notifications").insert([{
        ad_id: adId,
        message: message || `✅ ${currentUser} finished working on "${adName}"`,
        target_user: founderName,
        is_read: false
      }]);
    }
  };

  const handleUpdateAdWithSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAd) return;

    const originalAd = ads.find(a => a.id === selectedAd.id);
    const stageChanged = originalAd && selectedAd.status !== originalAd.status;

    if (stageChanged && !isFounder) {
      const editorStages = ["Editor Assigned", "Ad Revision", "Brief Approved"];
      const strategistStages = ["Brief Revision Required", "Testing", "Completed"];
      const skipFounderNotify = [...editorStages, ...strategistStages, "Done, Waiting for Approval", "Pending Upload"];

      if (selectedAd.status === "Done, Waiting for Approval") {
        const session = activeSessions[selectedAd.id];
        if (session) await finishSession(selectedAd.id);
      } else if (!skipFounderNotify.includes(selectedAd.status)) {
        await notifyFounder(
          selectedAd.id,
          selectedAd.concept_name,
          `🔄 ${currentUser} moved "${selectedAd.concept_name}" → ${selectedAd.status}`
        );
      }
    }

    handleUpdateAd(e);
  };

  const navItems: ViewMode[] = isFounder
    ? ["Dashboard", "Pipeline", "MyQueue", "Reports", "Ideas", "Learnings", "Members", "Archive"]
    : isStrategist
    ? ["Dashboard", "Pipeline", "MyQueue", "Reports", "Ideas", "Learnings", "Manager"]
    : isVA
    ? ["Dashboard", "Pipeline"]
    : isContentCoord
    ? ["Dashboard", "Pipeline", "MyQueue", "Ideas"]
    : ["Dashboard", "Pipeline", "MyQueue", "Ideas"];

  if (libError) return (
    <div className="min-h-screen flex items-center justify-center p-4 text-rose-600 font-bold">{libError}</div>
  );
  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">Loading...</div>
  );
  if (!user) return (
    <div onClick={unlockAudio} onKeyDown={unlockAudio}>
      <LoginPage onLogin={signIn} onForgotPassword={resetPassword} />
    </div>
  );
  if (!supabase) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">Initializing...</div>
  );

  return (
    <div className="min-h-screen bg-[#131314] text-slate-100 font-sans text-[13px] flex flex-col" onClick={unlockAudio}>
      <datalist id="editor-autocomplete">{allEditors.map(n => <option key={n} value={n} />)}</datalist>
      <datalist id="copywriter-autocomplete">{allCopywriters.map(n => <option key={n} value={n} />)}</datalist>

      {/* ── NAV ── */}
      <nav className="bg-[#1e1f20] border-b border-white/10 shadow-sm sticky top-0 z-40">
        <div className="p-3 md:p-4 max-w-[1800px] mx-auto border-b border-white/5">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">

            <div className="flex justify-between items-center w-full lg:w-auto">
              <div className="flex items-center gap-3">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">Creative Ops</h1>
                <div className={`w-2 h-2 rounded-full ${isSubscribed ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
              </div>

              {Object.keys(activeSessions).length > 0 && (
                <div className="hidden lg:flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 px-3 py-1.5 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                    {Object.keys(activeSessions).length} Active Session{Object.keys(activeSessions).length > 1 ? "s" : ""}
                  </span>
                  <span className="text-[11px] font-black text-indigo-200 font-mono">
                    {formatTimer(Math.max(...Object.values(activeSessions).map(s => s.elapsedSeconds)))}
                  </span>
                  <button
                    onClick={async () => {
                      if (confirm("Clear all active sessions?")) {
                        for (const adId of Object.keys(activeSessions)) {
                          await finishSession(adId);
                        }
                      }
                    }}
                    className="text-[9px] font-black text-indigo-400 hover:text-rose-400 uppercase tracking-widest ml-1 border-l border-indigo-500/30 pl-2 transition-colors"
                  >
                    Clear
                  </button>
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
              <div className="flex bg-white/5 p-1 rounded-xl shadow-inner flex-wrap gap-1">
                {navItems.map(v => (
                  <button
                    key={v}
                    onClick={() => handleSetViewMode(v)}
                    className={`relative px-4 py-1.5 rounded-lg font-bold transition-all ${viewMode === v ? "bg-white/10 shadow-sm text-indigo-300" : "text-slate-400 hover:text-slate-200"}`}
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
                    className={`px-4 py-1.5 rounded-lg font-bold transition-all ${viewMode === "Manager" ? "bg-white/10 shadow-sm text-indigo-300" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    Workload
                  </button>
                )}
                {isFounder && (
                  <button
                    onClick={() => handleSetViewMode("Settings")}
                    className={`px-4 py-1.5 rounded-lg font-bold transition-all ${viewMode === "Settings" ? "bg-white/10 shadow-sm text-indigo-300" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    Settings
                  </button>
                )}
              </div>

              <div className="relative">
                <div
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-1.5 rounded-lg shadow-sm hover:bg-white/10 cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-600 text-[10px]">
                    {currentUser.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-100 leading-none">{currentUser}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{currentRole}</p>
                  </div>
                  <span className={`text-[10px] transition-transform ${isUserDropdownOpen ? "rotate-180" : ""}`}>▼</span>
                  <button
                    onClick={e => { e.stopPropagation(); unlockAudio(); playNotificationSound(); }}
                    className={`ml-1 p-1 rounded-md transition-all ${isAudioUnlocked ? "text-emerald-400" : "text-slate-500 animate-pulse"}`}
                    title={isAudioUnlocked ? "Sound ON" : "Click to enable sounds"}
                  >
                    {isAudioUnlocked ? "🔊" : "🔇"}
                  </button>
                </div>
                {isUserDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-[#2a2b2c] border border-white/10 rounded-xl shadow-xl z-50 py-2 overflow-hidden">
                    <div className="px-4 py-2 border-b border-white/5">
                      <p className="text-xs font-black text-slate-100">{currentUser}</p>
                      <p className="text-[10px] text-slate-400">{profile?.email}</p>
                    </div>
                    {isFounder && (
                      <button
                        onClick={() => { handleSetViewMode("Settings"); setIsUserDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-white/5 text-slate-300 transition-colors"
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
                <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="text-xl p-2 hover:bg-white/5 rounded-full relative transition-colors">
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
                  className="hidden lg:block bg-indigo-500 text-white px-5 py-2 rounded-lg font-black hover:bg-indigo-400 text-sm shadow-sm transition-all"
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
            supabase={supabase}
          />
        )}
        {viewMode === "Pipeline" && (
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
        {viewMode === "Manager" && (isFounder || isStrategist) && (
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
          <MembersView profiles={allProfiles} currentUser={currentUser} />
        )}
        {viewMode === "Archive" && isFounder && (
          <ArchiveView ads={ads} onSelectAd={handleSelectAd} />
        )}
        {viewMode === "Settings" && isFounder && profile && (
          <SettingsView
            currentProfile={profile}
            onInviteUser={inviteUser}
            onUpdateRole={updateUserRole}
            onDeactivateUser={deactivateUser}
            getAllUsers={getAllUsers}
            supabase={supabase}
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
          currentRole={currentRole}
          currentUser={currentUser}
          allEditorProfiles={allEditorProfiles}
          products={products}
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
          onUpdate={handleUpdateAdWithSession}
          onDelete={handleDeleteAd}
          currentRole={currentRole}
          currentUser={currentUser}
          allEditors={allEditors}
          allEditorProfiles={allEditorProfiles}
          allStrategists={allStrategists}
          supabase={supabase}
          activeSession={getSessionForAd(selectedAd.id, selectedAd)}
          onFinishSession={async () => {
            await finishSession(selectedAd.id);
            await notifyFounder(selectedAd.id, selectedAd.concept_name);
          }}
          fetchSessionsForAd={fetchSessionsForAd}
          fetchAllSessions={fetchAllSessions}
          formatTimer={formatTimer}
          products={products}
        />
      )}
    </div>
  );
}