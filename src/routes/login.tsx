import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in — MedMentor" }] }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (err) throw err;
      const user = data.user;
      if (!user) throw new Error("Login failed.");

      // Flush any profile stashed during a confirm-email signup
      let pendingRole: "student" | "mentor" | null = null;
      try {
        const key = `pendingProfile:${user.id}`;
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const pending = JSON.parse(raw) as { role: "student" | "mentor" } & Record<string, unknown>;
          const { data: existing } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
          if (!existing) {
            const { error: pErr } = await supabase.from("profiles").insert(pending);
            if (pErr) throw pErr;
          }
          pendingRole = pending.role;
          window.localStorage.removeItem(key);
        }
      } catch (flushErr) {
        console.warn("pending profile flush failed", flushErr);
      }

      const role = pendingRole
        ?? (await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()).data?.role;
      nav({ to: role === "mentor" ? "/mentor" : "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
      <div className="relative w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-semibold tracking-tight">MedMentor</span>
        </Link>
        <div className="glass-card rounded-2xl p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Log in to continue your mentorship journey.</p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <Field label="Email">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                className="w-full rounded-lg border border-border bg-input/40 px-3 py-2.5 text-sm outline-none ring-primary/40 focus:ring-2" />
            </Field>
            <Field label="Password">
              <input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••"
                className="w-full rounded-lg border border-border bg-input/40 px-3 py-2.5 text-sm outline-none ring-primary/40 focus:ring-2" />
            </Field>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button type="submit" disabled={busy}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:opacity-60">
              {busy ? "Logging in…" : "Log in"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" search={{ role: "student" }} className="text-primary hover:underline">Sign up as student</Link>
            {" · "}
            <Link to="/signup" search={{ role: "mentor" }} className="text-primary hover:underline">as mentor</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}