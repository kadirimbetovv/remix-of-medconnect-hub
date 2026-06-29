import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";

type Search = { role?: "student" | "mentor" };

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — MedMentor" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    role: s.role === "mentor" ? "mentor" : "student",
  }),
  component: SignupPage,
});

const SPECIALTIES = ["Cardiology", "Surgery", "Pediatrics", "Emergency Medicine", "General Practice", "Internal Medicine", "Neurology", "Obstetrics & Gynecology"];

const REGIONS = [
  "Tashkent City", "Tashkent Region", "Andijan Region", "Bukhara Region",
  "Fergana Region", "Jizzakh Region", "Namangan Region", "Navoiy Region",
  "Qashqadaryo Region", "Samarkand Region", "Sirdaryo Region", "Surxondaryo Region",
  "Xorazm Region", "Republic of Karakalpakstan",
];

const LANGUAGE_OPTIONS = ["Uzbek", "Karakalpak", "Russian", "English"];

function SignupPage() {
  const nav = useNavigate();
  const search = useSearch({ from: "/signup" });
  const [role, setRole] = useState<"student" | "mentor">(search.role ?? "student");
  const [form, setForm] = useState({
    name: "", email: "", password: "",
    university: "", year: "1", specialty: SPECIALTIES[0], city: REGIONS[0],
    hospital: "", years_experience: "1", license_number: "", languages: "",
  });
  const [langs, setLangs] = useState<string[]>([]);
  const [otherLang, setOtherLang] = useState("");
  const [otherChecked, setOtherChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState<string | null>(null);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const toggleLang = (l: string) => {
    setLangs((prev) => prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const allLangs = [...langs];
      if (otherChecked && otherLang.trim()) allLangs.push(otherLang.trim());
      const { data, error: signErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (signErr) throw signErr;
      const user = data.user;
      if (!user) throw new Error("Sign up failed.");
      const profile = {
        id: user.id,
        role,
        full_name: form.name,
        email: form.email,
        city: form.city,
        specialty: form.specialty,
        university: role === "student" ? form.university : null,
        year_of_study: role === "student" ? Number(form.year) || null : null,
        languages: role === "student" ? allLangs.join(", ") : null,
        hospital: role === "mentor" ? form.hospital : null,
        years_experience: role === "mentor" ? Number(form.years_experience) || null : null,
        license_number: role === "mentor" ? form.license_number : null,
      };

      // If email confirmation is enabled, there is no session yet — RLS would
      // reject the profile insert. Stash the profile locally; the login page
      // will flush it after the user confirms and signs in.
      if (!data.session) {
        try {
          window.localStorage.setItem(`pendingProfile:${user.id}`, JSON.stringify(profile));
        } catch { /* ignore quota errors */ }
        setCheckEmail(form.email);
        setBusy(false);
        return;
      }

      const { error: pErr } = await supabase.from("profiles").insert(profile);
      if (pErr) throw pErr;
      nav({ to: role === "mentor" ? "/mentor" : "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (checkEmail) {
    return (
      <div className="relative min-h-screen bg-background px-4 py-12 text-foreground">
        <div className="absolute right-4 top-4"><ThemeToggle /></div>
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
        <div className="relative mx-auto w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center justify-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-semibold tracking-tight">MedMentor</span>
          </Link>
          <div className="glass-card rounded-2xl p-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              We've sent a confirmation link to <span className="font-medium text-foreground">{checkEmail}</span>.
              Click it to verify your account, then log in to finish setting up your profile.
            </p>
            <Link to="/login" className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              Go to log in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background px-4 py-12 text-foreground">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
      <div className="relative mx-auto w-full max-w-xl">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-semibold tracking-tight">MedMentor</span>
        </Link>

        <div className="glass-card rounded-2xl p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign up as a student or mentor.</p>

          <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg border border-border bg-input/30 p-1">
            {(["student", "mentor"] as const).map((r) => (
              <button
                key={r} type="button" onClick={() => setRole(r)}
                className={`rounded-md px-3 py-2 text-sm font-medium capitalize transition ${
                  role === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >{r}</button>
            ))}
          </div>

          <form className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
            <Field label="Full name" className="sm:col-span-2">
              <Input value={form.name} onChange={(v) => set("name", v)} placeholder="Dr. Bobur Yusupov" />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(v) => set("email", v)} placeholder="you@hospital.uz" />
            </Field>
            <Field label="Password">
              <Input type="password" value={form.password} onChange={(v) => set("password", v)} placeholder="••••••••" />
            </Field>
            <Field label="Specialty">
              <Select value={form.specialty} onChange={(v) => set("specialty", v)}>
                {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="City">
              <Select value={form.city} onChange={(v) => set("city", v)}>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            </Field>

            {role === "student" ? (
              <>
                <Field label="University" className="sm:col-span-2">
                  <Input value={form.university} onChange={(v) => set("university", v)} placeholder="Tashkent Medical Academy" />
                </Field>
                <Field label="Year of study">
                  <Select value={form.year} onChange={(v) => set("year", v)}>
                    {["1","2","3","4","5","6"].map((y) => <option key={y} value={y}>Year {y}</option>)}
                  </Select>
                </Field>
                <Field label="Languages spoken" className="sm:col-span-2">
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGE_OPTIONS.map((l) => (
                      <label key={l} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition ${langs.includes(l) ? "border-primary bg-primary/15 text-primary" : "border-border bg-input/40 text-muted-foreground hover:text-foreground"}`}>
                        <input type="checkbox" checked={langs.includes(l)} onChange={() => toggleLang(l)} className="h-3 w-3 accent-primary" />
                        {l}
                      </label>
                    ))}
                    <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition ${otherChecked ? "border-primary bg-primary/15 text-primary" : "border-border bg-input/40 text-muted-foreground hover:text-foreground"}`}>
                      <input type="checkbox" checked={otherChecked} onChange={(e) => setOtherChecked(e.target.checked)} className="h-3 w-3 accent-primary" />
                      Other
                    </label>
                  </div>
                  {otherChecked && (
                    <input
                      value={otherLang}
                      onChange={(e) => setOtherLang(e.target.value)}
                      placeholder="Specify other language"
                      className="mt-2 w-full rounded-lg border border-border bg-input/40 px-3 py-2.5 text-sm outline-none ring-primary/40 focus:ring-2"
                    />
                  )}
                </Field>
              </>
            ) : (
              <>
                <Field label="Hospital" className="sm:col-span-2">
                  <Input value={form.hospital} onChange={(v) => set("hospital", v)} placeholder="Republican Clinical Hospital" />
                </Field>
                <Field label="Years of experience">
                  <Input type="number" value={form.years_experience} onChange={(v) => set("years_experience", v)} placeholder="10" />
                </Field>
                <Field label="Medical license number">
                  <Input value={form.license_number} onChange={(v) => set("license_number", v)} placeholder="UZ-MED-12345" />
                </Field>
              </>
            )}

            {error && <p className="sm:col-span-2 text-sm text-destructive">{error}</p>}

            <button
              type="submit" disabled={busy}
              className="sm:col-span-2 mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:opacity-60"
            >{busy ? "Creating…" : `Create ${role} account`}</button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Already have an account? <Link to="/login" className="text-primary hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
function Input({ value, onChange, type = "text", placeholder }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <input type={type} required value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-border bg-input/40 px-3 py-2.5 text-sm outline-none ring-primary/40 focus:ring-2" />
  );
}
function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-border bg-input/40 px-3 py-2.5 text-sm outline-none ring-primary/40 focus:ring-2">
      {children}
    </select>
  );
}