import { createServerFn } from "@tanstack/react-start";

const TEST_EMAIL = "admin@dmag.de";
const TEST_PASSWORD = "DmagTest!2026";

/**
 * Ensures the demo admin user exists and has the `admin` role.
 * Returns the credentials so the client can sign in normally.
 * This is a fixed seed account for previews — safe to be public.
 */
export const ensureTestAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Find existing user by email (paginated list — fine, demo project)
  const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) throw new Error(listErr.message);

  let user = list.users.find((u) => u.email?.toLowerCase() === TEST_EMAIL);

  if (!user) {
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Иван Иванов" },
    });
    if (createErr || !created.user) {
      throw new Error(createErr?.message ?? "Не удалось создать тестовый аккаунт");
    }
    user = created.user;
  } else {
    // Reset password to the known one + make sure email is confirmed
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: TEST_PASSWORD,
      email_confirm: true,
    });
  }

  // Force admin role (handle_new_user already does this for this email,
  // but be defensive in case the trigger was bypassed or the row was wiped).
  const { error: roleErr } = await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
  if (roleErr) throw new Error(roleErr.message);

  return { email: TEST_EMAIL, password: TEST_PASSWORD };
});
