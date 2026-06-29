import { createFileRoute, redirect } from "@tanstack/react-router";
import { MentorShell } from "@/components/mentor-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/mentor")({
  ssr: false,
  head: () => ({ meta: [{ title: "Mentor — MedMentor" }] }),
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/login" });
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile) throw redirect({ to: "/login" });
    if (profile.role !== "mentor") throw redirect({ to: "/dashboard" });
  },
  component: MentorShell,
});
