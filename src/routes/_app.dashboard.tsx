import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, CalendarCheck, MapPin, Trophy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { useMentors, useMyRequests, useMySessions } from "@/lib/data-hooks";
import { InitialsAvatar } from "@/components/initials-avatar";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Home — MedMentor" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { profile } = useProfile();
  const { mentors } = useMentors();
  const { requests, reload } = useMyRequests(profile?.id, profile?.role);
  const { sessions } = useMySessions(profile?.id, profile?.role);
  const [busy, setBusy] = useState<string | null>(null);

  const requestedIds = new Set(requests.map((r) => r.mentor_id));
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  const handleRequest = async (mentorId: string, name: string) => {
    if (!profile || profile.role !== "student") return;
    if (requestedIds.has(mentorId)) return;
    setBusy(mentorId);
    const { error } = await supabase.from("mentorship_requests").insert({
      student_id: profile.id,
      mentor_id: mentorId,
    });
    setBusy(null);
    if (error) toast.error(error.message);
    else { toast.success(`Request sent to ${name}`); reload(); }
  };

  const stats = [
    { label: "Sessions Booked", value: sessions.length, icon: CalendarCheck },
    { label: "Requests Sent", value: requests.length, icon: BookOpen },
    { label: "Cases Solved", value: 0, icon: Trophy },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="glass-card relative overflow-hidden rounded-2xl p-6 md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Good morning, {firstName} <span className="ml-1">👋</span>
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {profile?.specialty && (
                <span className="inline-flex items-center rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary ring-1 ring-primary/30">
                  {profile.specialty}
                </span>
              )}
              {profile?.university && (
                <span className="text-xs text-muted-foreground">{profile.university}</span>
              )}
            </div>
          </div>
          <Link
            to="/mentors"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Find a mentor <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="glass-card rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">{s.label}</div>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight text-primary">{s.value}</div>
            </div>
          );
        })}
      </section>

      <section>
        <SectionHeader title="Mentors" link="/mentors" />
        {mentors.length === 0 ? (
          <EmptyState text="No mentors have signed up yet." />
        ) : (
          <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2">
            {mentors.slice(0, 6).map((m) => (
              <div key={m.id} className="glass-card w-72 shrink-0 snap-start rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <InitialsAvatar name={m.full_name} size="md" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{m.full_name}</div>
                    <div className="text-xs text-muted-foreground">{m.specialty ?? "—"}</div>
                  </div>
                </div>
                <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                  {m.hospital && <div className="truncate">{m.hospital}</div>}
                  {m.city && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {m.city}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRequest(m.id, m.full_name)}
                  disabled={requestedIds.has(m.id) || busy === m.id || profile?.role !== "student"}
                  className="mt-4 w-full rounded-lg bg-primary/15 px-3 py-2 text-xs font-semibold text-primary ring-1 ring-primary/30 transition hover:bg-primary/25 disabled:opacity-60"
                >
                  {requestedIds.has(m.id) ? "Requested ✓" : busy === m.id ? "Sending…" : "Request"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Upcoming Sessions" link="/calendar" />
        {requests.length > 0 && (
          <div className="mb-4 space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="glass-card flex items-center justify-between gap-3 rounded-xl p-3 text-xs">
                <div className="min-w-0">
                  <div className="font-medium">Mentorship request</div>
                  {r.interview_at && (
                    <div className="text-muted-foreground">
                      Interview: {new Date(r.interview_at).toLocaleString()}
                    </div>
                  )}
                  {r.status === "declined" && r.decline_reason && (
                    <div className="mt-1 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1 text-[11px] text-destructive">
                      Declined: "{r.decline_reason}"
                    </div>
                  )}
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
        {sessions.length === 0 ? (
          <EmptyState text="No sessions scheduled yet." />
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-xl p-4">
                <div>
                  <div className="text-sm font-semibold">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{s.location ?? ""}</div>
                </div>
                <div className="text-right text-xs">
                  <div className="font-medium">{new Date(s.scheduled_at).toLocaleDateString()}</div>
                  <div className="text-muted-foreground">
                    {new Date(s.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionHeader({ title, link }: { title: string; link?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {link && (
        <Link to={link} className="text-xs text-primary hover:underline">
          View all
        </Link>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="glass-card rounded-xl p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    confirmed: "bg-success/15 text-success ring-success/30",
    pending: "bg-warning/15 text-warning ring-warning/30",
    completed: "bg-muted text-muted-foreground ring-border",
    cancelled: "bg-destructive/15 text-destructive ring-destructive/30",
  };
  const cls = map[status] ?? "bg-muted text-muted-foreground ring-border";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ring-1 ${cls}`}>
      {status}
    </span>
  );
}