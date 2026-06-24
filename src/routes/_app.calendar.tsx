import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useProfile } from "@/hooks/use-profile";
import { useMyRequests, useMySessions } from "@/lib/data-hooks";
import { CalendarView, type CalendarEvent } from "@/components/calendar-view";

export const Route = createFileRoute("/_app/calendar")({
  head: () => ({ meta: [{ title: "Calendar — MedMentor" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const { profile } = useProfile();
  const { sessions } = useMySessions(profile?.id, profile?.role);
  const { requests } = useMyRequests(profile?.id, profile?.role);

  const events: CalendarEvent[] = useMemo(() => {
    const evs: CalendarEvent[] = sessions.map((s) => ({
      id: s.id, title: s.title, at: s.scheduled_at,
      durationMinutes: s.duration_minutes, location: s.location,
    }));
    for (const r of requests) {
      if (r.interview_at) {
        evs.push({ id: `iv-${r.id}`, title: "Interview", at: r.interview_at, durationMinutes: 10 });
      }
    }
    return evs;
  }, [sessions, requests]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
      <CalendarView events={events} />
    </div>
  );
}