import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { Calendar, Home, LogOut, User, Users } from "lucide-react";
import { type ComponentType } from "react";
import { useProfile, signOut } from "@/hooks/use-profile";
import { ThemeToggle } from "@/components/theme-toggle";
import { InitialsAvatar } from "@/components/initials-avatar";
import { NotificationBell } from "@/components/notification-bell";

const NAV: { to: string; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { to: "/mentor", label: "Home", icon: Home },
  { to: "/mentor/students", label: "My Students", icon: Users },
  { to: "/mentor/calendar", label: "Calendar", icon: Calendar },
  { to: "/mentor/profile", label: "Profile", icon: User },
];

export function MentorShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile } = useProfile();
  const nav = useNavigate();
  const displayName = profile?.full_name ?? "Mentor";
  const displaySpec = profile?.specialty ?? "—";

  const handleSignOut = async () => {
    await signOut();
    nav({ to: "/" });
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <div className="flex h-16 items-center gap-2 px-5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">M</div>
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
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto p-4">
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <InitialsAvatar name={displayName} size="sm" />
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold">{displayName}</div>
                <div className="truncate text-[11px] text-muted-foreground">{displaySpec}</div>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
            >
              <LogOut className="h-3 w-3" /> Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-end gap-3 border-b border-border bg-background px-4 md:px-10">
          <ThemeToggle />
          <NotificationBell />
        </header>

        <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-card md:hidden">
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

        <main className="min-w-0 flex-1 px-4 pb-24 pt-6 md:px-10 md:pb-10 md:pt-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}