import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const sessionRef = z.object({
  sessionId: z.string().uuid(),
  token: z.string().uuid(),
});

// ---------- Learner-facing (anonymous, token-scoped) ----------

export const createSession = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ participantCode: z.string().max(40).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { createExperimentSession } = await import("./experiment.server");
    return createExperimentSession(data.participantCode);
  });

export const getSessionState = createServerFn({ method: "POST" })
  .inputValidator((d) => sessionRef.parse(d))
  .handler(async ({ data }) => {
    const { getSessionForToken } = await import("./experiment.server");
    const s = await getSessionForToken(data.sessionId, data.token);
    return {
      id: s.id,
      group: s.assigned_group as "A" | "B",
      lessonCompletedAt: s.lesson_completed_at,
      interactionCompletedAt: s.interaction_completed_at,
      interactionAnswers: (s.interaction_answers as Record<string, string> | null) ?? null,
      activityStatus: s.activity_status as "completed" | "skipped" | null,
      quizCompletedAt: s.quiz_completed_at,
      continuationChoice: s.continuation_choice as "continue" | "finish" | null,
      classifiedStatus: s.classified_status,
    };
  });

export const markLessonComplete = createServerFn({ method: "POST" })
  .inputValidator((d) => sessionRef.parse(d))
  .handler(async ({ data }) => {
    const { updateSession } = await import("./experiment.server");
    await updateSession(
      data.sessionId,
      data.token,
      { lesson_completed_at: new Date().toISOString() },
      "lesson_completed",
    );
    return { ok: true };
  });

export const saveInteraction = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    sessionRef.extend({ answers: z.record(z.string(), z.string()) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { updateSession } = await import("./experiment.server");
    await updateSession(
      data.sessionId,
      data.token,
      {
        interaction_completed_at: new Date().toISOString(),
        interaction_answers: data.answers,
      },
      "interaction_completed",
      { answers: data.answers },
    );
    return { ok: true };
  });

export const saveActivity = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    sessionRef
      .extend({
        status: z.enum(["completed", "skipped"]),
        observationText: z.string().max(500).optional(),
        photoDataUrl: z.string().max(400_000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { getSessionForToken, updateSession } = await import("./experiment.server");
    const session = await getSessionForToken(data.sessionId, data.token);
    if (session.assigned_group !== "B") {
      throw new Error("This session does not include the home activity");
    }
    if (data.photoDataUrl && data.status !== "completed") throw new Error("Only completed activities accept photos");
    if (data.photoDataUrl) {
      if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(data.photoDataUrl)) throw new Error("Only JPEG photos are accepted");
      const image = Buffer.from(data.photoDataUrl.split(",")[1] ?? "", "base64");
      if (image.byteLength > 300_000 || image[0] !== 0xff || image[1] !== 0xd8 || image[2] !== 0xff) {
        throw new Error("Please use a smaller valid JPEG photograph");
      }
    }
    await updateSession(
      data.sessionId,
      data.token,
      {
        activity_status: data.status,
        activity_completed_at: new Date().toISOString(),
        observation_text:
          data.status === "completed" && data.observationText?.trim()
            ? data.observationText.trim()
            : null,
      },
      `activity_${data.status}`,
    );
    if (data.photoDataUrl) {
      const { logEvent } = await import("./experiment.server");
      await logEvent(session.id, "activity_photo_submitted", { photoDataUrl: data.photoDataUrl });
    }
    return { ok: true };
  });

export const saveQuiz = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    sessionRef
      .extend({
        answers: z.array(z.number().int().min(0).max(2)).length(3),
        meaningfulness: z.number().int().min(1).max(5),
        parentHelp: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { getSessionForToken, updateSession, scoreQuiz } = await import(
      "./experiment.server"
    );
    const session = await getSessionForToken(data.sessionId, data.token);
    const score = scoreQuiz(data.answers);
    await updateSession(
      data.sessionId,
      data.token,
      {
        quiz_completed_at: new Date().toISOString(),
        quiz_answers: data.answers,
        comprehension_score: score,
        meaningfulness: data.meaningfulness,
        decision_reached_at: new Date().toISOString(),
        parent_help: session.assigned_group === "B" ? (data.parentHelp ?? null) : null,
      },
      "quiz_completed",
      { score, meaningfulness: data.meaningfulness },
    );
    return { ok: true, score };
  });

export const chooseContinuation = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    sessionRef.extend({ choice: z.enum(["continue", "finish"]) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { updateSession } = await import("./experiment.server");
    await updateSession(
      data.sessionId,
      data.token,
      { continuation_choice: data.choice },
      "continuation_chosen",
      { choice: data.choice },
    );
    return { ok: true };
  });

