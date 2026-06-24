import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/use-profile";
import { InitialsAvatar } from "@/components/initials-avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — MedMentor" }] }),
  component: ProfilePage,
});

type Experience = { id: string; title: string; place: string; start: string; end: string; description: string };
type Certification = { id: string; name: string; org: string; date: string };
type Language = { id: string; language: string; level: "Beginner" | "Intermediate" | "Fluent" | "Native" };
type Achievement = { id: string; title: string; description: string; date: string };

type Resume = {
  education: { university: string; year_of_study: string; expected_graduation: string; gpa: string };
  specialty_interests: string[];
  experience: Experience[];
  skills: string[];
  certifications: Certification[];
  languages: Language[];
  achievements: Achievement[];
  avatar_url?: string;
};

const emptyResume: Resume = {
  education: { university: "", year_of_study: "", expected_graduation: "", gpa: "" },
  specialty_interests: [],
  experience: [],
  skills: [],
  certifications: [],
  languages: [],
  achievements: [],
  avatar_url: "",
};

const uid = () => Math.random().toString(36).slice(2, 10);

function mergeResume(input: unknown): Resume {
  const r = (input ?? {}) as Partial<Resume>;
  return {
    education: { ...emptyResume.education, ...(r.education ?? {}) },
    specialty_interests: r.specialty_interests ?? [],
    experience: r.experience ?? [],
    skills: r.skills ?? [],
    certifications: r.certifications ?? [],
    languages: r.languages ?? [],
    achievements: r.achievements ?? [],
    avatar_url: r.avatar_url ?? "",
  };
}

