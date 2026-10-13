import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
const c = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const { data: rows, error } = await c
  .from("experiment_sessions")
  .select(
    "id,participant_code,assigned_group,is_demo,activity_status,quiz_completed_at,decision_reached_at,continuation_choice,next_module_started_at,classified_status",
  )
  .eq("participant_code", "PHONE-DEMO");
if (error) throw new Error(error.message);
const { data: photos, error: photoError } = await c
  .from("experiment_events")
  .select("session_id")
  .eq("event_name", "activity_photo_submitted")
  .in(
    "session_id",
    (rows ?? []).map((s) => s.id),
  );
if (photoError) throw new Error(photoError.message);
const b = rows?.find((s) => s.assigned_group === "B" && s.classified_status === "Continued");
if (
  !b?.is_demo ||
  !b.activity_status ||
  !b.next_module_started_at ||
  b.continuation_choice !== "continue" ||
  !photos?.some((p) => p.session_id === b.id)
)
  throw new Error("Phone camera/continuation record is not yet complete");
const report = {
  verifiedAt: new Date().toISOString(),
  deviceCheck:
    "User confirmed iPhone Safari link, camera, preview, save, next module and saved-start confirmation",
  databaseVerified: true,
  records: (rows ?? []).map(({ id, ...s }) => ({
    ...s,
    hasPhoto: photos.some((x) => x.session_id === id),
  })),
};
writeFileSync("artifacts/phone-verification.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
