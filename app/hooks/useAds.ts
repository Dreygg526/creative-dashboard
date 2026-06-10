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
  const canDelete = isFounder || (isStrategist && selectedAd?.assigned_copywriter === currentUser);

  // Who is allowed to reassign the editor / strategist on an ad.
  // Must match the canReassign logic in AdDetailModal (Founder + Strategist),
  // plus Editors are allowed to pass an ad to another editor.
  const canReassign = isFounder || isStrategist;

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

  const getNextImprintNumber = async (): Promise<number> => {
    const { data, error } = await supabase
      .from("ads")
      .select("imprint_number")
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

    const imprintNumber = await getNextImprintNumber();

    const { error } = await supabase.from("ads").insert([{
      ...newAd,
      status: "Idea",
      revision_count: 0,
      priority: (isFounder || isStrategist) ? (newAd.priority || "Medium") : "Medium",
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

      if (statusChanged) {
        if (!isFounder && !isStrategist) {
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
        }
      }

      // ── Resolve final assignment values based on permissions ──
      // Founder + Strategist can reassign either field.
      // Editors can pass an ad to a different editor (but not change strategist).
      const finalEditor = (canReassign || isEditor)
        ? (selectedAd.assigned_editor ?? "")
        : originalAd.assigned_editor;
      const finalCopywriter = canReassign
        ? (selectedAd.assigned_copywriter ?? "")
        : originalAd.assigned_copywriter;

      const editorChanged = finalEditor !== originalAd.assigned_editor;
      const copywriterChanged = finalCopywriter !== originalAd.assigned_copywriter;

      let updatedTimeLog: TimeLogEntry[] = [];
      try { updatedTimeLog = JSON.parse(originalAd.time_log || "[]"); } catch { updatedTimeLog = []; }

      let newRevisionCount = selectedAd.revision_count || 0;
      let newLiveDate = selectedAd.live_date;
      let newStageUpdatedDate = selectedAd.stage_updated_at;
      let newKilledAt = selectedAd.killed_at || originalAd.killed_at || null;

      // Log status change / manual note
      if (statusChanged || manualLogNote.trim()) {
        updatedTimeLog.push({
          action: statusChanged ? `Moved to ${selectedAd.status}` : "Activity Updated",
          user: currentUser,
          timestamp: new Date().toISOString(),
          note: manualLogNote.trim() || undefined
        });
      }

      // Log reassignments independently of status change so they always record
      if (editorChanged) {
        updatedTimeLog.push({
          action: finalEditor ? `Editor changed to ${finalEditor}` : "Editor unassigned",
          user: currentUser,
          timestamp: new Date().toISOString(),
        });
      }
      if (copywriterChanged) {
        updatedTimeLog.push({
          action: finalCopywriter ? `Strategist changed to ${finalCopywriter}` : "Strategist unassigned",
          user: currentUser,
          timestamp: new Date().toISOString(),
        });
      }

      if (statusChanged) {
        newStageUpdatedDate = new Date().toISOString();
        if (selectedAd.status === "Ad Revision") newRevisionCount += 1;
        if (selectedAd.status === "Testing") newLiveDate = new Date().toISOString();
        if (selectedAd.status === "Killed") newKilledAt = new Date().toISOString();
        if (selectedAd.status !== "Killed") newKilledAt = null;

        const getAllStrategists = async (): Promise<string[]> => {
          const { data } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("role", "Strategist")
            .eq("is_active", true);
          return (data || []).map((p: any) => p.full_name).filter(Boolean);
        };

        const getFounderName = async (): Promise<string> => {
          const { data } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("role", "Founder")
            .eq("is_active", true)
            .limit(1);
          return data?.[0]?.full_name || "";
        };

        const insertNotification = async (targetUser: string, message: string) => {
          if (!targetUser?.trim()) return;
          await supabase.from("notifications").insert([{
            ad_id: selectedAd.id,
            message,
            target_user: targetUser.trim(),
            is_read: false
          }]);
        };

        const msg = `${selectedAd.concept_name} moved to ${selectedAd.status}`;

        if (selectedAd.status === "Brief Revision Required") {
          await insertNotification(finalCopywriter || "", msg);
        } else if (selectedAd.status === "Brief Approved") {
          await insertNotification(finalEditor || "", msg);
        } else if (selectedAd.status === "Editor Assigned") {
          await insertNotification(finalEditor || "", msg);
        } else if (selectedAd.status === "In Progress") {
          const founder = await getFounderName();
          await insertNotification(founder, msg);
        } else if (selectedAd.status === "Done, Waiting for Approval") {
          const founder = await getFounderName();
          await insertNotification(founder, `✋ ${selectedAd.concept_name} — Done, Waiting for Approval`);
          const strategists = await getAllStrategists();
          for (const name of strategists) {
            await insertNotification(name, `✋ ${selectedAd.concept_name} — Done, Waiting for Approval`);
          }
        } else if (selectedAd.status === "Ad Revision") {
          await insertNotification(finalEditor || "", msg);
        } else if (selectedAd.status === "Pending Upload") {
          const va = await getProfileByRole("VA");
          await insertNotification(va, msg);
        } else if (selectedAd.status === "Testing") {
          await insertNotification(finalCopywriter || "", msg);
        } else if (selectedAd.status === "Winner") {
          await insertNotification(finalCopywriter || "", msg);
        } else if (selectedAd.status === "Killed") {
          const founder = await getFounderName();
          await insertNotification(founder, `💀 ${selectedAd.concept_name} was killed`);
        }
      }

      // Notify a newly-assigned editor even when the stage didn't change
      if (editorChanged && finalEditor && !statusChanged) {
        if (finalEditor.trim()) {
          await supabase.from("notifications").insert([{
            ad_id: selectedAd.id,
            message: `${selectedAd.concept_name} was assigned to you`,
            target_user: finalEditor.trim(),
            is_read: false
          }]);
        }
      }

      const { error: updateError } = await supabase
        .from("ads")
        .update({
          status: selectedAd.status,
          ad_format: selectedAd.ad_format,
          ad_spend: selectedAd.ad_spend,
          ad_type: selectedAd.ad_type,
          assigned_copywriter: finalCopywriter,
          assigned_editor: finalEditor,
          brief_link: selectedAd.brief_link,
          concept_name: selectedAd.concept_name,
          content_source: selectedAd.content_source,
          due_date: selectedAd.due_date || null,
          killed_at: newKilledAt,
          live_date: newLiveDate,
          notes: selectedAd.notes,
          priority: (isFounder || isStrategist) ? selectedAd.priority : originalAd.priority,
          product: selectedAd.product,
          result: (isFounder || isStrategist) ? selectedAd.result : originalAd.result,
          review_link: selectedAd.review_link,
          revision_count: newRevisionCount,
          stage_updated_at: newStageUpdatedDate,
          time_log: JSON.stringify(updatedTimeLog),
          imprint_number: isFounder ? selectedAd.imprint_number : originalAd.imprint_number,
          destination_url: selectedAd.destination_url ?? originalAd.destination_url ?? null,
          whitelisting_page: selectedAd.whitelisting_page ?? originalAd.whitelisting_page ?? null,
          selected_headline: selectedAd.selected_headline ?? originalAd.selected_headline ?? null,
          selected_ad_copy: selectedAd.selected_ad_copy ?? originalAd.selected_ad_copy ?? null,
          angle: selectedAd.angle ?? originalAd.angle ?? null,
          sub_avatar: selectedAd.sub_avatar ?? originalAd.sub_avatar ?? null,
          concept: selectedAd.concept ?? originalAd.concept ?? null,
          awareness: selectedAd.awareness ?? originalAd.awareness ?? null,
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
    const canDeleteThis = isFounder || (isStrategist && selectedAd?.assigned_copywriter === currentUser);
    if (!canDeleteThis) {
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