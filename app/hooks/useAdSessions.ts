import { useState, useEffect, useRef, useCallback } from "react";

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

function getStoredSessions(): Record<string, { sessionId: string; startedAt: string; elapsedSeconds: number }> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function storeSession(adId: string, sessionId: string, startedAt: string, elapsedSeconds: number) {
  const current = getStoredSessions();
  current[adId] = { sessionId, startedAt, elapsedSeconds };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

function removeStoredSession(adId: string) {
  const current = getStoredSessions();
  delete current[adId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function useAdSessions(supabase: any, userName: string, userRole: string) {
  const [activeSessions, setActiveSessions] = useState<Record<string, { sessionId: string; elapsedSeconds: number; startedAt: string }>>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load stored sessions on mount
  useEffect(() => {
    const stored = getStoredSessions();
    if (Object.keys(stored).length > 0) {
      const restored: Record<string, { sessionId: string; elapsedSeconds: number; startedAt: string }> = {};
      Object.entries(stored).forEach(([adId, data]) => {
        // Calculate elapsed time since last stored
        const secondsSinceStored = Math.floor((Date.now() - new Date(data.startedAt).getTime()) / 1000);
        restored[adId] = {
          sessionId: data.sessionId,
          startedAt: data.startedAt,
          elapsedSeconds: secondsSinceStored,
        };
      });
      setActiveSessions(restored);
    }
  }, []);

  // Tick every second for all active sessions
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveSessions(prev => {
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

  const startSession = useCallback(async (adId: string) => {
    if (!supabase || activeSessions[adId]) return;

    const startedAt = new Date().toISOString();

    // Insert into Supabase
    const { data, error } = await supabase.from("ad_sessions").insert([{
      ad_id: adId,
      user_name: userName,
      user_role: userRole,
      started_at: startedAt,
      is_active: true,
    }]).select().single();

    if (error || !data) {
      console.error("Session start error:", error);
      return;
    }

    const sessionId = data.id;
    storeSession(adId, sessionId, startedAt, 0);
    setActiveSessions(prev => ({
      ...prev,
      [adId]: { sessionId, startedAt, elapsedSeconds: 0 }
    }));
  }, [supabase, userName, userRole, activeSessions]);

  const finishSession = useCallback(async (adId: string) => {
    if (!supabase) return;
    const session = activeSessions[adId];
    if (!session) return;

    const finishedAt = new Date().toISOString();
    const totalSeconds = session.elapsedSeconds;

    await supabase.from("ad_sessions").update({
      finished_at: finishedAt,
      total_seconds: totalSeconds,
      is_active: false,
    }).eq("id", session.sessionId);

    removeStoredSession(adId);
    setActiveSessions(prev => {
      const updated = { ...prev };
      delete updated[adId];
      return updated;
    });
  }, [supabase, activeSessions]);

  const getSessionForAd = useCallback((adId: string) => {
    return activeSessions[adId] || null;
  }, [activeSessions]);

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

export function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}