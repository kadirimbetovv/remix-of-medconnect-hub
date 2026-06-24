import { Bell } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useProfile } from "@/hooks/use-profile";
import { useNotifications } from "@/hooks/use-notifications";

export function NotificationBell() {
  const { profile } = useProfile();
  const { items, unread, markAllRead, markRead } = useNotifications(profile?.id);
  const [open, setOpen] = useState(false);

  const toggle = () => {
    setOpen((o) => {
      const next = !o;
      if (next) markAllRead();
      return next;
    });
  };

  return (
    <div className="relative">
      <button
        aria-label="Notifications"
        onClick={toggle}
        className="relative grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-30 w-80 overflow-hidden rounded-lg border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="text-xs font-semibold">Notifications</div>
            <button onClick={() => setOpen(false)} className="text-[11px] text-muted-foreground hover:text-foreground">Close</button>
          </div>
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</div>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((n) => {
                const Inner = (
                  <div className={`flex gap-2 px-3 py-2.5 text-left ${!n.read_at ? "bg-primary/5" : ""}`}>
                    {!n.read_at && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{n.title}</div>
                      {n.body && <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</div>}
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id} className="border-t border-border first:border-t-0">
                    {n.link ? (
                      <Link to={n.link} onClick={() => { markRead(n.id); setOpen(false); }} className="block hover:bg-muted">
                        {Inner}
                      </Link>
                    ) : (
                      <button onClick={() => markRead(n.id)} className="block w-full hover:bg-muted">{Inner}</button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}