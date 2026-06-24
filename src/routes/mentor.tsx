import { createFileRoute } from "@tanstack/react-router";
import { MentorShell } from "@/components/mentor-shell";

export const Route = createFileRoute("/mentor")({
  head: () => ({ meta: [{ title: "Mentor — MedMentor" }] }),
  component: MentorShell,
});