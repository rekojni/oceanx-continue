// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import type { Tables } from "@/integrations/supabase/types";
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, it, expect } from "vitest";

let db: PGlite;
const adminId = randomUUID();
const learnerId = randomUUID();
const base = readFileSync(
  new URL("../../supabase/migrations/20261013000100_experiment.sql", import.meta.url),
  "utf8",
);
const upgrade = readFileSync(
  new URL(
    "../../supabase/migrations/20261013000200_atomic_steps_and_private_photos.sql",
    import.meta.url,
  ),
  "utf8",
);
beforeAll(async () => {
  db = new PGlite();
  // Supabase's surrounding schemas are emulated; experiment migrations run unchanged
  // on a real embedded PostgreSQL engine. No remote records are created.
  await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth; create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to authenticated, anon;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated;
  grant select on storage.objects, storage.buckets to anon, authenticated;
 `);
  await db.exec(base);
  await db.exec(upgrade);
  await db.query("insert into auth.users values ($1), ($2)", [adminId, learnerId]);
  await db.query("insert into public.user_roles (user_id, role) values ($1, 'admin')", [adminId]);
}, 30000);
afterAll(async () => {
  await db?.close();
});
async function create() {
  const id = randomUUID(),
    token = randomUUID();
  const out = await db.query<{ result: { group: "A" | "B" } }>(
    "select public.oceanx_create_session($1,$2,'TEST-FIXTURE',true) result",
    [id, token],
  );
  return { id, token, group: out.rows[0]!.result.group };
}
type Ref = Awaited<ReturnType<typeof create>>;
async function step(s: Ref, name: string, payload: object = {}) {
  return db.query("select public.oceanx_save_step($1,$2,$3,$4::jsonb)", [
    s.id,
    s.token,
    name,
    JSON.stringify(payload),
  ]);
}
async function row(s: Ref) {
  return (
    await db.query<Tables<"experiment_sessions">>(
      "select * from public.experiment_sessions where id=$1",
      [s.id],
    )
  ).rows[0]!;
}
async function journey(s: Ref, photo = false) {
  await step(s, "lesson_completed");
  await step(s, "interaction_completed", {
    answers: { bottle: "recycle", apple: "compost", crisps: "bin" },
  });
  if (s.group === "B")
    await step(s, "activity_completed", {
      observationText: "Isolated fixture observation",
      ...(photo ? { storagePath: `${s.id}/${randomUUID()}.jpg` } : {}),
    });
  await step(s, "quiz_completed", { answers: [1, 0, 1], meaningfulness: 4, parentHelp: 1 });
}
describe("PostgreSQL experiment and permissions", () => {
  it("balances fixed allocation and retries session creation without duplicates", async () => {
    const a = await create(),
      b = await create();
    expect(a.group).not.toBe(b.group);
    await db.query("select public.oceanx_create_session($1,$2,'RETRY',true)", [a.id, a.token]);
    const n = await db.query<{ n: number }>(
      "select count(*)::int n from public.experiment_sessions where id=$1",
      [a.id],
    );
    expect(n.rows[0]!.n).toBe(1);
    await expect(
      db.query("select public.oceanx_create_session($1,$2,'',true)", [a.id, randomUUID()]),
    ).rejects.toThrow("Session not found");
  });
  it("does not count quiz save or Continue click as actual module opening", async () => {
    const s = await create();
    await journey(s);
    expect((await row(s)).decision_reached_at).toBeNull();
    await expect(step(s, "continuation_chosen", { choice: "continue" })).rejects.toThrow();
    await step(s, "decision_viewed");
    await step(s, "continuation_chosen", { choice: "continue" });
    expect((await row(s)).classified_status).toBe("In Progress");
    expect((await row(s)).next_module_started_at).toBeNull();
    await step(s, "next_module_started");
    const first = await row(s);
    expect(first.classified_status).toBe("Continued");
    await step(s, "next_module_started");
    const retry = await row(s);
    expect(retry.next_module_started_at).toEqual(first.next_module_started_at);
    const n = await db.query<{ n: number }>(
      "select count(*)::int n from public.experiment_events where session_id=$1 and event_name='next_module_started'",
      [s.id],
    );
    expect(n.rows[0]!.n).toBe(1);
  });
  it("persists finish and refuses a direct next-module start or changed outcome", async () => {
    const s = await create();
    await expect(step(s, "next_module_started")).rejects.toThrow();
    await journey(s);
    await step(s, "decision_viewed");
    await step(s, "continuation_chosen", { choice: "finish" });
    await step(s, "continuation_chosen", { choice: "continue" });
    expect((await row(s)).classified_status).toBe("Finished");
    await expect(step(s, "next_module_started")).rejects.toThrow();
  });
  it("keeps A digital-only and saves B text/photo or skip atomically", async () => {
    const one = await create(),
      two = await create();
    const a = one.group === "A" ? one : two,
      b = one.group === "B" ? one : two;
    await journey(a);
    await expect(
      step(a, "activity_completed", { observationText: "Invalid for A" }),
    ).rejects.toThrow();
    await journey(b, true);
    const saved = await row(b);
    expect(saved.activity_status).toBe("completed");
    expect(saved.observation_text).toBe("Isolated fixture observation");
    expect(saved.comprehension_score).toBe(3);
    expect(saved.parent_help).toBe(1);
    const photo = await db.query<{ payload: Record<string, unknown> }>(
      "select payload from public.experiment_events where session_id=$1 and event_name='activity_photo_submitted'",
      [b.id],
    );
    expect(photo.rows).toHaveLength(1);
    expect(photo.rows[0]!.payload["storagePath"]).toBeDefined();
    expect(photo.rows[0]!.payload["photoDataUrl"]).toBeUndefined();
    const firstSkip = await create(),
      secondSkip = await create();
    const s = firstSkip.group === "B" ? firstSkip : secondSkip;
    {
      await step(s, "lesson_completed");
      await step(s, "interaction_completed", {
        answers: { bottle: "bin", apple: "bin", crisps: "bin" },
      });
      await step(s, "activity_skipped");
      expect((await row(s)).observation_text).toBeNull();
    }
  });
  it("rejects forged tokens and out-of-order steps with no partial event", async () => {
    const s = await create();
    await expect(step({ ...s, token: randomUUID() }, "lesson_completed")).rejects.toThrow(
      "Session not found",
    );
    await expect(
      step(s, "quiz_completed", { answers: [1, 0, 1], meaningfulness: 4, parentHelp: 0 }),
    ).rejects.toThrow();
    expect((await row(s)).quiz_completed_at).toBeNull();
  });
  it("restricts sessions, events, photos, RPCs and role grants to appropriate identities", async () => {
    await db.exec(
      "insert into storage.objects(bucket_id,name) values ('oceanx-evidence','test.jpg')",
    );
    try {
      await db.exec("set role anon");
      await expect(db.query("select id from public.experiment_sessions")).rejects.toThrow();
      await expect(db.query("select payload from public.experiment_events")).rejects.toThrow();
      expect((await db.query("select * from storage.objects")).rows).toHaveLength(0);
      await expect(
        db.query("select public.oceanx_save_step($1,$2,'lesson_completed','{}')", [
          randomUUID(),
          randomUUID(),
        ]),
      ).rejects.toThrow();
      await db.exec("reset role; set role authenticated");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [learnerId]);
      expect((await db.query("select id from public.experiment_sessions")).rows).toHaveLength(0);
      expect((await db.query("select * from storage.objects")).rows).toHaveLength(0);
      await expect(
        db.query("insert into public.user_roles(user_id,role) values ($1,'admin')", [learnerId]),
      ).rejects.toThrow();
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [adminId]);
      expect(
        (await db.query("select id from public.experiment_sessions")).rows.length,
      ).toBeGreaterThan(0);
      expect((await db.query("select * from storage.objects")).rows).toHaveLength(1);
      await expect(
        db.query("select session_token from public.experiment_sessions"),
      ).rejects.toThrow();
    } finally {
      await db.exec("reset role");
    }
  });
});
