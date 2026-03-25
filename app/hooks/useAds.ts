import { useState, useCallback } from "react";
import { Ad, TimeLogEntry, NewAdForm } from "../types";
import { ALLOWED_TRANSITIONS, DEFAULT_NEW_AD } from "../constants";
import { getDaysLeftInTesting } from "../utils/helpers";

export function useAds(supabase: any, currentUser: string, currentRole?: string) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [isNewAdOpen, setIsNewAdOpen] = useState(false);
  const [newAd, setNewAd] = useState<NewAdForm>(DEFAULT_NEW_AD);
  const [manualLogNote, setManualLogNote] = useState("");

  const isFounder = currentRole === "Founder";
  const isStrategist = currentRole === "Strategist";
  const isEditor = currentRole === "Editor" || currentRole === "Graphic Designer";
  const isVA = currentRole === "VA";
  const isContentCoord = currentRole === "Content Coordinator";
  const canDelete = isFounder;

  const fetchAds = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("ads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("fetchAds error:", error);
      return;
    }
    setAds(data || []);
    setLoading(false);
  }, [supabase]);

  const getProfileByRole = async (role: string): Promise<string> => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("role", role)
      .eq("is_active", true)
      .limit(1);
    return data?.[0]?.full_name || "";
  };

  // Gets next imprint number scoped by ad_format
  // Video Ad #1, Static Ad #1, Native Ad #1 — each counts independently
  const getNextImprintNumber = async (adFormat: string): Promise<number> => {
    const { data, error } = await supabase
      .from("ads")
      .select("imprint_number")
      .eq("ad_format", adFormat)
      .not("imprint_number", "is", null)
      .order("imprint_number", { ascending: false })
      .limit(1);
    if (error || !data || data.length === 0) return 1;
    const max = data[0]?.imprint_number;
    if (!max || isNaN(max)) return 1;
    return max + 1;
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    const initialLog: TimeLogEntry[] = [
      { action: "Concept Logged", user: currentUser, timestamp: new Date().toISOString() }
    ];

    let autoAssignedEditor = newAd.assigned_editor || "";
    let autoAssignedCopywriter = newAd.assigned_copywriter || "";

    if (isEditor) autoAssignedEditor = currentUser;
    if (isStrategist) autoAssignedCopywriter = currentUser;

    // Imprint number is per-format
    const imprintNumber = await getNextImprintNumber(newAd.ad_format || "Video Ad");

    const { error } = await supabase.from("ads").insert([{
      ...newAd,
      status: "Idea",
      revision_count: 0,
      priority: isFounder ? (newAd.priority || "Medium") : "Medium",
      stage_updated_at: new Date().toISOString(),
      time_log: JSON.stringify(initialLog),
      assigned_editor: autoAssignedEditor,
      assigned_copywriter: autoAssignedCopywriter,
      imprint_number: imprintNumber,
    }]);

    if (error) {
      console.error("Create error:", error);
      alert("Failed to create ad: " + error.message);
      return;
    }
    setIsNewAdOpen(false);
    setNewAd(DEFAULT_NEW_AD);
    fetchAds();
  };

  const handleUpdateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !selectedAd) return;

    try {
      const originalAd = ads.find(a => a.id === selectedAd.id);
      if (!originalAd) return;

      const statusChanged = originalAd.status !== selectedAd.status;

      if (statusChanged && !isFounder) {
        const daysLeft = getDaysLeftInTesting(originalAd.live_date);
        if (originalAd.status === "Testing" && daysLeft > 0) {
          alert(`Cannot move from Testing yet. ${daysLeft} days remaining.`);
          return;
        }
        if (selectedAd.status === "Killed") {
          alert("⛔ Only the Founder can kill ads.");
          return;
        }
        const validTransitions = ALLOWED_TRANSITIONS[originalAd.status] || [];
        if (!validTransitions.includes(selectedAd.status)) {
          alert(`Invalid stage move: ${originalAd.status} → ${selectedAd.status}`);
          return;
        }
        if (selectedAd.status === "Ad Revision" && (originalAd.revision_count || 0) >= 2) {
          alert("Maximum revision rounds reached. This ad cannot be sent back again.");
          return;
        }
      }

      let updatedTimeLog: TimeLogEntry[] = [];
      try { updatedTimeLog = JSON.parse(originalAd.time_log || "[]"); } catch { updatedTimeLog = []; }

      let newRevisionCount = selectedAd.revision_count || 0;
      let newLiveDate = selectedAd.live_date;
      let newStageUpdatedDate = selectedAd.stage_updated_at;
      let newKilledAt = selectedAd.killed_at || originalAd.killed_at || null;

      if (statusChanged || manualLogNote.trim()) {
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
          if (selectedAd.status === "Killed") newKilledAt = new Date().toISOString();
          if (selectedAd.status !== "Killed") newKilledAt = null;

          let targetUser = "";
          if (selectedAd.status === "Brief Revision Required") {
            targetUser = selectedAd.assigned_copywriter || "";
          } else if (["Brief Approved", "Preparing Content", "Content Revision Required"].includes(selectedAd.status)) {
            targetUser = await getProfileByRole("Content Coordinator");
          } else if (selectedAd.status === "Content Ready") {
            targetUser = await getProfileByRole("Strategist");
            if (!targetUser) targetUser = await getProfileByRole("Founder");
          } else if (["Editor Assigned", "In Progress"].includes(selectedAd.status)) {
            targetUser = selectedAd.assigned_editor || "";
          } else if (selectedAd.status === "Done, Waiting for Checking") {
            // Notify Founder that editor marked their work done
            targetUser = await getProfileByRole("Founder");
          } else if (selectedAd.status === "Ad Revision") {
            targetUser = selectedAd.assigned_editor || "";
          } else if (selectedAd.status === "Pending Upload") {
            targetUser = await getProfileByRole("VA");
          } else if (["Testing", "Completed", "Killed"].includes(selectedAd.status)) {
            targetUser = await getProfileByRole("Strategist");
            if (!targetUser) targetUser = await getProfileByRole("Founder");
          }

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

      const { error: updateError } = await supabase
        .from("ads")
        .update({
          status: selectedAd.status,
          ad_format: selectedAd.ad_format,
          ad_spend: selectedAd.ad_spend,
          ad_type: selectedAd.ad_type,
          angle: selectedAd.angle,
          assigned_copywriter: isFounder ? selectedAd.assigned_copywriter : originalAd.assigned_copywriter,
          assigned_editor: isFounder ? selectedAd.assigned_editor : originalAd.assigned_editor,
          brief_link: selectedAd.brief_link,
          // ALL roles can now rename the concept name
          concept_name: selectedAd.concept_name,
          content_source: selectedAd.content_source,
          due_date: selectedAd.due_date || null,
          killed_at: newKilledAt,
          live_date: newLiveDate,
          notes: selectedAd.notes,
          priority: isFounder ? selectedAd.priority : originalAd.priority,
          product: selectedAd.product,
          result: isFounder || isStrategist ? selectedAd.result : originalAd.result,
          review_link: selectedAd.review_link,
          revision_count: newRevisionCount,
          stage_updated_at: newStageUpdatedDate,
          time_log: JSON.stringify(updatedTimeLog),
          imprint_number: isFounder ? selectedAd.imprint_number : originalAd.imprint_number,
        })
        .eq("id", selectedAd.id)
        .select();

      if (updateError) {
        console.error("Update error:", JSON.stringify(updateError));
        alert("Failed to update: " + JSON.stringify(updateError));
        return;
      }

      setSelectedAd(null);
      setManualLogNote("");
      await fetchAds();

    } catch (err: any) {
      console.error("Unexpected error:", err);
      alert("Unexpected error: " + err.message);
    }
  };

  const handleDeleteAd = async () => {
    if (!supabase || !selectedAd) return;
    if (!canDelete) {
      alert("Only the Founder can delete ads.");
      return;
    }
    const { error } = await supabase.from("ads").delete().eq("id", selectedAd.id);
    if (error) {
      console.error("Delete error:", error);
      alert("Failed to delete: " + error.message);
      return;
    }
    setSelectedAd(null);
    fetchAds();
  };

  return {
    ads, loading, selectedAd, setSelectedAd,
    isNewAdOpen, setIsNewAdOpen,
    newAd, setNewAd,
    manualLogNote, setManualLogNote,
    fetchAds, handleCreateAd, handleUpdateAd, handleDeleteAd
  };
}