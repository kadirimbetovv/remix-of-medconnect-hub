import { createServerFn } from "@tanstack/react-start";

const ADMIN_EMAIL = "admin@medmentor.uz";
const ADMIN_PASSWORD = "admin2024";

/**
 * Idempotently ensure the hardcoded admin account exists in auth.
 * Called from the login page so the admin can sign in even on a fresh project.
 */
export const ensureAdminUser = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Look for an existing user with this email (paginate just in case)
  let page = 1;
  for (let i = 0; i < 20; i++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const found = data?.users?.find((u) => (u.email ?? "").toLowerCase() === ADMIN_EMAIL);
    if (found) return { ok: true, created: false };
    if (!data?.users?.length || data.users.length < 1000) break;
    page += 1;
  }

  const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });
  if (createErr) throw new Error(createErr.message);

  return { ok: true, created: true };
});
