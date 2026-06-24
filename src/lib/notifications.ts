import { supabase } from "@/integrations/supabase/client";

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  related_id: string | null;
  read_at: string | null;
  created_at: string;
};

export async function createNotification(input: {
  user_id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  related_id?: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("notifications") as any).insert({
    user_id: input.user_id,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
    related_id: input.related_id ?? null,
  });
  if (error) console.warn("notification insert failed", error.message);
}