function ProfilePage() {
  const { profile, loading, error, reload } = useProfile();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [resume, setResume] = useState<Resume>(emptyResume);
  const [skillInput, setSkillInput] = useState("");
  const [interestInput, setInterestInput] = useState("");

  useEffect(() => {
    if (!profile) return;
    setBio(profile.bio ?? "");
    setCity(profile.city ?? "");
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
    setResume(mergeResume(profile.resume));
  }, [profile]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <div className="h-28 animate-pulse rounded-2xl bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold">Couldn't load your profile</h2>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <button onClick={reload} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Retry
          </button>
        </div>
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold">You're not signed in</h2>
          <p className="mt-2 text-sm text-muted-foreground">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        city: city || null,
        bio: bio || null,
        phone: phone || null,
        university: resume.education.university || null,
        year_of_study: resume.education.year_of_study ? Number(resume.education.year_of_study) : null,
        resume: resume as unknown as never,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved");
    setEditing(false);
  };

  const cancel = () => {
    setBio(profile.bio ?? "");
    setCity(profile.city ?? "");
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
    setResume(mergeResume(profile.resume));
    setEditing(false);
  };

  const addSkill = () => {
    const v = skillInput.trim();
    if (!v || resume.skills.includes(v)) return;
    setResume({ ...resume, skills: [...resume.skills, v] });
    setSkillInput("");
  };
  const addInterest = () => {
    const v = interestInput.trim();
    if (!v || resume.specialty_interests.includes(v)) return;
    setResume({ ...resume, specialty_interests: [...resume.specialty_interests, v] });
    setInterestInput("");
  };

  const onPickAvatar = async (file: File | null) => {
    if (!file) return;
    if (file.size > 500_000) { toast.error("Image too large (max 500KB)."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      setResume({ ...resume, avatar_url: url });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Header */}
      <section className="glass-card rounded-2xl p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className="relative">
              <InitialsAvatar name={fullName || profile.full_name} size="xl" src={resume.avatar_url || null} />
              {editing && (
                <div className="mt-2 flex flex-col items-start gap-1">
                  <label className="cursor-pointer rounded-md border border-border bg-card px-2 py-1 text-[10px] font-medium hover:bg-muted">
                    Upload
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickAvatar(e.target.files?.[0] ?? null)} />
                  </label>
                  {resume.avatar_url && (
                    <button type="button" onClick={() => setResume({ ...resume, avatar_url: "" })} className="text-[10px] text-destructive hover:underline">
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              {editing ? (
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-xl font-semibold"
                  placeholder="Full name"
                />
              ) : (
                <h1 className="text-2xl font-semibold tracking-tight">{profile.full_name}</h1>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {editing ? (
                  <>
                    <input
                      value={resume.education.university}
                      onChange={(e) => setResume({ ...resume, education: { ...resume.education, university: e.target.value } })}
                      placeholder="University"
                      className="rounded-md border border-border bg-background px-2 py-1"
                    />
                    <input
                      value={resume.education.year_of_study}
                      onChange={(e) => setResume({ ...resume, education: { ...resume.education, year_of_study: e.target.value } })}
                      placeholder="Year"
                      className="w-20 rounded-md border border-border bg-background px-2 py-1"
                    />
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                      className="rounded-md border border-border bg-background px-2 py-1"
                    />
                  </>
                ) : (
                  <span>
                    {[
                      resume.education.university,
                      resume.education.year_of_study && `Year ${resume.education.year_of_study}`,
                      city,
                    ].filter(Boolean).join(" · ") || "Add your education and location"}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {resume.specialty_interests.map((t) => (
                  <Tag key={t} label={t} onRemove={editing ? () => setResume({ ...resume, specialty_interests: resume.specialty_interests.filter((x) => x !== t) }) : undefined} />
                ))}
                {editing && (
                  <div className="flex items-center gap-1">
                    <input
                      value={interestInput}
                      onChange={(e) => setInterestInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInterest())}
                      placeholder="+ Add interest"
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button onClick={cancel} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted">
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
                <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
                  <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted">
                <Pencil className="h-3.5 w-3.5" /> Edit Profile
              </button>
            )}
          </div>
        </div>
      </section>

      {/* About */}
      <Section title="About">
        {editing ? (
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="Short personal statement…"
            className="w-full rounded-md border border-border bg-background p-3 text-sm"
          />
        ) : bio ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{bio}</p>
        ) : (
          <Empty label="No bio added yet" />
        )}
      </Section>

      {/* Contact */}
      <Section title="Contact">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
            <input
              value={profile.email ?? ""}
              readOnly
              className="w-full cursor-not-allowed rounded-md border border-border bg-muted/40 px-2 py-1.5 text-sm text-muted-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Phone Number</label>
            {editing ? (
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
            ) : (
              <div className="rounded-md border border-border bg-background px-2 py-1.5 text-sm">
                {profile.phone || <span className="text-muted-foreground">Not added</span>}
              </div>
            )}
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Your email and phone are shared with mentors once a mentorship is active.
        </p>
      </Section>

      {/* Education */}
      <Section title="Education">
        {editing ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="University" value={resume.education.university} onChange={(v) => setResume({ ...resume, education: { ...resume.education, university: v } })} />
            <Field label="Year of Study" value={resume.education.year_of_study} onChange={(v) => setResume({ ...resume, education: { ...resume.education, year_of_study: v } })} />
            <Field label="Expected Graduation" value={resume.education.expected_graduation} onChange={(v) => setResume({ ...resume, education: { ...resume.education, expected_graduation: v } })} placeholder="e.g. 2027" />
            <Field label="GPA (optional)" value={resume.education.gpa} onChange={(v) => setResume({ ...resume, education: { ...resume.education, gpa: v } })} />
          </div>
        ) : resume.education.university || resume.education.expected_graduation ? (
          <div className="space-y-1 text-sm">
            <div className="font-medium text-foreground">{resume.education.university || "—"}</div>
            <div className="text-muted-foreground">
              {[
                resume.education.year_of_study && `Year ${resume.education.year_of_study}`,
                resume.education.expected_graduation && `Expected ${resume.education.expected_graduation}`,
                resume.education.gpa && `GPA ${resume.education.gpa}`,
              ].filter(Boolean).join(" · ")}
            </div>
          </div>
        ) : (
          <Empty label="No education added yet" />
        )}
      </Section>

      {/* Skills */}
      <Section title="Skills">
        <div className="flex flex-wrap gap-2">
          {resume.skills.map((s) => (
            <Tag key={s} label={s} onRemove={editing ? () => setResume({ ...resume, skills: resume.skills.filter((x) => x !== s) }) : undefined} />
          ))}
          {editing && (
            <div className="flex items-center gap-1.5">
              <input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                placeholder="Add skill"
                className="rounded-md border border-border bg-background px-2 py-1 text-xs"
              />
              <button onClick={addSkill} className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground">Add</button>
            </div>
          )}
          {!editing && resume.skills.length === 0 && <Empty label="No skills added yet" />}
        </div>
      </Section>

      {/* Experience */}
      <RepeatableSection
        title="Experience"
        items={resume.experience}
        editing={editing}
        emptyLabel="No experience added yet"
        onAdd={() => setResume({ ...resume, experience: [...resume.experience, { id: uid(), title: "", place: "", start: "", end: "", description: "" }] })}
        onRemove={(id) => setResume({ ...resume, experience: resume.experience.filter((x) => x.id !== id) })}
        renderEdit={(item, update) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Title" value={item.title} onChange={(v) => update({ ...item, title: v })} />
            <Field label="Place" value={item.place} onChange={(v) => update({ ...item, place: v })} placeholder="Hospital / Clinic / Lab" />
            <Field label="Start" value={item.start} onChange={(v) => update({ ...item, start: v })} placeholder="Jun 2025" />
            <Field label="End" value={item.end} onChange={(v) => update({ ...item, end: v })} placeholder="Aug 2025 or Present" />
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
              <textarea value={item.description} onChange={(e) => update({ ...item, description: e.target.value })} rows={2} className="w-full rounded-md border border-border bg-background p-2 text-sm" />
            </div>
          </div>
        )}
        renderView={(item) => (
          <div>
            <div className="font-medium text-foreground">{item.title || "Untitled"}</div>
            <div className="text-sm text-muted-foreground">
              {[item.place, [item.start, item.end].filter(Boolean).join(" – ")].filter(Boolean).join(" · ")}
            </div>
            {item.description && <p className="mt-1 text-sm text-foreground">{item.description}</p>}
          </div>
        )}
      />

      {/* Certifications */}
      <RepeatableSection
        title="Certifications & Courses"
        items={resume.certifications}
        editing={editing}
        emptyLabel="No certifications added yet"
        onAdd={() => setResume({ ...resume, certifications: [...resume.certifications, { id: uid(), name: "", org: "", date: "" }] })}
        onRemove={(id) => setResume({ ...resume, certifications: resume.certifications.filter((x) => x.id !== id) })}
        renderEdit={(item, update) => (
          <div className="grid gap-2 sm:grid-cols-3">
            <Field label="Name" value={item.name} onChange={(v) => update({ ...item, name: v })} />
            <Field label="Organization" value={item.org} onChange={(v) => update({ ...item, org: v })} />
            <Field label="Date" value={item.date} onChange={(v) => update({ ...item, date: v })} placeholder="2025" />
          </div>
        )}
        renderView={(item) => (
          <div>
            <div className="font-medium text-foreground">{item.name || "Untitled"}</div>
            <div className="text-sm text-muted-foreground">{[item.org, item.date].filter(Boolean).join(" · ")}</div>
          </div>
        )}
      />

      {/* Languages */}
      <RepeatableSection
        title="Languages"
        items={resume.languages}
        editing={editing}
        emptyLabel="No languages added yet"
        onAdd={() => setResume({ ...resume, languages: [...resume.languages, { id: uid(), language: "", level: "Intermediate" }] })}
        onRemove={(id) => setResume({ ...resume, languages: resume.languages.filter((x) => x.id !== id) })}
        renderEdit={(item, update) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Language" value={item.language} onChange={(v) => update({ ...item, language: v })} />
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Level</label>
              <select
                value={item.level}
                onChange={(e) => update({ ...item, level: e.target.value as Language["level"] })}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              >
                {["Beginner", "Intermediate", "Fluent", "Native"].map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        renderView={(item) => (
          <div className="text-sm">
            <span className="font-medium text-foreground">{item.language || "—"}</span>
            <span className="text-muted-foreground"> · {item.level}</span>
          </div>
        )}
      />

      {/* Achievements */}
      <RepeatableSection
        title="Achievements & Awards"
        items={resume.achievements}
        editing={editing}
        emptyLabel="No achievements added yet"
        onAdd={() => setResume({ ...resume, achievements: [...resume.achievements, { id: uid(), title: "", description: "", date: "" }] })}
        onRemove={(id) => setResume({ ...resume, achievements: resume.achievements.filter((x) => x.id !== id) })}
        renderEdit={(item, update) => (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Title" value={item.title} onChange={(v) => update({ ...item, title: v })} />
            <Field label="Date" value={item.date} onChange={(v) => update({ ...item, date: v })} />
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
              <textarea value={item.description} onChange={(e) => update({ ...item, description: e.target.value })} rows={2} className="w-full rounded-md border border-border bg-background p-2 text-sm" />
            </div>
          </div>
        )}
        renderView={(item) => (
          <div>
            <div className="font-medium text-foreground">{item.title || "Untitled"}</div>
            <div className="text-sm text-muted-foreground">{item.date}</div>
            {item.description && <p className="mt-1 text-sm text-foreground">{item.description}</p>}
          </div>
        )}
      />
    </div>
  );

  type RepeatableProps<T extends { id: string }> = {
    title: string;
    items: T[];
    editing: boolean;
    emptyLabel: string;
    onAdd: () => void;
    onRemove: (id: string) => void;
    renderEdit: (item: T, update: (next: T) => void) => React.ReactNode;
    renderView: (item: T) => React.ReactNode;
  };

  function RepeatableSection<T extends { id: string }>({ title, items, editing, emptyLabel, onAdd, onRemove, renderEdit, renderView }: RepeatableProps<T>) {
    const update = (next: T) => {
      const updated = items.map((x) => (x.id === next.id ? next : x));
      // figure out which resume key by title — handled by parent via setResume in onAdd/onRemove.
      // Here we mutate via a generic patch: find a matching key in resume.
      const key = (Object.keys(resume) as (keyof Resume)[]).find((k) => Array.isArray(resume[k]) && (resume[k] as unknown[]) === items);
      if (key) setResume({ ...resume, [key]: updated } as Resume);
    };
    return (
      <Section
        title={title}
        action={editing ? (
          <button onClick={onAdd} className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium hover:bg-muted">
            <Plus className="h-3 w-3" /> Add
          </button>
        ) : null}
      >
        {items.length === 0 ? (
          <Empty label={emptyLabel} />
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border border-border p-3">
                {editing ? (
                  <div className="space-y-2">
                    {renderEdit(item, update)}
                    <div className="flex justify-end">
                      <button onClick={() => onRemove(item.id)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3 w-3" /> Remove
                      </button>
                    </div>
                  </div>
                ) : renderView(item)}
              </div>
            ))}
          </div>
        )}
      </Section>
    );
  }
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="glass-card rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="text-sm text-muted-foreground">{label}</div>;
}

function Tag({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary ring-1 ring-primary/20">
      {label}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 rounded-full hover:bg-primary/20">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
      />
    </div>
  );
}