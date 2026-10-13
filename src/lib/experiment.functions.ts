import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { activityInput, interactionInput, sessionRef } from "./experiment-validation";

export const createSession = createServerFn({ method: "POST" })
  .validator((d) =>
    sessionRef
      .extend({
        participantCode: z.string().max(40).optional(),
        isDemo: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { createExperimentSession } = await import("./experiment.server");
    return createExperimentSession(data.sessionId, data.token, data.participantCode, data.isDemo);
  });

export const getSessionState = createServerFn({ method: "POST" })
  .validator((d) => sessionRef.parse(d))
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
  .validator((d) => sessionRef.parse(d))
  .handler(async ({ data }) => {
    const { saveStep } = await import("./experiment.server");
    await saveStep(data.sessionId, data.token, "lesson_completed");
    return { ok: true };
  });

export const saveInteraction = createServerFn({ method: "POST" })
  .validator((d) => interactionInput.parse(d))
  .handler(async ({ data }) => {
    const { saveStep } = await import("./experiment.server");
    await saveStep(data.sessionId, data.token, "interaction_completed", { answers: data.answers });
    return { ok: true };
  });

export const saveActivity = createServerFn({ method: "POST" })
  .validator((d) => activityInput.parse(d))
  .handler(async ({ data }) => {
    const { getSessionForToken, saveStep } = await import("./experiment.server");
    const session = await getSessionForToken(data.sessionId, data.token);
    if (session.assigned_group !== "B" || !session.interaction_completed_at)
      throw new Error("This session does not include the home activity yet");
    if (session.activity_status) return { ok: true };
    let storagePath: string | undefined;
    if (data.photoDataUrl) {
      const { storePhoto } = await import("./photo.server");
      storagePath = await storePhoto(session.id, data.photoDataUrl);
    }
    await saveStep(data.sessionId, data.token, `activity_${data.status}`, {
      observationText: data.status === "completed" ? data.observationText : undefined,
      storagePath,
    });
    return { ok: true };
  });

export const saveQuiz = createServerFn({ method: "POST" })
  .validator((d) =>
    sessionRef
      .extend({
        answers: z.array(z.number().int().min(0).max(2)).length(3),
        meaningfulness: z.number().int().min(1).max(5),
        parentHelp: z.union([z.literal(0), z.literal(1), z.literal(2)]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { saveStep, scoreQuiz } = await import("./experiment.server");
    await saveStep(data.sessionId, data.token, "quiz_completed", {
      answers: data.answers,
      meaningfulness: data.meaningfulness,
      parentHelp: data.parentHelp,
    });
    return { ok: true, score: scoreQuiz(data.answers) };
  });

// Denominator starts only after the decision component mounts in the browser.
export const markDecisionViewed = createServerFn({ method: "POST" })
  .validator((d) => sessionRef.parse(d))
  .handler(async ({ data }) => {
    const { saveStep } = await import("./experiment.server");
    await saveStep(data.sessionId, data.token, "decision_viewed");
    return { ok: true };
  });

export const chooseContinuation = createServerFn({ method: "POST" })
  .validator((d) => sessionRef.extend({ choice: z.enum(["continue", "finish"]) }).parse(d))
  .handler(async ({ data }) => {
    const { saveStep } = await import("./experiment.server");
    await saveStep(data.sessionId, data.token, "continuation_chosen", { choice: data.choice });
    return { ok: true };
  });

export const markNextModuleViewed = createServerFn({ method: "POST" })
  .validator((d) => sessionRef.parse(d))
  .handler(async ({ data }) => {
    const { saveStep } = await import("./experiment.server");
    await saveStep(data.sessionId, data.token, "next_module_started");
    return { ok: true };
  });

// ---------- Researcher-facing (authenticated admin only) ----------

async function assertAdmin(
  supabase: import("@supabase/supabase-js").SupabaseClient<
    import("@/integrations/supabase/types").Database
  >,
  userId: string,
) {
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
    const sessions: Omit<
      import("./experiment.server").ExperimentSession,
      "session_token" | "interaction_answers" | "quiz_answers" | "updated_at"
    >[] = [];
    const photoSessionIds = new Set<string>();
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      const { data: page, error } = await context.supabase
        .from("experiment_sessions")
        .select(
          "id, participant_code, assigned_group, is_demo, started_at, lesson_completed_at, interaction_completed_at, activity_status, activity_completed_at, observation_text, parent_help, quiz_completed_at, comprehension_score, comprehension_total, meaningfulness, decision_reached_at, continuation_choice, next_module_started_at, classified_status, created_at",
        )
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) throw new Error("Could not load research data");
      sessions.push(...(page ?? []));
      if (!page || page.length < pageSize) break;
    }
    for (let offset = 0; ; offset += pageSize) {
      const { data: page, error } = await context.supabase
        .from("experiment_events")
        .select("session_id, id")
        .eq("event_name", "activity_photo_submitted")
        .order("id")
        .range(offset, offset + pageSize - 1);
      if (error) throw new Error("Could not load artefact metadata");
      for (const event of page ?? []) photoSessionIds.add(event.session_id);
      if (!page || page.length < pageSize) break;
    }
    return { sessions, photoSessionIds: [...photoSessionIds] };
  });

// Photos remain in private Storage (legacy event photos remain readable). This endpoint checks real
// authentication and admin role before returning any photo bytes.
export const getResearchPhoto = createServerFn({ method: "POST" })
  .validator((data) => z.object({ sessionId: z.string().uuid() }).parse(data))
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
    const url =
      payload && typeof payload === "object" && !Array.isArray(payload) && "photoDataUrl" in payload
        ? payload["photoDataUrl"]
        : null;
    const path =
      payload && typeof payload === "object" && !Array.isArray(payload) && "storagePath" in payload
        ? payload["storagePath"]
        : null;
    if (typeof path === "string") {
      if (!path.startsWith(`${data.sessionId}/`) || !/^[0-9a-f-]+\/[0-9a-f-]+\.jpg$/.test(path))
        throw new Error("Invalid photo reference");
      // Uses the researcher's authenticated client: Storage RLS is enforced again.
      const { data: image, error: imageError } = await context.supabase.storage
        .from("oceanx-evidence")
        .download(path);
      if (imageError || !image) throw new Error("Could not load private photo");
      return {
        photoDataUrl: `data:image/jpeg;base64,${Buffer.from(await image.arrayBuffer()).toString("base64")}`,
      };
    }
    // Read-only compatibility with photographs saved by the original branch.
    return {
      photoDataUrl:
        typeof url === "string" && url.startsWith("data:image/jpeg;base64,") ? url : null,
    };
  });
