"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function useSupabaseClient() {
  const [supabase, setSupabase] = useState<any>(null);
  const [libError, setLibError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      setSupabase(client);
    } catch (err: any) {
      setLibError("Failed to initialize Supabase: " + err.message);
    }
  }, []);

  return { supabase, libError };
}