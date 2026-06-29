import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LogOut, Search, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";
import { listAllUsers, ADMIN_EMAIL, type AdminUserRow } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — MedMentor" }] }),
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/login" });
    if ((user.email ?? "").toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      throw redirect({ to: "/" });
    }
  },
  component: AdminPage,
});

function AdminPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "mentor">("all");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await listAllUsers();
        if (!active) return;
        setRows(data);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load users");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (roleFilter !== "all" && r.role !== roleFilter) return false;
      if (!t) return true;
      return (
        r.full_name.toLowerCase().includes(t) ||
        (r.email ?? "").toLowerCase().includes(t) ||
        (r.city ?? "").toLowerCase().includes(t)
      );
    });
  }, [rows, q, roleFilter]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    nav({ to: "/" });
  };

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:px-8">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold tracking-tight">MedMentor Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">All Users</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {loading ? "Loading…" : `${filtered.length} of ${rows.length} users`}
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-3">
          <div className="glass-card flex flex-1 min-w-[240px] items-center gap-2 rounded-lg px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, or city"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            {(["all", "student", "mentor"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                  roleFilter === r
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >{r}</button>
            ))}
          </div>
        </div>

        <div className="glass-card overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">City / Region</th>
                  <th className="px-4 py-3">Signed up</th>
                  <th className="px-4 py-3">Last seen</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Loading users…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No users found.</td></tr>
                ) : filtered.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{u.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      {u.role ? (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ${
                          u.role === "mentor"
                            ? "bg-primary/15 text-primary ring-primary/30"
                            : "bg-accent text-accent-foreground ring-border"
                        }`}>{u.role}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.city ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmt(u.created_at)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmt(u.last_sign_in_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
                        u.status === "Active"
                          ? "bg-success/15 text-success ring-success/30"
                          : "bg-muted text-muted-foreground ring-border"
                      }`}>{u.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
