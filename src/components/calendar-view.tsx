import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, startOfDay, startOfMonth, startOfWeek, subMonths, subWeeks,
} from "date-fns";

export type CalendarEvent = {
  id: string;
  title: string;
  at: string;
  durationMinutes?: number;
  location?: string | null;
  meta?: string;
};

export function CalendarView({ events, onEventClick }: { events: CalendarEvent[]; onEventClick?: (e: CalendarEvent) => void }) {
  const [mode, setMode] = useState<"month" | "week">("month");
  const [anchor, setAnchor] = useState<Date>(new Date());

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = format(startOfDay(new Date(e.at)), "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => +new Date(a.at) - +new Date(b.at));
    return map;
  }, [events]);

  const days = useMemo(() => {
    if (mode === "week") {
      const start = startOfWeek(anchor, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
    const arr: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) arr.push(d);
    return arr;
  }, [anchor, mode]);

  const label = mode === "month"
    ? format(anchor, "MMMM yyyy")
    : `${format(startOfWeek(anchor, { weekStartsOn: 1 }), "MMM d")} – ${format(endOfWeek(anchor, { weekStartsOn: 1 }), "MMM d, yyyy")}`;

  const go = (delta: 1 | -1) => {
    setAnchor((d) => mode === "month" ? (delta > 0 ? addMonths(d, 1) : subMonths(d, 1)) : (delta > 0 ? addWeeks(d, 1) : subWeeks(d, 1)));
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border p-3">
        <div className="flex items-center gap-1">
          <button onClick={() => go(-1)} className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => setAnchor(new Date())} className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted">Today</button>
          <button onClick={() => go(1)} className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"><ChevronRight className="h-4 w-4" /></button>
          <div className="ml-2 text-sm font-semibold">{label}</div>
        </div>
        <div className="inline-flex overflow-hidden rounded-md border border-border text-xs">
          <button onClick={() => setMode("month")} className={`px-3 py-1 ${mode === "month" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>Month</button>
          <button onClick={() => setMode("week")} className={`px-3 py-1 ${mode === "week" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>Week</button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-border bg-muted/30 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>

      <div className={`grid grid-cols-7 ${mode === "week" ? "min-h-[420px]" : ""}`}>
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const list = eventsByDay.get(key) ?? [];
          const muted = mode === "month" && !isSameMonth(d, anchor);
          const today = isSameDay(d, new Date());
          return (
            <div key={key} className={`min-h-[96px] border-b border-r border-border p-1.5 ${muted ? "bg-muted/20" : ""}`}>
              <div className={`mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${today ? "bg-primary text-primary-foreground font-semibold" : muted ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
                {format(d, "d")}
              </div>
              <div className="space-y-1">
                {list.slice(0, 4).map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onEventClick?.(e)}
                    title={`${e.title} — ${format(new Date(e.at), "p")}`}
                    className="block w-full truncate rounded-md bg-primary/15 px-1.5 py-0.5 text-left text-[11px] font-medium text-primary ring-1 ring-primary/20 hover:bg-primary/25"
                  >
                    {format(new Date(e.at), "HH:mm")} {e.title}
                  </button>
                ))}
                {list.length > 4 && (
                  <div className="px-1.5 text-[10px] text-muted-foreground">+{list.length - 4} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}