"use client";
import { useEffect, useState } from "react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function useSupabaseClient() {
  const [supabase, setSupabase] = useState<any>(null);
  const [libError, setLibError] = useState<string | null>(null);

  useEffect(() => {
    const initClient = () => {
      try {
        if (!(window as any).supabase) throw new Error("Supabase not found");
        const client = (window as any).supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        setSupabase(client);
      } catch {
        setLibError("Invalid Supabase configuration.");
      }
    };

    if ((window as any).supabase) {
      initClient();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.async = true;
    script.onload = initClient;
    script.onerror = () => setLibError("Failed to load Supabase library.");
    document.head.appendChild(script);
  }, []);

  return { supabase, libError };
}