import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/with-timeout";

export type Profile = {
  id: string;
  role: "student" | "mentor";
  full_name: string;
  city: string | null;
  specialty: string | null;
  hospital: string | null;
  university: string | null;
  year_of_study: number | null;
  license_number: string | null;
  years_experience: number | null;
  languages: string | null;
  bio: string | null;
  resume: Record<string, unknown> | null;
  email: string | null;
  phone: string | null;
};

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await withTimeout(supabase.auth.getUser());
        if (!user) {
          if (active) { setProfile(null); setLoading(false); }
          return;
        }
        const res = await withTimeout(
          supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        );
        if (!active) return;
        if (res.error) throw res.error;
        setProfile((res.data as Profile | null) ?? null);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load profile");
        setProfile(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") load();
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [tick]);

  return { profile, loading, error, reload };
}

export async function signOut() {
  await supabase.auth.signOut();
}