import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Stethoscope, GraduationCap, ArrowRight, Activity } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MedMentor — Connect. Shadow. Grow." },
      { name: "description", content: "Pair with real clinicians. Earn verified skills. Build your medical career." },
      { property: "og:title", content: "MedMentor — Connect. Shadow. Grow." },
      { property: "og:description", content: "Pair with real clinicians. Earn verified skills. Build your medical career." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-semibold tracking-tight">MedMentor</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Log in
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-24 text-center md:pt-32">
        <h1 className="mx-auto max-w-3xl text-5xl font-bold leading-tight tracking-tight md:text-6xl">
          Connect. <span className="text-primary">Shadow.</span> Grow.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
          Pair with real clinicians. Earn verified skills. Build your medical career.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/signup"
            search={{ role: "student" }}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 sm:w-auto"
          >
            <GraduationCap className="h-4 w-4" />
            I'm a Student
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/signup"
            search={{ role: "mentor" }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card/60 px-6 py-3 text-sm font-semibold text-foreground backdrop-blur transition hover:bg-card sm:w-auto"
          >
            <Stethoscope className="h-4 w-4 text-accent" />
            I'm a Mentor
          </Link>
        </div>
      </main>
    </div>
  );
}
