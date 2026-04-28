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
import { PromoteIdeaModal } from "./components/modals/OtherModals";
import LoginPage from "./components/LoginPage";

// Views
import PipelineView from "./components/views/PipelineView";
import { MyQueueView, ManagerView, ReportsView } from "./components/views/OtherViews";
import IdeasView from "./components/views/IdeasView";
import MembersView from "./components/views/MembersView";
import LearningsView from "./components/views/LearningsView";
import SettingsView from "./components/views/SettingsView";
import ArchiveView from "./components/views/ArchiveView";

// Constants
import { PRIORITY_ORDER } from "./constants";
import { IdeaEntry } from "./types";

type ViewMode = "Dashboard" | "Pipeline" | "MyQueue" | "Manager" | "Reports" | "Ideas" | "Learnings" | "Members" | "Settings" | "Archive";

const NAV_ICONS: Record<string, string> = {
  Dashboard: "⊞",
  Pipeline: "◫",
  MyQueue: "✓",
  Manager: "⊕",
  Reports: "▦",
  Ideas: "💡",
  Learnings: "🧠",
  Members: "👥",
  Archive: "📦",
  Settings: "⚙️",
  Workload: "📊",
};

export default function App() {
  const { supabase, libError } = useSupabaseClient();
  const { isAudioUnlocked, unlockAudio, playNotificationSound } = useAudio();

  const playNotificationSoundRef = useRef(playNotificationSound);
  useEffect(() => { playNotificationSoundRef.current = playNotificationSound; }, [playNotificationSound]);

  const {
    user, profile, authLoading,
    signIn, signOut, resetPassword,
    inviteUser, getAllUsers,
    updateUserRole, deactivateUser
  } = useAuth(supabase);

  const currentUser = (profile?.full_name || profile?.email || "User").trim();
  const currentRole = profile?.role || "Editor";

  const isFounder = currentRole === "Founder";
  const isStrategist = currentRole === "Strategist";
  const isManager = isFounder || isStrategist;
  const isVA = currentRole === "VA";
  const isContentCoord = currentRole === "Content Coordinator";
  const isMediaBuyer = currentRole === "Media Buyer";
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [products, setProducts] = useState<string[]>([]);

  const loadProducts = async () => {
    if (!supabase) return;
    const { data } = await supabase.from("settings").select("value").eq("key", "products").single();
    if (data?.value && Array.isArray(data.value)) setProducts(data.value);
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
  useEffect(() => { fetchNotificationsRef.current = fetchNotifications; }, [fetchNotifications]);

  const { hitRate, inTesting, conceptsVsIterations, avgDaysToUpload, creativeDiversity, rankedSpend, weeklyChartData, teamOutput, pipelineVelocityData } = useKPIs(ads);

  const {
    activeSessions, startSession, finishSession,
    getSessionForAd, fetchSessionsForAd, fetchAllSessions,
  } = useAdSessions(supabase, currentUser, currentRole);

  const loadAllProfiles = async () => {
    const data = await getAllUsers();
    setAllProfiles(data);
  };

  useEffect(() => {
    if (supabase && user) { loadAllProfiles(); loadProducts(); }
  }, [supabase, user, profile]);

  useEffect(() => {
    if (!supabase || !user) return;
    fetchAds(); fetchIdeas(); fetchLearnings();

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
        if (payload.new.target_user?.trim() === currentUserRef.current?.trim()) {
          playNotificationSoundRef.current();
          fetchNotificationsRef.current();
        }
      })
      .subscribe((status: string) => setIsSubscribed(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(adsChannel);
      supabase.removeChannel(ideasChannel);
      supabase.removeChannel(learningsChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(notifChannel);
    };
  }, [supabase, user?.id]);

  useEffect(() => {
    if (supabase && user) fetchNotificationsRef.current();
  }, [currentUser, supabase, user]);

  const myQueue = useMemo(() => {
    const queue = ads.filter(ad => {
      if (isVA) return ad.status === "Pending Upload";
      if (isMediaBuyer) return ["Pending Upload", "Testing"].includes(ad.status);
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
        (ad.assigned_editor === p || ad.assigned_copywriter === p ||
          (p === "VA" && ad.status === "Pending Upload") ||
          (p === "Strategist" && ["Ad Revision", "Testing", "Done, Waiting for Approval"].includes(ad.status))) &&
        !["Winner", "Killed"].includes(ad.status)
      );
    });
    return result;
  }, [ads]);

  const allEditors = useMemo(() => allProfiles.filter(p => (p.role === "Editor" || p.role === "Graphic Designer") && p.is_active).map((p: any) => p.full_name).sort(), [allProfiles]);
  const allEditorProfiles = useMemo(() => allProfiles.filter(p => (p.role === "Editor" || p.role === "Graphic Designer") && p.is_active).sort((a: any, b: any) => a.full_name.localeCompare(b.full_name)), [allProfiles]);
  const allCopywriters = useMemo(() => allProfiles.filter(p => p.role === "Copywriter" && p.is_active).map((p: any) => p.full_name).sort(), [allProfiles]);
  const allStrategists = useMemo(() => allProfiles.filter(p => p.role === "Strategist" && p.is_active).map((p: any) => p.full_name).sort(), [allProfiles]);
  const allStrategistProfiles = useMemo(() => allProfiles.filter(p => (p.role === "Strategist" || p.role === "Founder") && p.is_active).sort((a: any, b: any) => a.full_name.localeCompare(b.full_name)), [allProfiles]);

  const handleBulkReassign = async (adIds: string[], editor: string) => {
    for (const id of adIds) await supabase.from("ads").update({ assigned_editor: editor }).eq("id", id);
    fetchAds();
  };
  const handleBulkPriority = async (adIds: string[], priority: string) => {
    for (const id of adIds) await supabase.from("ads").update({ priority }).eq("id", id);
    fetchAds();
  };
  const handleBulkKill = async (adIds: string[]) => {
    for (const id of adIds) await supabase.from("ads").update({ status: "Killed", killed_at: new Date().toISOString() }).eq("id", id);
    fetchAds();
  };
  const handleBulkMove = async (adIds: string[], status: string) => {
    for (const id of adIds) await supabase.from("ads").update({ status }).eq("id", id);
    fetchAds();
  };
  const handleBulkDelete = async (adIds: string[]) => {
    for (const id of adIds) await supabase.from("ads").delete().eq("id", id);
    fetchAds();
  };

  const handleSelectAd = (ad: any) => { setSelectedAd(ad); if (ad) startSession(ad); };

  const notifyFounder = async (adId: string, adName: string, message?: string) => {
    const { data: founders } = await supabase.from("profiles").select("full_name").eq("role", "Founder").eq("is_active", true).limit(1);
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
      const skipFounderNotify = ["Editor Assigned", "Ad Revision", "Brief Approved", "Brief Revision Required", "Testing", "Done, Waiting for Approval", "Pending Upload"];
      if (selectedAd.status === "Done, Waiting for Approval") {
        const session = activeSessions[selectedAd.id];
        if (session) await finishSession(selectedAd.id);
      } else if (!skipFounderNotify.includes(selectedAd.status)) {
        await notifyFounder(selectedAd.id, selectedAd.concept_name, `🔄 ${currentUser} moved "${selectedAd.concept_name}" → ${selectedAd.status}`);
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
    : isMediaBuyer
    ? ["Dashboard", "Pipeline"]
    : ["Dashboard", "Pipeline", "MyQueue", "Ideas"];

  if (libError) return <div className="min-h-screen flex items-center justify-center p-4 text-red-600 font-bold">{libError}</div>;
  if (authLoading) return <div className="min-h-screen flex items-center justify-center text-gray-500 font-medium">Loading...</div>;
  if (!user) return (
    <div onClick={unlockAudio} onKeyDown={unlockAudio}>
      <LoginPage onLogin={signIn} onForgotPassword={resetPassword} />
    </div>
  );
  if (!supabase) return <div className="min-h-screen flex items-center justify-center text-gray-500 font-medium">Initializing...</div>;

  return (
    <div className="min-h-screen bg-[#f8faf9] text-gray-900 font-sans text-[13px] flex" onClick={unlockAudio}>
      <datalist id="editor-autocomplete">{allEditors.map(n => <option key={n} value={n} />)}</datalist>
      <datalist id="copywriter-autocomplete">{allCopywriters.map(n => <option key={n} value={n} />)}</datalist>

      {/* ── SIDEBAR ── */}
      <aside className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-40 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? "w-16" : "w-56"}`}>

        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-gray-100">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-green-700 flex items-center justify-center text-white font-black text-xs">C</div>
              <span className="font-black text-gray-900 text-sm">Creative Ops</span>
            </div>
          )}
          {isSidebarCollapsed && (
            <div className="w-7 h-7 rounded-lg bg-green-700 flex items-center justify-center text-white font-black text-xs mx-auto">C</div>
          )}
          {!isSidebarCollapsed && (
            <button onClick={() => setIsSidebarCollapsed(true)} className="text-gray-400 hover:text-gray-600 transition-colors text-xs font-black">
              &laquo;
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {isSidebarCollapsed && (
          <button onClick={() => setIsSidebarCollapsed(false)} className="py-2 text-gray-400 hover:text-gray-600 transition-colors text-center text-xs font-black">
            &raquo;
          </button>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {!isSidebarCollapsed && (
            <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest px-2 mb-2">Main</p>
          )}
          {navItems.map(v => {
            const isActive = viewMode === v;
            return (
              <button
                key={v}
                onClick={() => handleSetViewMode(v)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-[12px] transition-all relative ${
                  isActive
                    ? "bg-green-50 text-green-800 font-black"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
                title={isSidebarCollapsed ? (v === "MyQueue" ? "My Queue" : v) : ""}
              >
                <span className="text-base shrink-0">{NAV_ICONS[v] || "•"}</span>
                {!isSidebarCollapsed && (
                  <span>{v === "MyQueue" ? "My Queue" : v}</span>
                )}
                {v === "Ideas" && ideaCounts.pending > 0 && (
                  <span className={`bg-amber-400 text-white text-[8px] min-w-[16px] h-[16px] flex items-center justify-center font-black rounded-full ${isSidebarCollapsed ? "absolute top-1 right-1" : "ml-auto"}`}>
                    {ideaCounts.pending}
                  </span>
                )}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-green-700 rounded-r-full" />
                )}
              </button>
            );
          })}

          {/* Extra nav for founder */}
          {isFounder && !isSidebarCollapsed && (
            <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest px-2 mt-4 mb-2">Management</p>
          )}
          {isFounder && (
            <button
              onClick={() => handleSetViewMode("Manager")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-[12px] transition-all relative ${
                viewMode === "Manager" ? "bg-green-50 text-green-800 font-black" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
              title={isSidebarCollapsed ? "Workload" : ""}
            >
              <span className="text-base shrink-0">{NAV_ICONS["Workload"]}</span>
              {!isSidebarCollapsed && <span>Workload</span>}
              {viewMode === "Manager" && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-green-700 rounded-r-full" />}
            </button>
          )}
          {isFounder && (
            <button
              onClick={() => handleSetViewMode("Settings")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-[12px] transition-all relative ${
                viewMode === "Settings" ? "bg-green-50 text-green-800 font-black" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
              title={isSidebarCollapsed ? "Settings" : ""}
            >
              <span className="text-base shrink-0">{NAV_ICONS["Settings"]}</span>
              {!isSidebarCollapsed && <span>Settings</span>}
              {viewMode === "Settings" && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-green-700 rounded-r-full" />}
            </button>
          )}
        </nav>

        {/* User section at bottom */}
        <div className="border-t border-gray-100 p-3">
          <div
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-all relative"
          >
            <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center font-black text-green-700 text-[11px] shrink-0">
              {currentUser.charAt(0).toUpperCase()}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-gray-800 truncate leading-none">{currentUser}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{currentRole}</p>
              </div>
            )}
            {isUserDropdownOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-2 overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs font-black text-gray-800">{currentUser}</p>
                  <p className="text-[10px] text-gray-400">{profile?.email}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); unlockAudio(); playNotificationSound(); }}
                  className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-gray-50 text-gray-600 transition-colors"
                >
                  {isAudioUnlocked ? "🔊 Sound ON" : "🔇 Enable Sound"}
                </button>
                {isFounder && (
                  <button
                    onClick={() => { handleSetViewMode("Settings"); setIsUserDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-gray-50 text-gray-600 transition-colors"
                  >
                    ⚙️ Settings
                  </button>
                )}
                <button
                  onClick={() => { signOut(); setIsUserDropdownOpen(false); }}
                  className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-red-50 text-red-500 transition-colors"
                >
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── MAIN WRAPPER ── */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? "ml-16" : "ml-56"}`}>

        {/* ── TOP BAR ── */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-black text-gray-900 leading-none">
                {viewMode === "MyQueue" ? "My Queue" : viewMode}
              </h1>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                {viewMode === "Dashboard" ? `Welcome back, ${currentUser}` :
                 viewMode === "Pipeline" ? `${ads.filter(a => !["Winner", "Killed"].includes(a.status)).length} active ads` :
                 viewMode === "MyQueue" ? `${myQueue.length} tasks assigned to you` :
                 viewMode === "Ideas" ? `${ideaCounts.total} ideas logged` :
                 viewMode === "Reports" ? "Live data from your pipeline" :
                 viewMode === "Archive" ? "Completed and killed ads" :
                 ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Active sessions indicator */}
            {Object.keys(activeSessions).length > 0 && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-1.5 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">
                  {Object.keys(activeSessions).length} Active
                </span>
                <span className="text-[11px] font-black text-green-600 font-mono">
                  {formatTimer(Math.max(...Object.values(activeSessions).map(s => s.elapsedSeconds)))}
                </span>
              </div>
            )}

            {/* Connection status */}
            <div className={`w-2 h-2 rounded-full ${isSubscribed ? "bg-green-500" : "bg-gray-300"}`} title={isSubscribed ? "Connected" : "Connecting..."} />

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-500"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] min-w-[14px] h-[14px] flex items-center justify-center font-black rounded-full">
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

            {/* New Ad button */}
            {canCreateAd && (
              <button
                onClick={() => setIsNewAdOpen(true)}
                className="bg-green-700 text-white px-4 py-2 rounded-xl font-black text-xs hover:bg-green-800 transition-all shadow-sm"
              >
                + New Ad
              </button>
            )}
          </div>
        </header>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {viewMode === "Dashboard" && (
            <DashboardView ads={ads} currentUser={currentUser} currentRole={currentRole} onSelectAd={handleSelectAd} onNewAd={() => setIsNewAdOpen(true)} onNavigate={handleSetViewMode} allProfiles={allProfiles} activeSessions={activeSessions} formatTimer={formatTimer} supabase={supabase} />
          )}
          {viewMode === "Pipeline" && (
            <PipelineView ads={ads} activeStage={activeStage} setActiveStage={setActiveStage} setSelectedAd={handleSelectAd} currentRole={currentRole} currentUser={currentUser} allEditors={allEditors} allStrategists={allStrategists} onBulkReassign={handleBulkReassign} onBulkPriority={handleBulkPriority} onBulkKill={handleBulkKill} onBulkMove={handleBulkMove} onBulkDelete={handleBulkDelete} activeSessions={activeSessions} formatTimer={formatTimer} />
          )}
          {viewMode === "MyQueue" && (
            <MyQueueView currentUser={currentUser} myQueue={myQueue} setSelectedAd={handleSelectAd} activeSessions={activeSessions} formatTimer={formatTimer} />
          )}
          {viewMode === "Manager" && (isFounder || isStrategist) && (
            <ManagerView workloads={workloads} setSelectedAd={handleSelectAd} />
          )}
          {viewMode === "Reports" && isManager && (
            <ReportsView ads={ads} weeklyChartData={weeklyChartData} avgDaysToUpload={avgDaysToUpload} pipelineVelocityData={pipelineVelocityData} teamOutput={teamOutput} hitRate={hitRate} inTesting={inTesting} conceptsVsIterations={conceptsVsIterations} creativeDiversity={creativeDiversity} rankedSpend={rankedSpend} />
          )}
          {viewMode === "Ideas" && (
            <IdeasView currentUser={currentUser} ideas={[]} filteredIdeas={filteredIdeas} ideaCounts={ideaCounts} ideaFilter={ideaFilter} setIdeaFilter={setIdeaFilter} newIdeaText={newIdeaText} setNewIdeaText={setNewIdeaText} newIdeaType={newIdeaType} setNewIdeaType={setNewIdeaType} isSubmittingIdea={isSubmittingIdea} onSubmit={handleSubmitIdea} onDelete={handleDeleteIdea} onPromote={(idea: IdeaEntry) => setIdeaToPromote(idea)} canManageIdeas={canManageIdeas} />
          )}
          {viewMode === "Learnings" && (
            <LearningsView learnings={learnings} filteredLearnings={filteredLearnings} learningCounts={learningCounts} learningsFilter={learningsFilter} setLearningsFilter={setLearningsFilter} isLearningFormOpen={isLearningFormOpen} setIsLearningFormOpen={setIsLearningFormOpen} newLearning={newLearning} setNewLearning={setNewLearning} adSearchQuery={adSearchQuery} setAdSearchQuery={setAdSearchQuery} filteredAdSearch={filteredAdSearch} isSubmittingLearning={isSubmittingLearning} onSubmit={handleSubmitLearning} onDelete={handleDeleteLearning} onMarkReviewed={handleMarkReviewed} onUnmarkReviewed={handleUnmarkReviewed} currentUser={currentUser} currentRole={currentRole} expandedLearning={expandedLearning} setExpandedLearning={setExpandedLearning} />
          )}
          {viewMode === "Members" && isFounder && (
            <MembersView profiles={allProfiles} currentUser={currentUser} />
          )}
          {viewMode === "Archive" && isFounder && (
            <ArchiveView ads={ads} onSelectAd={handleSelectAd} />
          )}
          {viewMode === "Settings" && isFounder && profile && (
            <SettingsView currentProfile={profile} onInviteUser={inviteUser} onUpdateRole={updateUserRole} onDeactivateUser={deactivateUser} getAllUsers={getAllUsers} supabase={supabase} />
          )}
        </main>
      </div>

      {/* ── MODALS ── */}
      {isNewAdOpen && canCreateAd && (
        <NewAdModal newAd={newAd} setNewAd={setNewAd} onSubmit={handleCreateAd} onClose={() => setIsNewAdOpen(false)} editors={allEditors} copywriters={allCopywriters} currentRole={currentRole} currentUser={currentUser} allEditorProfiles={allEditorProfiles} allStrategistProfiles={allStrategistProfiles} products={products} />
      )}
      {ideaToPromote && (
        <PromoteIdeaModal idea={ideaToPromote} onConfirm={(idea) => handlePromoteIdea(idea, setNewAd, setIsNewAdOpen, handleSetViewMode)} onCancel={() => setIdeaToPromote(null)} />
      )}
      {selectedAd && (
        <AdDetailModal selectedAd={selectedAd} ads={ads} manualLogNote={manualLogNote} setManualLogNote={setManualLogNote} setSelectedAd={setSelectedAd} onUpdate={handleUpdateAdWithSession} onDelete={handleDeleteAd} currentRole={currentRole} currentUser={currentUser} allEditors={allEditors} allEditorProfiles={allEditorProfiles} allStrategists={allStrategists} allStrategistProfiles={allStrategistProfiles} supabase={supabase} activeSession={getSessionForAd(selectedAd.id, selectedAd)} onFinishSession={async () => { await finishSession(selectedAd.id); }} fetchSessionsForAd={fetchSessionsForAd} fetchAllSessions={fetchAllSessions} formatTimer={formatTimer} products={products} />
      )}
    </div>
  );
}