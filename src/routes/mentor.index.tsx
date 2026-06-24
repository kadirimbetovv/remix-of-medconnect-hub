import { createFileRoute } from "@tanstack/react-router";
import { Check, Clock, FileText, Lock, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, type Profile } from "@/hooks/use-profile";
import { useMyRequests, useMySessions, loadProfilesByIds, type MentorshipRequest } from "@/lib/data-hooks";
import { InitialsAvatar } from "@/components/initials-avatar";
import { createNotification } from "@/lib/notifications";
import { StudentProfilePanel } from "@/components/student-profile-panel";

export const Route = createFileRoute("/mentor/")({
  head: () => ({ meta: [{ title: "Home — MedMentor" }] }),
  component: MentorHome,
});

function MentorHome() {
  const { profile } = useProfile();
  const { requests, reload } = useMyRequests(profile?.id, profile?.role);
  const { sessions } = useMySessions(profile?.id, profile?.role);
  const [studentMap, setStudentMap] = useState<Record<string, Profile>>({});
  const [selected, setSelected] = useState<{ student: Profile; request: MentorshipRequest } | null>(null);
  const [declining, setDeclining] = useState<MentorshipRequest | null>(null);

  useEffect(() => {
    const ids = Array.from(new Set(requests.map((r) => r.student_id)));
    loadProfilesByIds(ids).then(setStudentMap);
  }, [requests]);

  const pending = requests.filter((r) => r.status === "pending");
  const accepted = requests.filter((r) => r.status === "accepted");

  const accept = async (req: MentorshipRequest) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: any = { status: "accepted" };
    if (req.interview_at) update.interview_status = "confirmed";
    const { error } = await supabase.from("mentorship_requests").update(update).eq("id", req.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Request accepted");
    await createNotification({
      user_id: req.student_id,
      type: "request_accepted",
      title: "Mentorship request accepted",
      body: `${profile?.full_name ?? "Mentor"} accepted your mentorship request.`,
      link: "/dashboard",
      related_id: req.id,
    });
    setSelected(null);
    reload();
  };

  const submitDecline = async (req: MentorshipRequest, reason: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: any = { status: "declined", decline_reason: reason };
    if (req.interview_at) update.interview_status = "declined";
    const { error } = await supabase.from("mentorship_requests").update(update).eq("id", req.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Request declined");
    await createNotification({
      user_id: req.student_id,
      type: "request_declined",
      title: "Mentorship request declined",
      body: `${profile?.full_name ?? "Mentor"} declined your request: "${reason}"`,
      link: "/dashboard",
      related_id: req.id,
    });
    setDeclining(null);
    setSelected(null);
    reload();
  };

  const interviewPassed = (req: MentorshipRequest) =>
    !req.interview_at || new Date(req.interview_at).getTime() <= Date.now();

  const firstName = profile?.full_name?.replace(/^Dr\.?\s+/i, "").split(" ")[0] ?? "Mentor";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, Dr. {firstName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here's what's happening today.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Active Students" value={accepted.length} icon={<Users className="h-4 w-4" />} />
        <Stat label="Sessions" value={sessions.length} icon={<Clock className="h-4 w-4" />} />
        <Stat label="Pending Requests" value={pending.length} icon={<Users className="h-4 w-4" />} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Pending Requests</h2>
        {pending.length === 0 ? (
          <EmptyState text="No pending requests." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {pending.map((r, i) => {
              const s = studentMap[r.student_id];
              const canAccept = interviewPassed(r);
              return (
                <div key={r.id} className={`flex items-center justify-between gap-4 px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <InitialsAvatar name={s?.full_name} size="md" />
                    <div className="min-w-0">
                      <button
                        onClick={() => s && setSelected({ student: s, request: r })}
                        className="truncate text-left text-sm font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {s?.full_name ?? "Student"}
                      </button>
                      <div className="truncate text-xs text-muted-foreground">
                        {[s?.specialty, s?.university].filter(Boolean).join(" · ") || "—"}
                      </div>
                      {r.interview_at && (
                        <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                          Interview · {new Date(r.interview_at).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          {!canAccept && <span className="ml-1 inline-flex items-center gap-0.5"><Lock className="h-2.5 w-2.5" /> awaiting</span>}
                        </div>
                      )}
                      {r.attachment_path && (
                        <AttachmentLink path={r.attachment_path} name={r.attachment_name ?? "attachment"} />
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => accept(r)}
                      disabled={!canAccept}
                      title={!canAccept ? "Accept becomes available after the interview" : undefined}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" /> Accept
                    </button>
                    <button
                      onClick={() => setDeclining(r)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" /> Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Upcoming Sessions</h2>
        {sessions.length === 0 ? (
          <EmptyState text="No upcoming sessions." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {sessions.map((s, i) => (
              <div key={s.id} className={`grid grid-cols-[1fr_auto] gap-4 px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}>
                <div className="text-sm font-medium">{s.title}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(s.scheduled_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <StudentProfilePanel
          student={selected.student}
          request={selected.request}
          showContact={selected.request.status === "accepted"}
          onClose={() => setSelected(null)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => accept(selected.request)}
                disabled={!interviewPassed(selected.request)}
                className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Accept
              </button>
              <button
                onClick={() => setDeclining(selected.request)}
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted"
              >
                Decline
              </button>
            </div>
          }
        />
      )}

      {declining && (
        <DeclineModal
          onCancel={() => setDeclining(null)}
          onSubmit={(reason) => submitDecline(declining, reason)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs">{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-2xl font-semibold text-primary">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function AttachmentLink({ path, name }: { path: string; name: string }) {
  const open = async () => {
    const { data, error } = await supabase.storage
      .from("request-attachments")
      .createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      toast.error("Could not open attachment");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  return (
    <button
      onClick={open}
      className="mt-1 inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/20"
    >
      <FileText className="h-3 w-3" /> {name}
    </button>
  );
}

function DeclineModal({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!reason.trim()) { toast.error("Please provide a reason"); return; }
    setSaving(true);
    await onSubmit(reason.trim());
    setSaving(false);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-sm font-semibold">Decline Request</h2>
          <button onClick={onCancel} className="rounded-md border border-border p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-2 p-4">
          <label className="text-xs font-medium text-muted-foreground">Please provide a reason for declining</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="e.g. We are looking for students with more clinical experience"
            className="w-full rounded-md border border-border bg-background p-2.5 text-sm"
            autoFocus
          />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border p-3">
          <button onClick={onCancel} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">Cancel</button>
          <button disabled={saving} onClick={submit} className="rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-60">
            {saving ? "Sending…" : "Send & Decline"}
          </button>
        </div>
      </div>
    </div>
  );
}