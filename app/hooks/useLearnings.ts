import { useState, useCallback, useMemo } from "react";
import { LearningEntry, NewLearningForm, Ad } from "../types";

export function useLearnings(supabase: any, currentUser: string, ads: Ad[]) {
  const [learnings, setLearnings] = useState<LearningEntry[]>([]);
  const [learningsFilter, setLearningsFilter] = useState<string>("All");
  const [isLearningFormOpen, setIsLearningFormOpen] = useState(false);
  const [newLearning, setNewLearning] = useState<NewLearningForm>({
    ad_id: "", ad_name: "", ad_link: "", result: "Winner", insight: ""
  });
  const [adSearchQuery, setAdSearchQuery] = useState("");
  const [isSubmittingLearning, setIsSubmittingLearning] = useState(false);
  const [expandedLearning, setExpandedLearning] = useState<string | null>(null);

  const fetchLearnings = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("learnings").select("*").order("created_at", { ascending: false });
    if (!error) setLearnings(data || []);
  }, [supabase]);

  const handleSubmitLearning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !newLearning.insight.trim()) return;
    setIsSubmittingLearning(true);
    const { error } = await supabase.from("learnings").insert([{
      ad_id: newLearning.ad_id || null,
      ad_name: newLearning.ad_name,
      ad_link: newLearning.ad_link,
      result: newLearning.result,
      insight: newLearning.insight.trim(),
      logged_by: currentUser,
    }]);
    if (!error) {
      setIsLearningFormOpen(false);
      setNewLearning({ ad_id: "", ad_name: "", ad_link: "", result: "Winner", insight: "" });
      setAdSearchQuery("");
      fetchLearnings();
    }
    setIsSubmittingLearning(false);
  };

  const handleDeleteLearning = async (id: string) => {
    if (!supabase) return;
    if (currentUser !== "Founder" && currentUser !== "Strategist") {
      alert("Only Founders and Strategists can delete learnings.");
      return;
    }
    await supabase.from("learnings").delete().eq("id", id);
    fetchLearnings();
  };

  const completedAdsForLearnings = useMemo(() =>
    ads.filter(a => a.status === "Completed" || a.status === "Killed"),
  [ads]);

  const filteredAdSearch = useMemo(() => {
    if (!adSearchQuery.trim()) return completedAdsForLearnings.slice(0, 8);
    return completedAdsForLearnings
      .filter(a => a.concept_name.toLowerCase().includes(adSearchQuery.toLowerCase()))
      .slice(0, 8);
  }, [completedAdsForLearnings, adSearchQuery]);

  const filteredLearnings = useMemo(() => {
    if (learningsFilter === "All") return learnings;
    return learnings.filter(l => l.result === learningsFilter);
  }, [learnings, learningsFilter]);

  const learningCounts = useMemo(() => ({
    total: learnings.length,
    winner: learnings.filter(l => l.result === "Winner").length,
    loser: learnings.filter(l => l.result === "Loser").length,
    inconclusive: learnings.filter(l => l.result === "Inconclusive").length,
  }), [learnings]);

  return {
    learnings, fetchLearnings,
    learningsFilter, setLearningsFilter,
    isLearningFormOpen, setIsLearningFormOpen,
    newLearning, setNewLearning,
    adSearchQuery, setAdSearchQuery,
    isSubmittingLearning,
    expandedLearning, setExpandedLearning,
    handleSubmitLearning, handleDeleteLearning,
    filteredAdSearch, filteredLearnings, learningCounts
  };
}