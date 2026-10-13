import { createClient } from "@supabase/supabase-js";
const url = process.env.SUPABASE_URL;
const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serverKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publicKey || !serverKey)
  throw new Error("Missing backend configuration in .env.local");
const admin = createClient(url, serverKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anonymous = createClient(url, publicKey, { auth: { persistSession: false } });
const { error } = await admin.from("experiment_sessions").select("id").limit(1);
if (error) throw new Error("Server connection/schema check failed: " + error.message);
for (const table of ["experiment_sessions", "experiment_events", "user_roles"]) {
  const { data, error } = await anonymous.from(table).select("*").limit(1);
  if (!error && data?.length) throw new Error("Anonymous data exposure: " + table);
  console.log(table + ": anonymous read blocked or empty");
}
console.log("Server database connection verified; no rows created or changed.");
