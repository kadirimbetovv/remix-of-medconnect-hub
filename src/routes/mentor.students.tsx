import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, MessageSquare, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useProfile, type Profile } from "@/hooks/use-profile";
import { useMyRequests, loadProfilesByIds, type MentorshipRequest } from "@/lib/data-hooks";
import { InitialsAvatar } from "@/components/initials-avatar";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/notifications";

export const Route = createFileRoute("/mentor/students")({
  head: () => ({ meta: [{ title: "My Students — MedMentor" }] }),
  component: StudentsPage,
});

type StudentResume = {
  about?: string;
  skills?: string[];
  interests?: string[];
  experience?: { title?: string; org?: string; period?: string; description?: string }[];
  certifications?: { name?: string; issuer?: string; year?: string }[];
  achievements?: { title?: string; year?: string; description?: string }[];
  languages?: string[];
};

function StudentsPage() {
  const { profile } = useProfile();
  const { requests, reload } = useMyRequests(profile?.id, profile?.role);
  const [studentMap, setStudentMap] = useState<Record<string, Profile>>({});
  const [selected, setSelected] = useState<{ student: Profile; request: MentorshipRequest } | null>(null);

  const accepted = requests.filter((r) => r.status === "accepted");

  useEffect(() => {
    const ids = Array.from(new Set(accepted.map((r) => r.student_id)));
    loadProfilesByIds(ids).then(setStudentMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests]);

  const removeStudent = async (req: MentorshipRequest, studentName: string) => {
    const ok = window.confirm("Are you sure you want to remove this student?");
    if (!ok) return;
    const { error } = await supabase.from("mentorship_requests").delete().eq("id", req.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Removed ${studentName}`);
    await createNotification({
      user_id: req.student_id,
      type: "mentorship_ended",
      title: "Mentorship ended",
      body: `${profile?.full_name ?? "Your mentor"} ended the mentorship.`,
      link: "/mentors",
    });
    setSelected(null);
    reload();
  };

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">My Students</h1>
        <p className="mt-1 text-sm text-muted-foreground">{accepted.length} accepted students</p>
      </header>

      {accepted.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          You haven't accepted any students yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accepted.map((r) => {
            const s = studentMap[r.student_id];
            return (
              <button
                key={r.id}
                onClick={() => s && setSelected({ student: s, request: r })}
                className="rounded-lg border border-border bg-card p-4 text-left transition hover:border-primary/50 hover:bg-muted/40"
              >
                <div className="flex items-center gap-3">
                  <InitialsAvatar name={s?.full_name} size="md" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{s?.full_name ?? "Student"}</div>
                    <div className="truncate text-xs text-muted-foreground">{s?.university ?? "—"}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  {s?.year_of_study && <span>Year {s.year_of_study}</span>}
                  {s?.specialty && <><span>·</span><span>{s.specialty}</span></>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <StudentPanel
          student={selected.student}
          onClose={() => setSelected(null)}
          onRemove={() => removeStudent(selected.request, selected.student.full_name)}
        />
      )}
    </div>
  );
}

function StudentPanel({ student, onClose, onRemove }: { student: Profile; onClose: () => void; onRemove: () => void }) {
  const resume = (student.resume ?? {}) as StudentResume;
  const avatar = (student.resume as { avatar_url?: string } | null)?.avatar_url || null;

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/60 backdrop-blur-sm">
      <button aria-label="Close" className="flex-1" onClick={onClose} />
      <aside className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <InitialsAvatar name={student.full_name} size="lg" src={avatar} />
            <div className="min-w-0">
              <div className="truncate text-base font-semibold">{student.full_name}</div>
              <div className="truncate text-xs text-muted-foreground">{student.university ?? "—"}</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 rounded-lg border border-success/40 bg-success/5 p-3">
          <div className="text-xs font-semibold text-success">Active mentorship — Contact</div>
          <div className="mt-2 space-y-1 text-xs">
            <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{student.email ?? "—"}</span></div>
            <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{student.phone ?? "—"}</span></div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
          <Field label="Year of study" value={student.year_of_study ? `Year ${student.year_of_study}` : "—"} />
          <Field label="Specialty" value={student.specialty ?? "—"} />
          <Field label="City" value={student.city ?? "—"} />
          <Field label="Languages" value={(resume.languages?.join(", ") || student.languages) ?? "—"} />
        </div>

        {student.bio && (
          <Section title="About">
            <p className="whitespace-pre-wrap text-sm text-foreground">{student.bio}</p>
          </Section>
        )}

        {!!resume.interests?.length && (
          <Section title="Specialty interests">
            <Tags items={resume.interests} />
          </Section>
        )}

        {!!resume.skills?.length && (
          <Section title="Skills">
            <Tags items={resume.skills} />
          </Section>
        )}

        {!!resume.experience?.length && (
          <Section title="Experience">
            <ul className="space-y-3">
              {resume.experience.map((e, i) => (
                <li key={i} className="rounded-md border border-border bg-muted/30 p-3">
                  <div className="text-sm font-medium">{e.title ?? "Role"}</div>
                  <div className="text-xs text-muted-foreground">
                    {[e.org, e.period].filter(Boolean).join(" · ") || "—"}
                  </div>
                  {e.description && <p className="mt-1 text-xs">{e.description}</p>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {!!resume.certifications?.length && (
          <Section title="Certifications">
            <ul className="space-y-1.5 text-xs">
              {resume.certifications.map((c, i) => (
                <li key={i} className="rounded-md border border-border bg-muted/30 px-2.5 py-1.5">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground"> — {[c.issuer, c.year].filter(Boolean).join(", ")}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {!!resume.achievements?.length && (
          <Section title="Achievements">
            <ul className="space-y-1.5 text-xs">
              {resume.achievements.map((a, i) => (
                <li key={i} className="rounded-md border border-border bg-muted/30 px-2.5 py-1.5">
                  <span className="font-medium">{a.title}</span>
                  {a.year && <span className="text-muted-foreground"> · {a.year}</span>}
                  {a.description && <p className="mt-0.5 text-muted-foreground">{a.description}</p>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            onClick={() => toast("Assign Task — coming soon")}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            <ClipboardList className="h-3.5 w-3.5" /> Assign Task
          </button>
          <button
            onClick={() => toast("Messaging — coming soon")}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted"
          >
            <MessageSquare className="h-3.5 w-3.5" /> Message
          </button>
        </div>

        <button
          onClick={onRemove}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive hover:text-destructive-foreground"
        >
          <Trash2 className="h-3.5 w-3.5" /> Remove Student
        </button>
      </aside>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Tags({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t, i) => (
        <span key={i} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary ring-1 ring-primary/20">
          {t}
        </span>
      ))}
    </div>
  );
}