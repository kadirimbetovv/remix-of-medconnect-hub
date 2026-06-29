import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Calendar as CalendarIcon, Check, FileText, MapPin, Paperclip, Search, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, type Profile } from "@/hooks/use-profile";
import { useMentors, useMyRequests } from "@/lib/data-hooks";
import { InitialsAvatar } from "@/components/initials-avatar";
import { createNotification } from "@/lib/notifications";
import { DAYS as DAYS_AVAIL, readBlocks, type Day as AvailDay } from "@/lib/availability";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
type Day = typeof DAYS[number];
type MentorMeta = {
  avatar_url?: string;
  requirements?: string;
  requires_interview?: boolean;
  availability?: Record<Day, { start: string; end: string; busy: boolean }>;
  availability_blocks?: Record<Day, boolean[]>;
};
const getMeta = (p: Profile): MentorMeta => (p.resume ?? {}) as MentorMeta;

export const Route = createFileRoute("/_app/mentors")({
  head: () => ({ meta: [{ title: "Find Mentors — MedMentor" }] }),
  component: MentorsPage,
});

function MentorsPage() {
  const { profile } = useProfile();
  const { mentors, loading } = useMentors();
  const { requests, reload } = useMyRequests(profile?.id, profile?.role);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Profile | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const requestedIds = new Set(requests.map((r) => r.mentor_id));
  const acceptedById = new Map(
    requests.filter((r) => r.status === "accepted").map((r) => [r.mentor_id, r]),
  );

  const handleRequest = async (
    m: Profile,
    opts: { interview_at?: string; file?: File | null } = {},
  ): Promise<boolean> => {
    if (!profile || profile.role !== "student") {
      toast.error("Only students can send mentorship requests.");
      return false;
    }
    if (requestedIds.has(m.id)) {
      toast.info(`Request to ${m.full_name} already sent`);
      return false;
    }
    setBusy(m.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = { student_id: profile.id, mentor_id: m.id };
    if (opts.interview_at) { payload.interview_at = opts.interview_at; payload.interview_status = "pending"; }
    if (opts.file) {
      const safe = opts.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${profile.id}/${Date.now()}-${safe}`;
      const up = await supabase.storage.from("request-attachments").upload(path, opts.file, {
        upsert: false,
        contentType: opts.file.type || undefined,
      });
      if (up.error) { setBusy(null); toast.error(`Upload failed: ${up.error.message}`); return false; }
      payload.attachment_path = path;
      payload.attachment_name = opts.file.name;
    }
    const { error } = await supabase.from("mentorship_requests").insert(payload);
    setBusy(null);
    if (error) {
      if (payload.attachment_path) {
        await supabase.storage.from("request-attachments").remove([payload.attachment_path]);
      }
      toast.error(error.message);
      return false;
    }
    toast.success(`Mentorship request sent to ${m.full_name}`);
    await createNotification({
      user_id: m.id,
      type: opts.interview_at ? "interview_requested" : "request_received",
      title: opts.interview_at ? "New interview request" : "New mentorship request",
      body: `${profile.full_name} requested${opts.interview_at ? ` an interview on ${new Date(opts.interview_at).toLocaleString()}` : " mentorship"}.`,
      link: "/mentor",
    });
    reload();
    setSelected(null);
    return true;
  };

  const handleLeave = async (m: Profile) => {
    const accepted = acceptedById.get(m.id);
    if (!accepted) return;
    const ok = window.confirm("Are you sure you want to leave this mentorship?");
    if (!ok) return;
    setBusy(m.id);
    const { error } = await supabase.from("mentorship_requests").delete().eq("id", accepted.id);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Left mentorship with ${m.full_name}`);
    await createNotification({
      user_id: m.id,
      type: "mentorship_ended",
      title: "Student left mentorship",
      body: `${profile?.full_name ?? "A student"} ended their mentorship with you.`,
      link: "/mentor/students",
    });
    reload();
    setSelected(null);
  };

  const toggleSave = (m: Profile) => {
    setSaved((s) => {
      const n = new Set(s);
      if (n.has(m.id)) { n.delete(m.id); toast(`Removed ${m.full_name} (this session only)`); }
      else { n.add(m.id); toast.success(`Pinned ${m.full_name} (this session only)`); }
      return n;
    });
  };

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return mentors;
    return mentors.filter(
      (m) =>
        m.full_name.toLowerCase().includes(t) ||
        (m.specialty ?? "").toLowerCase().includes(t) ||
        (m.hospital ?? "").toLowerCase().includes(t),
    );
  }, [q, mentors]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Find Mentors</h1>

      <div className="glass-card flex items-center gap-2 rounded-xl px-4 py-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, specialty, or hospital"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {loading ? (
        <div className="glass-card rounded-xl p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : results.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center text-sm text-muted-foreground">
          No mentors have signed up yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((m) => (
            <div key={m.id} className="glass-card group rounded-xl p-5 text-left transition hover:ring-1 hover:ring-primary/40">
              <button onClick={() => setSelected(m)} className="flex w-full items-center gap-3 text-left">
                <InitialsAvatar name={m.full_name} size="md" src={getMeta(m).avatar_url || null} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{m.full_name}</div>
                  {m.specialty && (
                    <span className="mt-0.5 inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary ring-1 ring-primary/30">
                      {m.specialty}
                    </span>
                  )}
                </div>
              </button>
              <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                {m.hospital && <div className="truncate">{m.hospital}</div>}
                {m.city && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {m.city}
                  </div>
                )}
                {m.years_experience != null && <div>{m.years_experience} years experience</div>}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setSelected(m)}
                  disabled={requestedIds.has(m.id) || busy === m.id || profile?.role !== "student"}
                  className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {requestedIds.has(m.id) ? "Requested ✓" : "Request Mentorship"}
                </button>
                <button
                  onClick={() => toggleSave(m)}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  {saved.has(m.id) ? "★" : "☆"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <MentorPanel
          mentor={selected}
          requested={requestedIds.has(selected.id)}
          activeAccepted={!!acceptedById.get(selected.id)}
          onRequest={(opts) => handleRequest(selected, opts)}
          onLeave={() => handleLeave(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function MentorPanel({ mentor, onClose, onRequest, onLeave, requested, activeAccepted }: {
  mentor: Profile;
  onClose: () => void;
  onRequest: (opts: { interview_at?: string; file?: File | null }) => Promise<boolean>;
  onLeave: () => void;
  requested: boolean;
  activeAccepted: boolean;
}) {
  const meta = getMeta(mentor);
  const [flowOpen, setFlowOpen] = useState(false);

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/60 backdrop-blur-sm">
      <button aria-label="Close" className="flex-1" onClick={onClose} />
      <aside className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <InitialsAvatar name={mentor.full_name} size="lg" src={meta.avatar_url || null} />
            <div>
              <div className="text-base font-semibold">{mentor.full_name}</div>
              {mentor.specialty && (
                <span className="mt-1 inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary ring-1 ring-primary/30">
                  {mentor.specialty}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-1 text-xs text-muted-foreground">
          {mentor.hospital && <div>{mentor.hospital}</div>}
          {mentor.city && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {mentor.city}
            </div>
          )}
          {mentor.years_experience != null && <div>{mentor.years_experience} years experience</div>}
          {mentor.languages && <div>Languages: {mentor.languages}</div>}
        </div>

        {activeAccepted && (
          <div className="mt-6 rounded-lg border border-success/40 bg-success/5 p-3">
            <div className="text-xs font-semibold text-success">Active mentorship — Contact</div>
            <div className="mt-2 space-y-1 text-xs">
              <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{mentor.email ?? "—"}</span></div>
              <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{mentor.phone ?? "—"}</span></div>
            </div>
          </div>
        )}

        {meta.requirements ? (
          <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="text-xs font-semibold text-primary">Requirements</div>
            <p className="mt-1 whitespace-pre-wrap text-xs text-foreground">{meta.requirements}</p>
            {meta.requires_interview && (
              <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                Interview required
              </div>
            )}
          </div>
        ) : meta.requires_interview ? (
          <div className="mt-6 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
            This mentor requires a short interview before accepting students.
          </div>
        ) : null}

        <AvailabilitySummary resume={mentor.resume} />

        {activeAccepted ? (
          <button
            onClick={onLeave}
            className="mt-6 w-full rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive transition hover:bg-destructive hover:text-destructive-foreground"
          >
            Leave Mentorship
          </button>
        ) : (
          <button
            onClick={() => setFlowOpen(true)}
            disabled={requested}
            className="mt-6 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {requested ? "Request Sent ✓" : "Request Mentorship"}
          </button>
        )}
      </aside>

      {flowOpen && (
        <RequestFlow
          mentor={mentor}
          onSubmit={onRequest}
          onClose={() => setFlowOpen(false)}
        />
      )}
    </div>
  );
}

// =========================
// Request Mentorship Flow
// =========================

function RequestFlow({
  mentor,
  onSubmit,
  onClose,
}: {
  mentor: Profile;
  onSubmit: (opts: { interview_at?: string; file?: File | null }) => Promise<boolean>;
  onClose: () => void;
}) {
  const meta = getMeta(mentor);
  const requiresInterview = !!meta.requires_interview;
  const blocks = useMemo(() => readBlocks(mentor.resume), [mentor.resume]);

  const [step, setStep] = useState(0);
  const [pickedDayIdx, setPickedDayIdx] = useState<number | null>(null);
  const [pickedSlot, setPickedSlot] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [booked, setBooked] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Fetch already-booked slots
  useEffect(() => {
    if (!requiresInterview) return;
    (async () => {
      const { data, error } = await supabase.rpc("mentor_booked_slots", { _mentor_id: mentor.id });
      if (!error && data) {
        const set = new Set<string>();
        for (const row of data as { interview_at: string }[]) {
          if (row.interview_at) set.add(new Date(row.interview_at).toISOString());
        }
        setBooked(set);
      }
    })();
  }, [mentor.id, requiresInterview]);

  // Build 7-day view from today
  const days = useMemo(() => {
    const out: { date: Date; key: AvailDay; slots: { iso: string; label: string; booked: boolean }[] }[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + i);
      date.setHours(0, 0, 0, 0);
      const dayIdx = (date.getDay() + 6) % 7;
      const key = DAYS_AVAIL[dayIdx] as AvailDay;
      const dayBlocks = blocks[key] ?? [];
      const slots: { iso: string; label: string; booked: boolean }[] = [];
      for (let b = 0; b < dayBlocks.length; b++) {
        if (!dayBlocks[b]) continue;
        const baseMin = b * 30;
        for (let off = 0; off < 30; off += 10) {
          const t = baseMin + off;
          const d = new Date(date);
          d.setHours(Math.floor(t / 60), t % 60, 0, 0);
          if (d <= now) continue;
          const iso = d.toISOString();
          slots.push({
            iso,
            label: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            booked: booked.has(iso),
          });
        }
      }
      out.push({ date, key, slots });
    }
    return out;
  }, [blocks, booked]);

  // Steps array (conditional interview step)
  const stepIds: Array<"intro" | "interview" | "file" | "confirm"> = requiresInterview
    ? ["intro", "interview", "file", "confirm"]
    : ["intro", "file", "confirm"];
  const currentStep = stepIds[step];

  const canNext = (() => {
    if (currentStep === "interview") return !!pickedSlot;
    return true;
  })();

  const onPickFile = (f: File | null) => {
    if (!f) { setFile(null); return; }
    if (f.size > 10 * 1024 * 1024) { toast.error("File too large (max 10MB)."); return; }
    setFile(f);
  };

  const submit = async () => {
    setSubmitting(true);
    const ok = await onSubmit({
      interview_at: requiresInterview ? pickedSlot : undefined,
      file,
    });
    setSubmitting(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="text-sm font-semibold">Request Mentorship</div>
            <div className="text-xs text-muted-foreground">{mentor.full_name}</div>
          </div>
          <button onClick={onClose} className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1 px-5 pt-4">
          {stepIds.map((id, i) => (
            <div
              key={id}
              className={`h-1 flex-1 rounded-full transition ${
                i <= step ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-5">
          {currentStep === "intro" && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Mentor's requirements</h3>
              {meta.requirements ? (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <p className="whitespace-pre-wrap text-xs text-foreground">{meta.requirements}</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">This mentor hasn't set specific requirements.</p>
              )}
              {requiresInterview && (
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
                  Requires a short interview before accepting. You'll pick a slot next.
                </div>
              )}
            </div>
          )}

          {currentStep === "interview" && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <CalendarIcon className="h-4 w-4 text-primary" /> Pick an interview slot
              </h3>
              <p className="text-xs text-muted-foreground">Next 7 days · 10-minute window</p>
              <div className="grid grid-cols-7 gap-1.5">
                {days.map((d, i) => {
                  const has = d.slots.length > 0;
                  const isPicked = i === pickedDayIdx;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!has}
                      onClick={() => { setPickedDayIdx(i); setPickedSlot(""); }}
                      className={`rounded-md border px-1 py-2 text-center text-[10px] transition ${
                        isPicked
                          ? "border-primary bg-primary text-primary-foreground"
                          : has
                            ? "border-success/40 bg-success/10 text-success hover:border-success"
                            : "cursor-not-allowed border-border bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <div className="font-semibold">{d.date.toLocaleDateString([], { weekday: "short" })}</div>
                      <div className="mt-0.5">{d.date.getDate()}</div>
                    </button>
                  );
                })}
              </div>
              {pickedDayIdx !== null && (
                <div>
                  <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                    {days[pickedDayIdx].date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
                  </div>
                  {days[pickedDayIdx].slots.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No open slots this day.</p>
                  ) : (
                    <div className="grid max-h-48 grid-cols-3 gap-1.5 overflow-y-auto pr-1">
                      {days[pickedDayIdx].slots.map((s) => {
                        const isPicked = s.iso === pickedSlot;
                        return (
                          <button
                            key={s.iso}
                            type="button"
                            disabled={s.booked}
                            onClick={() => setPickedSlot(s.iso)}
                            className={`rounded-md border px-2 py-1.5 text-[11px] transition ${
                              s.booked
                                ? "cursor-not-allowed border-border bg-muted/40 text-muted-foreground line-through"
                                : isPicked
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background hover:border-primary/50"
                            }`}
                            title={s.booked ? "Already booked" : ""}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {currentStep === "file" && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <Paperclip className="h-4 w-4 text-primary" /> Upload document (optional)
              </h3>
              <p className="text-xs text-muted-foreground">
                Attach a motivational letter or other document. PDF, DOC, or image, up to 10MB.
              </p>
              {file ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium">{file.name}</div>
                      <div className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                  </div>
                  <button onClick={() => setFile(null)} className="text-xs text-destructive hover:underline">
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground">
                  <Upload className="h-4 w-4" />
                  <span>Click to choose a file</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                    className="hidden"
                    onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
            </div>
          )}

          {currentStep === "confirm" && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Confirm your request</h3>
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Mentor</span>
                  <span className="font-medium">{mentor.full_name}</span>
                </div>
                {requiresInterview && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Interview</span>
                    <span className="font-medium">
                      {pickedSlot
                        ? new Date(pickedSlot).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </span>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Document</span>
                  <span className="truncate font-medium">{file ? file.name : "None"}</span>
                </div>
              </div>
              <p className="text-xs text-foreground">
                Are you sure you want to request mentorship from {mentor.full_name}?
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          <button
            onClick={step === 0 ? onClose : () => setStep((s) => s - 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {step === 0 ? "Cancel" : "Back"}
          </button>
          {currentStep === "confirm" ? (
            <button
              onClick={submit}
              disabled={submitting || (requiresInterview && !pickedSlot)}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check className="h-3.5 w-3.5" /> {submitting ? "Sending…" : "Confirm & Send"}
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AvailabilitySummary({ resume }: { resume: unknown }) {
  const blocks = readBlocks(resume);
  // Group contiguous available blocks into ranges per day
  const fmt = (i: number) => {
    const h = Math.floor(i / 2);
    const m = (i % 2) * 30;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };
  return (
    <div className="mt-6">
      <div className="text-xs font-semibold">Weekly availability</div>
      <div className="mt-2 space-y-1">
        {DAYS_AVAIL.map((d) => {
          const arr = blocks[d];
          const ranges: string[] = [];
          let i = 0;
          while (i < arr.length) {
            if (!arr[i]) { i++; continue; }
            const start = i;
            while (i < arr.length && arr[i]) i++;
            ranges.push(`${fmt(start)}–${fmt(i)}`);
          }
          return (
            <div key={d} className="flex items-center justify-between rounded-md border border-border px-2 py-1 text-[11px]">
              <span className="font-medium">{d}</span>
              <span className={ranges.length === 0 ? "text-muted-foreground" : "text-foreground"}>
                {ranges.length === 0 ? "Unavailable" : ranges.join(", ")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}