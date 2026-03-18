import { useState, useCallback, useMemo } from "react";
import { IdeaEntry, NewAdForm } from "../types";

export function useIdeas(supabase: any, currentUser: string) {
  const [ideas, setIdeas] = useState<IdeaEntry[]>([]);
  const [newIdeaText, setNewIdeaText] = useState("");
  const [newIdeaType, setNewIdeaType] = useState("New Concept");
  const [ideaFilter, setIdeaFilter] = useState<string>("All");
  const [isSubmittingIdea, setIsSubmittingIdea] = useState(false);
  const [ideaToPromote, setIdeaToPromote] = useState<IdeaEntry | null>(null);

  const fetchIdeas = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("ideas").select("*").order("created_at", { ascending: false });
    if (!error) setIdeas(data || []);
  }, [supabase]);

  const handleSubmitIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !newIdeaText.trim()) return;
    setIsSubmittingIdea(true);
    const { error } = await supabase.from("ideas").insert([{
      description: newIdeaText.trim(),
      submitted_by: currentUser,
      type_tag: newIdeaType,
      promoted: false
    }]);
    if (!error) {
      setNewIdeaText("");
      setNewIdeaType("New Concept");
      fetchIdeas();
    }
    setIsSubmittingIdea(false);
  };

  const handleDeleteIdea = async (id: string) => {
    if (!supabase) return;
    if (currentUser !== "Founder" && currentUser !== "Strategist") {
      alert("Only Founders and Strategists can delete ideas.");
      return;
    }
    await supabase.from("ideas").delete().eq("id", id);
    fetchIdeas();
  };

  const handlePromoteIdea = async (
    idea: IdeaEntry,
    setNewAd: (v: NewAdForm) => void,
    setIsNewAdOpen: (v: boolean) => void,
    setViewMode: (v: any) => void
  ) => {
    if (!supabase) return;
    await supabase.from("ideas").update({ promoted: true }).eq("id", idea.id);
    setNewAd({
      concept_name: idea.description.length > 60 ? idea.description.substring(0, 60) : idea.description,
      angle: "",
      ad_format: "Video Ad",
      product: "",
      ad_type: idea.type_tag === "Iteration" ? "Iteration" : "New Concept",
      priority: "Medium",
      content_source: "Internal Team",
      assigned_editor: "",
      assigned_copywriter: "",
      brief_link: ""
    });
    setIdeaToPromote(null);
    fetchIdeas();
    setIsNewAdOpen(true);
    setViewMode("Pipeline");
  };

  const filteredIdeas = useMemo(() => {
    if (ideaFilter === "All") return ideas;
    if (ideaFilter === "Promoted") return ideas.filter(i => i.promoted);
    if (ideaFilter === "Pending") return ideas.filter(i => !i.promoted);
    return ideas.filter(i => i.type_tag === ideaFilter);
  }, [ideas, ideaFilter]);

  const ideaCounts = useMemo(() => ({
    total: ideas.length,
    pending: ideas.filter(i => !i.promoted).length,
    promoted: ideas.filter(i => i.promoted).length,
  }), [ideas]);

  return {
    ideas, fetchIdeas,
    newIdeaText, setNewIdeaText,
    newIdeaType, setNewIdeaType,
    ideaFilter, setIdeaFilter,
    isSubmittingIdea,
    ideaToPromote, setIdeaToPromote,
    handleSubmitIdea, handleDeleteIdea, handlePromoteIdea,
    filteredIdeas, ideaCounts
  };
}