export const markNextModuleViewed = createServerFn({ method: "POST" })
  .inputValidator((d) => sessionRef.parse(d))
  .handler(async ({ data }) => {
    const { getSessionForToken, updateSession, logEvent } = await import(
      "./experiment.server"
    );
    const session = await getSessionForToken(data.sessionId, data.token);
    if (session.continuation_choice !== "continue") {
      return { ok: false };
    }
    if (!session.next_module_started_at) {
      await updateSession(
        data.sessionId,
        data.token,
        { next_module_started_at: new Date().toISOString() },
        "next_module_started",
      );
    } else {
      await logEvent(session.id, "next_module_viewed");
    }
    return { ok: true };
  });

// ---------- Researcher-facing (authenticated admin only) ----------

async function assertAdmin(supabase: import("@supabase/supabase-js").SupabaseClient<import("@/integrations/supabase/types").Database>, userId: string) {
  const { data } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden");
}

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: !!data };
  });

export const getResearchData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: sessions, error } = await context.supabase
      .from("experiment_sessions")
      .select(
        "id, participant_code, assigned_group, is_demo, started_at, lesson_completed_at, interaction_completed_at, activity_status, activity_completed_at, observation_text, parent_help, quiz_completed_at, comprehension_score, comprehension_total, meaningfulness, decision_reached_at, continuation_choice, next_module_started_at, classified_status, created_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error("Could not load research data");
    const { data: photoEvents, error: photoError } = await context.supabase
      .from("experiment_events")
      .select("session_id, created_at")
      .eq("event_name", "activity_photo_submitted");
    if (photoError) throw new Error("Could not load artefact metadata");
    return { sessions: sessions ?? [], photoSessionIds: [...new Set((photoEvents ?? []).map((e) => e.session_id))] };
  });

export const seedDemoSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const now = Date.now();
    const iso = (minsAgo: number) => new Date(now - minsAgo * 60_000).toISOString();

    const demoRows = [
      {
        participant_code: "DEMO-1",
        assigned_group: "A",
        is_demo: true,
        started_at: iso(200),
        lesson_completed_at: iso(195),
        interaction_completed_at: iso(190),
        interaction_answers: { bottle: "recycle", apple: "compost", crisps: "bin" },
        quiz_completed_at: iso(180),
        quiz_answers: [1, 0, 1],
        comprehension_score: 3,
        meaningfulness: 4,
        decision_reached_at: iso(178),
        continuation_choice: "continue",
        next_module_started_at: iso(178),
      },
      {
        participant_code: "DEMO-2",
        assigned_group: "A",
        is_demo: true,
        started_at: iso(160),
        lesson_completed_at: iso(155),
        interaction_completed_at: iso(150),
        interaction_answers: { bottle: "recycle", apple: "bin", crisps: "bin" },
        quiz_completed_at: iso(140),
        quiz_answers: [1, 0, 0],
        comprehension_score: 2,
        meaningfulness: 3,
        decision_reached_at: iso(138),
        continuation_choice: "finish",
      },
      {
        participant_code: "DEMO-3",
        assigned_group: "B",
        is_demo: true,
        started_at: iso(120),
        lesson_completed_at: iso(115),
        interaction_completed_at: iso(110),
        interaction_answers: { bottle: "recycle", apple: "compost", crisps: "bin" },
        activity_status: "completed",
        activity_completed_at: iso(95),
        observation_text:
          "Demo record: found a shampoo bottle and a takeaway tub; chose to refill the bottle.",
        parent_help: 1,
        quiz_completed_at: iso(90),
        quiz_answers: [1, 0, 1],
        comprehension_score: 3,
        meaningfulness: 5,
        decision_reached_at: iso(88),
        continuation_choice: "continue",
        next_module_started_at: iso(88),
      },
      {
        participant_code: "DEMO-4",
        assigned_group: "B",
        is_demo: true,
        started_at: iso(60),
        lesson_completed_at: iso(55),
        interaction_completed_at: iso(50),
        interaction_answers: { bottle: "recycle", apple: "compost", crisps: "recycle" },
        activity_status: "skipped",
        activity_completed_at: iso(49),
      },
    ];

    const { error } = await supabaseAdmin
      .from("experiment_sessions")
      .insert(demoRows);
    if (error) throw new Error("Could not insert demo sessions");
    return { inserted: demoRows.length };
  });

// Photos remain private in the experiment event log. This endpoint checks real
// authentication and admin role before returning any photo bytes.
export const getResearchPhoto = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ sessionId: z.string().uuid() }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: event, error } = await context.supabase
      .from("experiment_events")
      .select("payload")
      .eq("session_id", data.sessionId)
      .eq("event_name", "activity_photo_submitted")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error("Could not load photo");
    const payload = event?.payload;
    const url = payload && typeof payload === "object" && !Array.isArray(payload) && "photoDataUrl" in payload
      ? payload["photoDataUrl"] : null;
    return { photoDataUrl: typeof url === "string" && url.startsWith("data:image/jpeg;base64,") ? url : null };
  });
