import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Pencil, Save, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-profile";
import { useMyRequests, useMySessions } from "@/lib/data-hooks";
import { InitialsAvatar } from "@/components/initials-avatar";
import { supabase } from "@/integrations/supabase/client";
import {
  DAYS,
  BLOCKS_PER_DAY,
  blockIndexToTime,
  emptyBlocks,
  readBlocks,
  type BlocksAvailability,
  type Day,
} from "@/lib/availability";

export const Route = createFileRoute("/mentor/profile")({
  head: () => ({ meta: [{ title: "Profile — MedMentor" }] }),
  component: ProfilePage,
});

type MentorResume = {
  avatar_url?: string;
  requirements?: string;
  requires_interview?: boolean;
  availability_blocks?: BlocksAvailability;
  availability?: unknown; // legacy preserved on round-trip
};

function mergeMentorResume(input: unknown): MentorResume {
  const r = (input ?? {}) as Partial<MentorResume>;
  return {
    avatar_url: r.avatar_url ?? "",
    requirements: r.requirements ?? "",
    requires_interview: r.requires_interview ?? false,
    availability_blocks: readBlocks(input),
    availability: r.availability,
  };
}

function ProfilePage() {
  const { profile, loading, reload } = useProfile();
  const { sessions } = useMySessions(profile?.id, profile?.role);
  const { requests } = useMyRequests(profile?.id, profile?.role);
  const [editing, setEditing] = useState(false);
  const [editingReq, setEditingReq] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<MentorResume>(mergeMentorResume(null));
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (profile) {
      setData(mergeMentorResume(profile.resume));
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  if (loading) return <div className="mx-auto max-w-4xl p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!profile) return <div className="mx-auto max-w-4xl p-6 text-sm text-muted-foreground">No profile.</div>;

  const accepted = requests.filter((r) => r.status === "accepted").length;

  const onPickAvatar = (file: File | null) => {
    if (!file) return;
    if (file.size > 500_000) { toast.error("Image too large (max 500KB)."); return; }
    const reader = new FileReader();
    reader.onload = () => setData((d) => ({ ...d, avatar_url: String(reader.result || "") }));
    reader.readAsDataURL(file);
  };

  const persist = async (next: MentorResume, successMsg?: string) => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ resume: next as unknown as never })
      .eq("id", profile.id);
    setSaving(false);
    if (error) { toast.error(error.message); return false; }
    if (successMsg) toast.success(successMsg);
    reload();
    return true;
  };

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ resume: data as unknown as never, phone: phone || null })
      .eq("id", profile.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved");
    reload();
    const ok = true;
    if (ok) setEditing(false);
  };

  const cancel = () => {
    setData(mergeMentorResume(profile.resume));
    setPhone(profile.phone ?? "");
    setEditing(false);
  };

  const blocks = data.availability_blocks ?? emptyBlocks();

  const updateBlocks = async (next: BlocksAvailability) => {
    const nextData = { ...data, availability_blocks: next };
    setData(nextData);
    await persist(nextData);
  };

  const saveRequirements = async (requirements: string, requires_interview: boolean) => {
    const next = { ...data, requirements, requires_interview };
    const ok = await persist(next, "Requirements updated");
    if (ok) setEditingReq(false);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <button onClick={cancel} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted">
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
              <button onClick={saveProfile} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
                <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90">
              <Pencil className="h-3.5 w-3.5" /> Edit Profile
            </button>
          )}
        </div>
      </header>

      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div>
            <InitialsAvatar name={profile.full_name} size="xl" src={data.avatar_url || null} />
            {editing && (
              <div className="mt-2 flex flex-col items-start gap-1">
                <label className="cursor-pointer rounded-md border border-border bg-card px-2 py-1 text-[10px] font-medium hover:bg-muted">
                  Upload
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickAvatar(e.target.files?.[0] ?? null)} />
                </label>
                {data.avatar_url && (
                  <button type="button" onClick={() => setData({ ...data, avatar_url: "" })} className="text-[10px] text-destructive hover:underline">
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{profile.full_name}</h2>
              {profile.license_number && (
                <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                  <BadgeCheck className="h-3.5 w-3.5" /> Licensed
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {profile.specialty && (
                <span className="rounded-md border border-border px-2 py-0.5 text-foreground">{profile.specialty}</span>
              )}
              {profile.hospital && <span>{profile.hospital}</span>}
              {profile.city && <><span>·</span><span>{profile.city}</span></>}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Students" value={accepted} />
          <Stat label="Sessions" value={sessions.length} />
          <Stat label="Rating" value={0} />
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-border bg-card p-6">
        <h3 className="text-base font-semibold tracking-tight">Contact</h3>
        <p className="mt-1 text-xs text-muted-foreground">Shared with students once a mentorship is active.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-[11px] text-muted-foreground">Email</div>
            <input
              value={profile.email ?? ""}
              readOnly
              className="mt-0.5 w-full cursor-not-allowed rounded-md border border-border bg-muted/40 px-2 py-1.5 text-sm text-muted-foreground"
            />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Phone Number</div>
            {editing ? (
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
            ) : (
              <div className="mt-0.5 rounded-md border border-border bg-background px-2 py-1.5 text-sm">
                {profile.phone || <span className="text-muted-foreground">Not added</span>}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-3 rounded-lg border border-border bg-card p-6 sm:grid-cols-2">
        <Row label="Years of experience" value={profile.years_experience != null ? `${profile.years_experience} years` : "—"} />
        <Row label="Medical license" value={profile.license_number ?? "—"} />
        <Row label="Hospital" value={profile.hospital ?? "—"} />
        <Row label="City" value={profile.city ?? "—"} />
      </section>

      <section className="mt-6 rounded-lg border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold tracking-tight">Requirements</h3>
            <p className="mt-1 text-xs text-muted-foreground">Shown to students before they send a request.</p>
          </div>
          <button onClick={() => setEditingReq(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium hover:bg-muted">
            <Pencil className="h-3 w-3" /> Edit
          </button>
        </div>
        {data.requirements ? (
          <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{data.requirements}</p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No specific requirements set.</p>
        )}
        <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs">
          <span className={`h-2 w-2 rounded-full ${data.requires_interview ? "bg-primary" : "bg-muted-foreground/40"}`} />
          {data.requires_interview ? "Interview required before acceptance" : "No interview required"}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-border bg-card p-6">
        <div>
          <h3 className="text-base font-semibold tracking-tight">Weekly availability</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Click or drag across blocks to toggle. Green = available, gray = busy. Repeats every week.
          </p>
        </div>
        <AvailabilityGrid blocks={blocks} onChange={updateBlocks} />
        {saving && <div className="mt-2 text-[10px] text-muted-foreground">Saving…</div>}
      </section>

      {editingReq && (
        <RequirementsModal
          initialText={data.requirements ?? ""}
          initialToggle={!!data.requires_interview}
          onClose={() => setEditingReq(false)}
          onSave={saveRequirements}
          saving={saving}
        />
      )}
    </div>
  );
}

function RequirementsModal({
  initialText, initialToggle, onClose, onSave, saving,
}: {
  initialText: string;
  initialToggle: boolean;
  onClose: () => void;
  onSave: (text: string, toggle: boolean) => void;
  saving: boolean;
}) {
  const [text, setText] = useState(initialText);
  const [toggle, setToggle] = useState(initialToggle);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <button aria-label="Close" className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Edit Requirements</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Update what students should know or do before requesting mentorship.</p>
        <label className="mt-4 block text-xs font-medium">Requirements (free text)</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="e.g. Please submit a short motivational letter."
          className="mt-1.5 w-full rounded-md border border-border bg-background p-3 text-sm"
        />
        <label className="mt-4 flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
          <input
            type="checkbox"
            checked={toggle}
            onChange={(e) => setToggle(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary"
          />
          <span>
            <span className="font-medium">Require a 10-minute interview</span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              When on, students must pick an open slot from your weekly availability before you receive their request.
            </span>
          </span>
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={() => onSave(text, toggle)}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save Requirements"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AvailabilityGrid({
  blocks, onChange,
}: {
  blocks: BlocksAvailability;
  onChange: (next: BlocksAvailability) => void;
}) {
  const painting = useRef<{ value: boolean } | null>(null);
  const pendingRef = useRef<BlocksAvailability>(blocks);
  const [local, setLocal] = useState<BlocksAvailability>(blocks);

  // Sync external prop into local when not actively painting
  useEffect(() => {
    if (!painting.current) {
      pendingRef.current = blocks;
      setLocal(blocks);
    }
  }, [blocks]);

  const commit = useCallback(() => {
    if (painting.current) {
      painting.current = null;
      onChange(pendingRef.current);
    }
  }, [onChange]);

  useEffect(() => {
    window.addEventListener("mouseup", commit);
    window.addEventListener("touchend", commit);
    return () => {
      window.removeEventListener("mouseup", commit);
      window.removeEventListener("touchend", commit);
    };
  }, [commit]);

  const setCell = (day: Day, idx: number, val: boolean) => {
    const cur = pendingRef.current;
    if (cur[day][idx] === val) return;
    const nextDay = cur[day].slice();
    nextDay[idx] = val;
    const next = { ...cur, [day]: nextDay };
    pendingRef.current = next;
    setLocal(next);
  };

  const start = (day: Day, idx: number) => {
    const newVal = !local[day][idx];
    painting.current = { value: newVal };
    setCell(day, idx, newVal);
  };
  const enter = (day: Day, idx: number) => {
    if (!painting.current) return;
    setCell(day, idx, painting.current.value);
  };

  return (
    <div className="mt-4">
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[700px]">
          <div className="ml-12 grid select-none" style={{ gridTemplateColumns: `repeat(24, minmax(0, 1fr))` }}>
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="text-center text-[9px] text-muted-foreground">
                {String(h).padStart(2, "0")}
              </div>
            ))}
          </div>
          <div className="mt-1 space-y-1">
            {DAYS.map((d) => (
              <div key={d} className="flex items-center gap-2">
                <div className="w-10 shrink-0 text-xs font-medium">{d}</div>
                <div
                  className="grid flex-1 select-none overflow-hidden rounded-md border border-border"
                  style={{ gridTemplateColumns: `repeat(${BLOCKS_PER_DAY}, minmax(0, 1fr))` }}
                >
                  {local[d].map((avail, i) => (
                    <button
                      key={i}
                      type="button"
                      title={`${d} ${blockIndexToTime(i)} — ${avail ? "Available" : "Busy"}`}
                      onMouseDown={(e) => { e.preventDefault(); start(d, i); }}
                      onMouseEnter={() => enter(d, i)}
                      onTouchStart={(e) => { e.preventDefault(); start(d, i); }}
                      className={`h-6 border-r border-border/40 transition ${
                        avail ? "bg-success/70 hover:bg-success" : "bg-muted hover:bg-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-success/70" /> Available</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-muted" /> Busy</span>
        <span>· 30-min blocks · click or drag to toggle</span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
      <div className="text-lg font-semibold text-primary">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}