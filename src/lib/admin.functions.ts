import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const ADMIN_EMAIL = "admin@medmentor.uz";

export type AdminUserRow = {
  id: string;
  email: string | null;
  full_name: string;
  role: "student" | "mentor" | null;
  city: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  status: "Active" | "Inactive";
};

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUserRow[]> => {
    const callerEmail = (context.claims.email as string | undefined)?.toLowerCase();
    if (callerEmail !== ADMIN_EMAIL.toLowerCase()) {
      throw new Error("Forbidden: admin only");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Page through auth users (admin API caps at 1000/page)
    const authUsers: Array<{
      id: string;
      email?: string | null;
      created_at?: string;
      last_sign_in_at?: string | null;
    }> = [];
    let page = 1;
    // Hard cap to avoid runaway loops
    for (let i = 0; i < 20; i++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(error.message);
      authUsers.push(...(data?.users ?? []));
      if (!data?.users?.length || data.users.length < 1000) break;
      page += 1;
    }

    const { data: profiles, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, role, city, email");
    if (pErr) throw new Error(pErr.message);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p as {
        id: string;
        full_name: string;
        role: "student" | "mentor";
        city: string | null;
        email: string | null;
      }]),
    );

    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    return authUsers.map((u) => {
      const p = profileMap.get(u.id);
      const lastSeen = u.last_sign_in_at ?? null;
      const active = !!lastSeen && now - new Date(lastSeen).getTime() < THIRTY_DAYS;
      return {
        id: u.id,
        email: u.email ?? p?.email ?? null,
        full_name: p?.full_name ?? "—",
        role: p?.role ?? null,
        city: p?.city ?? null,
        created_at: u.created_at ?? "",
        last_sign_in_at: lastSeen,
        status: (active ? "Active" : "Inactive") as "Active" | "Inactive",
      };
    }).sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  });
