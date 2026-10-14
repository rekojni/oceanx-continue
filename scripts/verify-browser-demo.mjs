import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
const server = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
});
const { data: sessions, error } = await server
  .from("experiment_sessions")
  .select(
    "id,participant_code,assigned_group,is_demo,activity_status,quiz_completed_at,decision_reached_at,continuation_choice,next_module_started_at,classified_status",
  )
  .in("participant_code", ["BROWSER-DEMO-1", "BROWSER-DEMO-2"]);
if (error) throw new Error(error.message);
if (sessions?.length !== 2) throw new Error("Expected two actual browser demonstrations");
const a = sessions.find((s) => s.assigned_group === "A"),
  b = sessions.find((s) => s.assigned_group === "B");
if (
  !a?.is_demo ||
  !b?.is_demo ||
  a.classified_status !== "Finished" ||
  a.next_module_started_at !== null ||
  b.classified_status !== "Continued" ||
  !b.next_module_started_at ||
  b.activity_status !== "completed"
)
  throw new Error("Unexpected saved browser outcomes");
const { data: photo, error: photoError } = await server
  .from("experiment_events")
  .select("payload")
  .eq("session_id", b.id)
  .eq("event_name", "activity_photo_submitted")
  .single();
if (photoError || !photo?.payload?.storagePath || photo.payload.photoDataUrl)
  throw new Error("Expected private Storage reference");
const path = photo.payload.storagePath;
const { data: image, error: downloadError } = await server.storage
  .from("oceanx-evidence")
  .download(path);
if (downloadError || !image?.size)
  throw new Error("Private evidence could not be downloaded by server");
const { error: anonError } = await anon.storage.from("oceanx-evidence").download(path);
if (!anonError) throw new Error("Anonymous private photo access was allowed");
const { data: publicImage, error: publicError } = await anon.storage
  .from("oceanx-evidence")
  .getPublicUrl(path);
const publicResponse = await fetch(publicImage.publicUrl);
if (publicResponse.ok) throw new Error("Private evidence accessible through public URL");
const { count, error: realError } = await server
  .from("experiment_sessions")
  .select("id", { count: "exact", head: true })
  .eq("is_demo", false);
if (realError) throw new Error(realError.message);
const report = {
  verifiedAt: new Date().toISOString(),
  browserDemoSessions: sessions.map(({ id, ...s }) => s),
  photo: { privateStorage: true, bytes: image.size, anonymousDenied: true, publicUrlDenied: true },
  actualParticipantRecords: count,
  notes: [
    "These are actual browser-created software demonstration sessions, not participant results.",
    "No camera hardware was exercised; a tiny PNG fixture verified the upload fallback.",
  ],
};
writeFileSync("artifacts/backend-verification.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
