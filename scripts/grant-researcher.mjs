// Run only after the project owner approves researcher access for this email.
import { createClient } from "@supabase/supabase-js";
const email = process.argv[2];
if (!email)
  throw new Error(
    "Usage: node --env-file=.env --env-file=.env.local scripts/grant-researcher.mjs EMAIL",
  );
const c = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
let user;
for (let page = 1; !user; page++) {
  const { data, error } = await c.auth.admin.listUsers({ page, perPage: 100 });
  if (error) throw new Error(error.message);
  user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (data.users.length < 100) break;
}
if (!user?.email_confirmed_at)
  throw new Error("No confirmed account found for that email. Register and confirm it first.");
const { error } = await c
  .from("user_roles")
  .upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
if (error) throw new Error(error.message);
console.log("Approved researcher role saved for the confirmed account.");
