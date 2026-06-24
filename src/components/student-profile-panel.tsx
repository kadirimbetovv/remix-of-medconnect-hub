import { FileText, X } from "lucide-react";
import { toast } from "sonner";
import type { Profile } from "@/hooks/use-profile";
import type { MentorshipRequest } from "@/lib/data-hooks";
import { InitialsAvatar } from "@/components/initials-avatar";
import { supabase } from "@/integrations/supabase/client";

type StudentResume = {
  about?: string;
  skills?: string[];
  interests?: string[];
  experience?: { title?: string; org?: string; period?: string; description?: string }[];
  certifications?: { name?: string; issuer?: string; year?: string }[];
  achievements?: { title?: string; year?: string; description?: string }[];
  languages?: string[];
  avatar_url?: string;
};

export function StudentProfilePanel({
  student,
  request,
  showContact = false,
  onClose,
  footer,
}: {
  student: Profile;
  request?: MentorshipRequest;
  showContact?: boolean;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  const resume = (student.resume ?? {}) as StudentResume;
  const avatar = resume.avatar_url || null;

  const openAttachment = async () => {
    if (!request?.attachment_path) return;
    const { data, error } = await supabase.storage
      .from("request-attachments")
      .createSignedUrl(request.attachment_path, 60);
    if (error || !data?.signedUrl) { toast.error("Could not open attachment"); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60 backdrop-blur-sm">
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

        {showContact && (
          <div className="mt-5 rounded-lg border border-success/40 bg-success/5 p-3">
            <div className="text-xs font-semibold text-success">Active mentorship — Contact</div>
            <div className="mt-2 space-y-1 text-xs">
              <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{student.email ?? "—"}</span></div>
              <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{student.phone ?? "—"}</span></div>
            </div>
          </div>
        )}

        {request?.attachment_path && (
          <button
            onClick={openAttachment}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
          >
            <FileText className="h-3.5 w-3.5" /> {request.attachment_name ?? "Motivational letter"}
          </button>
        )}

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
          <Section title="Specialty interests"><Tags items={resume.interests} /></Section>
        )}

        {!!resume.skills?.length && (
          <Section title="Skills"><Tags items={resume.skills} /></Section>
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

        {footer && <div className="mt-6">{footer}</div>}
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