import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/hooks/use-profile";

export type MentorshipRequest = {
  id: string;
  student_id: string;
  mentor_id: string;
  note: string | null;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  interview_at?: string | null;
  interview_status?: "none" | "pending" | "confirmed" | "declined";
  attachment_path?: string | null;
  attachment_name?: string | null;
  decline_reason?: string | null;
};

export type Session = {
  id: string;
  student_id: string;
  mentor_id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  status: "pending" | "confirmed" | "completed" | "cancelled";
};

function withTimeout<T>(p: PromiseLike<T>, ms = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Request timed out")), ms);
    Promise.resolve(p).then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

export function useMentors() {
  const [mentors, setMentors] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true); setError(null);
      try {
        const res = await withTimeout(
          supabase.from("profiles").select("*").eq("role", "mentor").order("created_at", { ascending: false }),
        );
        if (!active) return;
        if (res.error) throw res.error;
        setMentors((res.data as Profile[]) ?? []);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load mentors");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [tick]);
  return { mentors, loading, error, reload };
}

export function useMyRequests(userId: string | undefined, role: "student" | "mentor" | undefined) {
  const [requests, setRequests] = useState<MentorshipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = async () => {
    if (!userId || !role) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const col = role === "student" ? "student_id" : "mentor_id";
      const res = await withTimeout(
        supabase.from("mentorship_requests").select("*").eq(col, userId).order("created_at", { ascending: false }),
      );
      if (res.error) throw res.error;
      setRequests((res.data as MentorshipRequest[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    reload();
    if (!userId || !role) return;
    const col = role === "student" ? "student_id" : "mentor_id";
    const channel = supabase
      .channel(`mreq:${role}:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mentorship_requests", filter: `${col}=eq.${userId}` },
        () => reload(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    /* eslint-disable-next-line */
  }, [userId, role]);
  return { requests, loading, error, reload };
}

export function useMySessions(userId: string | undefined, role: "student" | "mentor" | undefined) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      if (!userId || !role) { setLoading(false); return; }
      setLoading(true); setError(null);
      try {
        const col = role === "student" ? "student_id" : "mentor_id";
        const res = await withTimeout(
          supabase.from("sessions").select("*").eq(col, userId).order("scheduled_at", { ascending: true }),
        );
        if (!active) return;
        if (res.error) throw res.error;
        setSessions((res.data as Session[]) ?? []);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load sessions");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [userId, role]);
  return { sessions, loading, error };
}

export async function loadProfilesByIds(ids: string[]): Promise<Record<string, Profile>> {
  if (ids.length === 0) return {};
  const { data } = await supabase.from("profiles").select("*").in("id", ids);
  const map: Record<string, Profile> = {};
  for (const p of (data as Profile[] | null) ?? []) map[p.id] = p;
  return map;
}