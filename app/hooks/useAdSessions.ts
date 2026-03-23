import { useState, useEffect, useRef, useCallback } from "react";
import { Ad } from "../types";

export interface AdSession {
  id?: string;
  ad_id: string;
  user_name: string;
  user_role: string;
  started_at: string;
  finished_at?: string;
  total_seconds?: number;
  is_active: boolean;
}

const STORAGE_KEY = "creative_ops_active_sessions";

function getStoredSessions(): Record<string, { sessionId: string; startedAt: string }> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function storeSession(adId: string, sessionId: string, startedAt: string) {
  const current = getStoredSessions();
  current[adId] = { sessionId, startedAt };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

function removeStoredSession(adId: string) {
  const current = getStoredSessions();
  delete current[adId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

// The single source of truth for whether a user should have a timer on an ad
export function isDesignatedTask(ad: Ad, userRole: string, userName: string): boolean {
  if (userRole === "Founder") return false;
  if (userRole === "Strategist") {
    return ad.assigned_copywriter === userName &&
      ["Idea", "Writing Brief", "Brief Revision Required", "Brief Approved", "Ad Revision", "Testing"].includes(ad.status);
  }
  if (userRole === "Editor" || userRole === "Graphic Designer") {
    return ad.assigned_editor === userName &&
      ["Editor Assigned", "In Progress", "Ad Revision", "Content Revision Required"].includes(ad.status);
  }
  if (userRole === "VA") return ad.status === "Pending Upload";
  if (userRole === "Content Coordinator") return ["Preparing Content", "Content Revision Required"].includes(ad.status);
  return false;
}

export function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function useAdSessions(supabase: any, userName: string, userRole: string) {
  const [activeSessions, setActiveSessions] = useState<Record<string, { sessionId: string; elapsedSeconds: number; startedAt: string }>>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // On mount — restore any sessions from localStorage
  useEffect(() => {
    const stored = getStoredSessions();
    if (Object.keys(stored).length > 0) {
      const restored: Record<string, { sessionId: string; elapsedSeconds: number; startedAt: string }> = {};
      Object.entries(stored).forEach(([adId, data]) => {
        const elapsedSeconds = Math.floor((Date.now() - new Date(data.startedAt).getTime()) / 1000);
        restored[adId] = {
          sessionId: data.sessionId,
          startedAt: data.startedAt,
          elapsedSeconds,
        };
      });
      setActiveSessions(restored);
    }
  }, []);

  // Tick every second
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveSessions(prev => {
        if (Object.keys(prev).length === 0) return prev;
        const updated = { ...prev };
        Object.keys(updated).forEach(adId => {
          updated[adId] = {
            ...updated[adId],
            elapsedSeconds: Math.floor((Date.now() - new Date(updated[adId].startedAt).getTime()) / 1000),
          };
        });
        return updated;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ad is passed in so we can verify it's a designated task before starting
  const startSession = useCallback(async (ad: Ad) => {
    if (!supabase || !userName || !ad) return;

    // Hard gate — only start if this is their designated task
    if (!isDesignatedTask(ad, userRole, userName)) return;

    // Don't start if already running
    if (activeSessions[ad.id]) return;

    const startedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from("ad_sessions")
      .insert([{
        ad_id: ad.id,
        user_name: userName,
        user_role: userRole,
        started_at: startedAt,
        is_active: true,
      }])
      .select()
      .single();

    if (error || !data) {
      console.error("Session start error:", error);
      return;
    }

    storeSession(ad.id, data.id, startedAt);
    setActiveSessions(prev => ({
      ...prev,
      [ad.id]: { sessionId: data.id, startedAt, elapsedSeconds: 0 }
    }));
  }, [supabase, userName, userRole, activeSessions]);

  const finishSession = useCallback(async (adId: string) => {
    if (!supabase) return;
    const session = activeSessions[adId];
    if (!session) return;

    const finishedAt = new Date().toISOString();
    const totalSeconds = session.elapsedSeconds;

    await supabase
      .from("ad_sessions")
      .update({
        finished_at: finishedAt,
        total_seconds: totalSeconds,
        is_active: false,
      })
      .eq("id", session.sessionId);

    removeStoredSession(adId);
    setActiveSessions(prev => {
      const updated = { ...prev };
      delete updated[adId];
      return updated;
    });
  }, [supabase, activeSessions]);

  // Only returns session if it's a designated task
  const getSessionForAd = useCallback((adId: string, ad?: Ad) => {
    const session = activeSessions[adId];
    if (!session) return null;
    // If ad is passed, verify it's still a designated task
    if (ad && !isDesignatedTask(ad, userRole, userName)) return null;
    return session;
  }, [activeSessions, userRole, userName]);

  const fetchSessionsForAd = useCallback(async (adId: string): Promise<AdSession[]> => {
    if (!supabase) return [];
    const { data } = await supabase
      .from("ad_sessions")
      .select("*")
      .eq("ad_id", adId)
      .order("started_at", { ascending: false });
    return data || [];
  }, [supabase]);

  const fetchAllSessions = useCallback(async (): Promise<AdSession[]> => {
    if (!supabase) return [];
    const { data } = await supabase
      .from("ad_sessions")
      .select("*")
      .order("started_at", { ascending: false });
    return data || [];
  }, [supabase]);

  return {
    activeSessions,
    startSession,
    finishSession,
    getSessionForAd,
    fetchSessionsForAd,
    fetchAllSessions,
  };
}