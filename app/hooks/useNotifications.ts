import { useState, useCallback } from "react";

interface Notification {
  id: string;
  ad_id: string;
  message: string;
  target_user: string;
  is_read: boolean;
  created_at: string;
}

interface Ad {
  id: string;
  [key: string]: any;
}

export function useNotifications(
  supabase: any,
  currentUser: string,
  ads: Ad[],
  setSelectedAd: (ad: any) => void
) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("target_user", currentUser)
      .order("created_at", { ascending: false });
    if (!error) setNotifications(data || []);
  }, [supabase, currentUser]);

  const markNotificationRead = async (notif: Notification) => {
    if (!supabase) return;
    await supabase.from("notifications").update({ is_read: true }).eq("id", notif.id);
    const adToOpen = ads.find(a => a.id === notif.ad_id);
    if (adToOpen) setSelectedAd(adToOpen);
    setIsNotifOpen(false);
    fetchNotifications();
  };

  const handleClearAllNotifications = async () => {
    if (!supabase || notifications.length === 0) return;
    await supabase.from("notifications")
      .update({ is_read: true })
      .eq("target_user", currentUser)
      .eq("is_read", false);
    fetchNotifications();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return {
    notifications, fetchNotifications,
    isNotifOpen, setIsNotifOpen,
    unreadCount,
    markNotificationRead,
    handleClearAllNotifications
  };
}