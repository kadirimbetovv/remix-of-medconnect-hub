import { createFileRoute } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useProfile, type Profile } from "@/hooks/use-profile";
import { useMyRequests, useMySessions, loadProfilesByIds } from "@/lib/data-hooks";
import { CalendarView, type CalendarEvent } from "@/components/calendar-view";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/notifications";

export const Route = createFileRoute("/mentor/calendar")({
  head: () => ({ meta: [{ title: "Calendar — MedMentor" }] }),
  component: CalendarPage,
});

const SESSION_TYPES = ["Shadowing", "Ward Round", "Outpatient Clinic", "Surgery Observation", "Other"] as const;

function CalendarPage() {
  const { profile } = useProfile();
  const { sessions } = useMySessions(profile?.id, profile?.role);
  const { requests } = useMyRequests(profile?.id, profile?.role);
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [studentMap, setStudentMap] = useState<Record<string, Profile>>({});

  const accepted = useMemo(() => requests.filter((r) => r.status === "accepted"), [requests]);

  useEffect(() => {
    const ids = Array.from(new Set(accepted.map((r) => r.student_id)));
    loadProfilesByIds(ids).then(setStudentMap);
  }, [accepted]);

  // dedupe sessions by title+at so a session sent to N students shows once
  const events: CalendarEvent[] = useMemo(() => {
    const seen = new Map<string, CalendarEvent>();
    for (const s of sessions) {
      const key = `${s.title}__${s.scheduled_at}`;
      if (!seen.has(key)) {
        seen.set(key, {
          id: s.id, title: s.title, at: s.scheduled_at,
          durationMinutes: s.duration_minutes, location: s.location,
        });
      }
    }
    return Array.from(seen.values());
  }, [sessions, refreshKey]);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your scheduled sessions</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Create Session
        </button>
      </header>

      <CalendarView events={events} />

      {open && (
        <CreateSessionModal
          mentor={profile!}
          students={accepted.map((r) => studentMap[r.student_id]).filter(Boolean) as Profile[]}
          onClose={() => setOpen(false)}
          onCreated={() => { setOpen(false); setRefreshKey((k) => k + 1); }}
        />
      )}
    </div>
  );
}

function CreateSessionModal({
  mentor, students, onClose, onCreated,
}: {
  mentor: Profile;
  students: Profile[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>(SESSION_TYPES[0]);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [location, setLocation] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id); else next.add(id);
    setPicked(next);
  };

  const submit = async () => {
    if (!title.trim()) { toast.error("Add a session title"); return; }
    if (picked.size === 0) { toast.error("Invite at least one student"); return; }
    const at = new Date(`${date}T${start}:00`);
    const endAt = new Date(`${date}T${end}:00`);
    if (isNaN(+at) || endAt <= at) { toast.error("Check date/time"); return; }
    const minutes = Math.round((+endAt - +at) / 60000);
    const finalTitle = `${title.trim()} · ${type}`;
    setSaving(true);
    const rows = Array.from(picked).map((sid) => ({
      mentor_id: mentor.id,
      student_id: sid,
      title: finalTitle,
      scheduled_at: at.toISOString(),
      duration_minutes: minutes,
      location: location.trim() || null,
      status: "confirmed",
    }));
    const { error } = await supabase.from("sessions").insert(rows);
    if (error) { setSaving(false); toast.error(error.message); return; }
    await Promise.all(
      Array.from(picked).map((sid) => createNotification({
        user_id: sid,
        type: "session_created",
        title: "New session scheduled",
        body: `${mentor.full_name ?? "Your mentor"} has scheduled a new session: ${finalTitle} on ${at.toLocaleString()}`,
        link: "/calendar",
      }))
    );
    toast.success("Session created");
    setSaving(false);
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-sm font-semibold">Create Session</h2>
          <button onClick={onClose} className="rounded-md border border-border p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
          <Input label="Title" value={title} onChange={setTitle} placeholder="e.g. Morning Ward Round" />
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">Type</div>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm">
              {SESSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input label="Date" type="date" value={date} onChange={setDate} />
            <Input label="Start" type="time" value={start} onChange={setStart} />
            <Input label="End" type="time" value={end} onChange={setEnd} />
          </div>
          <Input label="Location / Notes" value={location} onChange={setLocation} placeholder="e.g. Tashkent Medical Academy, Room 204" />
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">Invite students</div>
            {students.length === 0 ? (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                No active students yet.
              </div>
            ) : (
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                {students.map((s) => (
                  <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                    <input type="checkbox" checked={picked.has(s.id)} onChange={() => toggle(s.id)} />
                    <span className="truncate">{s.full_name}</span>
                    <span className="ml-auto truncate text-xs text-muted-foreground">{s.university ?? ""}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border p-3">
          <button onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">Cancel</button>
          <button disabled={saving} onClick={submit} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {saving ? "Creating…" : "Create Session"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm"
      />
    </div>
  );
}