import { useState, useCallback } from "react";

export interface Script {
  id: string;
  ad_id: string;
  title: string;
  body: string;
  messaging_intent: string;
  status: string;            // Draft | In Review | Approved
  is_primary: boolean;
  generated_by_ai: boolean;
  ai_model: string | null;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ScriptScene {
  id: string;
  script_id: string;
  scene_order: number;
  scene_text: string;
  visual_direction: string;
  duration_seconds: number | null;
  is_done: boolean;
  created_at: string;
}

export function useScripts(supabase: any, currentUser: string) {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [scenes, setScenes] = useState<ScriptScene[]>([]);
  const [activeScriptId, setActiveScriptId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ── LOAD all scripts for an ad ──
  const fetchScripts = useCallback(async (adId: string) => {
    if (!supabase) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from("scripts")
      .select("*")
      .eq("ad_id", adId)
      .order("is_primary", { ascending: false })
      .order("version", { ascending: true });
    if (!error) {
      setScripts(data || []);
      // Auto-select primary (or first) if nothing selected yet
      if (data && data.length > 0) {
        setActiveScriptId(prev => {
          if (prev && data.some((s: Script) => s.id === prev)) return prev;
          const primary = data.find((s: Script) => s.is_primary);
          return primary ? primary.id : data[0].id;
        });
      } else {
        setActiveScriptId(null);
      }
    }
    setIsLoading(false);
  }, [supabase]);

  // ── LOAD scenes for a script ──
  const fetchScenes = useCallback(async (scriptId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("script_scenes")
      .select("*")
      .eq("script_id", scriptId)
      .order("scene_order", { ascending: true });
    if (!error) setScenes(data || []);
  }, [supabase]);

  // ── CREATE a new script ──
  const createScript = async (adId: string, opts?: Partial<Script>): Promise<Script | null> => {
    if (!supabase) return null;
    setIsSaving(true);
    try {
      // Next version number = current max + 1
      const nextVersion = scripts.length > 0 ? Math.max(...scripts.map(s => s.version || 1)) + 1 : 1;
      // First script for an ad becomes primary automatically
      const makePrimary = scripts.length === 0;
      const { data, error } = await supabase.from("scripts").insert([{
        ad_id: adId,
        title: opts?.title ?? `Script v${nextVersion}`,
        body: opts?.body ?? "",
        messaging_intent: opts?.messaging_intent ?? "",
        status: opts?.status ?? "Draft",
        is_primary: opts?.is_primary ?? makePrimary,
        generated_by_ai: opts?.generated_by_ai ?? false,
        ai_model: opts?.ai_model ?? null,
        version: nextVersion,
        created_by: currentUser,
      }]).select();
      if (error) {
        console.error("createScript error:", error);
        alert("Failed to create script: " + error.message);
        return null;
      }
      const created = data?.[0] || null;
      await fetchScripts(adId);
      if (created) setActiveScriptId(created.id);
      return created;
    } finally {
      setIsSaving(false);
    }
  };

  // ── UPDATE a script (body / intent / title / status) ──
  const updateScript = async (scriptId: string, adId: string, fields: Partial<Script>) => {
    if (!supabase) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("scripts")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", scriptId);
      if (error) {
        console.error("updateScript error:", error);
        alert("Failed to save script: " + error.message);
        return;
      }
      await fetchScripts(adId);
    } finally {
      setIsSaving(false);
    }
  };

  // ── SET a script as the primary (main) version ──
  const setPrimaryScript = async (scriptId: string, adId: string) => {
    if (!supabase) return;
    // Clear primary on all others for this ad, then set on this one
    await supabase.from("scripts").update({ is_primary: false }).eq("ad_id", adId);
    await supabase.from("scripts").update({ is_primary: true }).eq("id", scriptId);
    await fetchScripts(adId);
  };

  // ── DELETE a script (scenes + scene comments cascade via FK) ──
  const deleteScript = async (scriptId: string, adId: string) => {
    if (!supabase) return;
    const { error } = await supabase.from("scripts").delete().eq("id", scriptId);
    if (error) {
      console.error("deleteScript error:", error);
      alert("Failed to delete script: " + error.message);
      return;
    }
    if (activeScriptId === scriptId) setActiveScriptId(null);
    await fetchScripts(adId);
  };

  // ── SCENES ──

  // Replace all scenes for a script (used by AI breakdown or full rewrite)
  const replaceScenes = async (scriptId: string, newScenes: Array<Partial<ScriptScene>>) => {
    if (!supabase) return;
    setIsSaving(true);
    try {
      await supabase.from("script_scenes").delete().eq("script_id", scriptId);
      if (newScenes.length > 0) {
        const rows = newScenes.map((sc, i) => ({
          script_id: scriptId,
          scene_order: sc.scene_order ?? i + 1,
          scene_text: sc.scene_text ?? "",
          visual_direction: sc.visual_direction ?? "",
          duration_seconds: sc.duration_seconds ?? null,
          is_done: sc.is_done ?? false,
        }));
        const { error } = await supabase.from("script_scenes").insert(rows);
        if (error) { console.error("replaceScenes error:", error); alert("Failed to save scenes: " + error.message); }
      }
      await fetchScenes(scriptId);
    } finally {
      setIsSaving(false);
    }
  };

  // Add one scene to the end
  const addScene = async (scriptId: string) => {
    if (!supabase) return;
    const nextOrder = scenes.length > 0 ? Math.max(...scenes.map(s => s.scene_order)) + 1 : 1;
    const { error } = await supabase.from("script_scenes").insert([{
      script_id: scriptId,
      scene_order: nextOrder,
      scene_text: "",
      visual_direction: "",
      duration_seconds: null,
      is_done: false,
    }]);
    if (error) { console.error("addScene error:", error); return; }
    await fetchScenes(scriptId);
  };

  // Update one scene
  const updateScene = async (sceneId: string, scriptId: string, fields: Partial<ScriptScene>) => {
    if (!supabase) return;
    const { error } = await supabase.from("script_scenes").update(fields).eq("id", sceneId);
    if (error) { console.error("updateScene error:", error); return; }
    await fetchScenes(scriptId);
  };

  // Delete one scene
  const deleteScene = async (sceneId: string, scriptId: string) => {
    if (!supabase) return;
    await supabase.from("script_scenes").delete().eq("id", sceneId);
    await fetchScenes(scriptId);
  };

  // Toggle a scene's done checkbox (editor checklist)
  const toggleSceneDone = async (sceneId: string, scriptId: string, isDone: boolean) => {
    if (!supabase) return;
    await supabase.from("script_scenes").update({ is_done: isDone }).eq("id", sceneId);
    await fetchScenes(scriptId);
  };

  return {
    scripts, scenes,
    activeScriptId, setActiveScriptId,
    isLoading, isSaving,
    fetchScripts, fetchScenes,
    createScript, updateScript, setPrimaryScript, deleteScript,
    replaceScenes, addScene, updateScene, deleteScene, toggleSceneDone,
  };
}