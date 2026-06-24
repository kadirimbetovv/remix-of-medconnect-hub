import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { Activity, Calendar, Home, LogOut, Search, User } from "lucide-react";
import { type ComponentType } from "react";
import { useProfile, signOut } from "@/hooks/use-profile";
import { ThemeToggle } from "@/components/theme-toggle";
import { InitialsAvatar } from "@/components/initials-avatar";
import { NotificationBell } from "@/components/notification-bell";

const NAV: { to: string; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/mentors", label: "Find Mentors", icon: Search },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/profile", label: "Profile", icon: User },
];

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile } = useProfile();
  const nav = useNavigate();
  const displayName = profile?.full_name ?? "Student";
  const displaySub = profile?.university ?? profile?.specialty ?? "—";

  const handleSignOut = async () => {
    await signOut();
    nav({ to: "/" });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <div className="flex h-16 items-center gap-2 px-5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold tracking-tight">MedMentor</span>
        </div>
        <nav className="mt-2 flex flex-col gap-1 px-3">
          {NAV.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-4">
          <div className="glass-card rounded-xl p-4">
            <div className="text-xs font-medium text-muted-foreground">Signed in as</div>
            <div className="mt-1 text-sm font-semibold">{displayName}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">{displaySub}</div>
            <button
              onClick={handleSignOut}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-transparent px-2 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
            >
              <LogOut className="h-3 w-3" /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/70 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold tracking-tight">MedMentor</span>
          </div>
          <div className="hidden md:block" />
          <div className="relative flex items-center gap-3">
            <ThemeToggle />
            <NotificationBell />
            <Link to="/profile" aria-label="Profile">
              <InitialsAvatar name={displayName} size="sm" />
            </Link>
          </div>
        </header>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-sidebar/90 backdrop-blur md:hidden">
          {NAV.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="min-w-0 flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}