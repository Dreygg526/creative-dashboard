import { useState, useCallback } from "react";
import { Ad, TimeLogEntry, NewAdForm } from "../types";
import { ALLOWED_TRANSITIONS, DEFAULT_NEW_AD } from "../constants";
import { getDaysLeftInTesting } from "../utils/helpers";

export function useAds(supabase: any, currentUser: string) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [isNewAdOpen, setIsNewAdOpen] = useState(false);
  const [newAd, setNewAd] = useState<NewAdForm>(DEFAULT_NEW_AD);
  const [manualLogNote, setManualLogNote] = useState("");

  const fetchAds = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("ads").select("*").order("created_at", { ascending: false });
    if (!error) setAds(data || []);
    setLoading(false);
  }, [supabase]);

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    const initialLog: TimeLogEntry[] = [
      { action: "Concept Logged", user: currentUser, timestamp: new Date().toISOString() }
    ];
    const { error } = await supabase.from("ads").insert([{
      ...newAd,
      status: "Idea",
      revision_count: 0,
      stage_updated_at: new Date().toISOString(),
      time_log: JSON.stringify(initialLog)
    }]);
    if (!error) {
      setIsNewAdOpen(false);
      setNewAd(DEFAULT_NEW_AD);
      fetchAds();
    }
  };

  const handleUpdateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !selectedAd) return;

    const allowedRoles = ["Founder", "Strategist", "Content Coordinator", "VA"];
    if (!allowedRoles.includes(currentUser) && currentUser !== selectedAd.assigned_editor && currentUser !== selectedAd.assigned_copywriter) {
      alert("You don't have permission to update this ad.");
      return;
    }

    try {
      const originalAd = ads.find(a => a.id === selectedAd.id);
      if (!originalAd) return;

      const daysLeft = getDaysLeftInTesting(originalAd.live_date);
      const isLocked = originalAd.status === "Testing" && daysLeft > 0;
      if (isLocked && originalAd.status !== selectedAd.status) {
        alert(`Cannot move from Testing yet. ${daysLeft} days remaining.`);
        return;
      }

      const statusChanged = originalAd.status !== selectedAd.status;
      if (statusChanged && !ALLOWED_TRANSITIONS[originalAd.status].includes(selectedAd.status)) {
        alert(`Invalid movement. Ads must proceed 1-by-1 through stages. (Current: ${originalAd.status} -> Target: ${selectedAd.status})`);
        return;
      }

      let newRevisionCount = selectedAd.revision_count || 0;
      let newLiveDate = selectedAd.live_date;
      let newStageUpdatedDate = selectedAd.stage_updated_at;

      let updatedTimeLog: TimeLogEntry[] = [];
      try { updatedTimeLog = JSON.parse(originalAd.time_log || "[]"); } catch { updatedTimeLog = []; }

      if (statusChanged || manualLogNote.trim() !== "") {
        updatedTimeLog.push({
          action: statusChanged ? `Moved to ${selectedAd.status}` : "Activity Updated",
          user: currentUser,
          timestamp: new Date().toISOString(),
          note: manualLogNote.trim() || undefined
        });

        if (statusChanged) {
          newStageUpdatedDate = new Date().toISOString();
          if (selectedAd.status === "Ad Revision") newRevisionCount += 1;
          if (selectedAd.status === "Testing") newLiveDate = new Date().toISOString();

          let targetUser = "";
          if (selectedAd.status === "Brief Revision Required") targetUser = selectedAd.assigned_copywriter;
          else if (["Brief Approved", "Content Revision Required"].includes(selectedAd.status)) targetUser = "Content Coordinator";
          else if (["Editor Assigned", "In Progress"].includes(selectedAd.status)) targetUser = selectedAd.assigned_editor;
          else if (["Ad Revision", "Testing", "Completed"].includes(selectedAd.status)) targetUser = "Strategist";
          else if (selectedAd.status === "Pending Upload") targetUser = "VA";

          if (targetUser?.trim()) {
            await supabase.from("notifications").insert([{
              ad_id: selectedAd.id,
              message: `${selectedAd.concept_name} moved to ${selectedAd.status}`,
              target_user: targetUser.trim(),
              is_read: false
            }]);
          }
        }
      }

      const { id, created_at, ...updateFields } = selectedAd;
      await supabase.from("ads").update({
        ...updateFields,
        revision_count: newRevisionCount,
        live_date: newLiveDate,
        stage_updated_at: newStageUpdatedDate,
        time_log: JSON.stringify(updatedTimeLog)
      }).eq("id", selectedAd.id);

      setSelectedAd(null);
      setManualLogNote("");
      fetchAds();
    } catch (err: any) {
      console.error("Update failed:", err.message);
    }
  };

  const handleDeleteAd = async () => {
    if (!supabase || !selectedAd) return;
    if (currentUser !== "Founder" && currentUser !== "Strategist") {
      alert("You don't have permission to delete ads.");
      return;
    }
    const { error } = await supabase.from("ads").delete().eq("id", selectedAd.id);
    if (!error) { setSelectedAd(null); fetchAds(); }
  };

  return {
    ads, loading, selectedAd, setSelectedAd,
    isNewAdOpen, setIsNewAdOpen,
    newAd, setNewAd,
    manualLogNote, setManualLogNote,
    fetchAds, handleCreateAd, handleUpdateAd, handleDeleteAd
  };
}