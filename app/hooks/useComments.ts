import { useState, useCallback } from "react";

export interface Comment {
  id: string;
  ad_id: string;
  message: string;
  posted_by: string;
  created_at: string;
}

export function useComments(supabase: any, currentUser: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newComment, setNewComment] = useState("");

  const fetchComments = useCallback(async (adId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("ad_id", adId)
      .order("created_at", { ascending: true });
    if (!error) setComments(data || []);
  }, [supabase]);

  const submitComment = async (adId: string, adName: string, assignedEditor: string, assignedCopywriter: string) => {
    if (!supabase || !newComment.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("comments").insert([{
        ad_id: adId,
        message: newComment.trim(),
        posted_by: currentUser,
      }]);

      if (!error) {
        // Notify relevant people
        const notifyUsers = new Set<string>();

        // Notify assigned editor and copywriter
        if (assignedEditor && assignedEditor !== currentUser) notifyUsers.add(assignedEditor);
        if (assignedCopywriter && assignedCopywriter !== currentUser) notifyUsers.add(assignedCopywriter);

        // Notify Founder always (fetch from profiles)
        const { data: founders } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("role", "Founder")
          .eq("is_active", true)
          .limit(1);
        if (founders?.[0]?.full_name && founders[0].full_name !== currentUser) {
          notifyUsers.add(founders[0].full_name);
        }

        // Send notifications
        for (const target of notifyUsers) {
          await supabase.from("notifications").insert([{
            ad_id: adId,
            message: `${currentUser} commented on "${adName}"`,
            target_user: target,
            is_read: false
          }]);
        }

        setNewComment("");
        fetchComments(adId);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string, adId: string) => {
    if (!supabase) return;
    await supabase.from("comments").delete().eq("id", commentId);
    fetchComments(adId);
  };

  return {
    comments, fetchComments,
    newComment, setNewComment,
    isSubmitting, submitComment, deleteComment
  };
}