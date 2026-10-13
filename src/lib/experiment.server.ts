// Server-only helpers for the experiment. Never imported by client code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { QUIZ } from "./experiment-content";
import type { Tables } from "@/integrations/supabase/types";

export type ExperimentSession = Tables<"experiment_sessions">;

export async function logEvent(
  sessionId: string,
  eventName: string,
  payload?: Record<string, unknown>,
) {
  await supabaseAdmin.from("experiment_events").insert({
    session_id: sessionId,
    event_name: eventName,
    payload: payload ?? null,
  });
}

export async function createExperimentSession(participantCode?: string) {
  // Approximately balanced allocation: assign to whichever group is smaller
  // (random on a tie). Demo rows never affect the balance.
  const { data: rows, error: countErr } = await supabaseAdmin
    .from("experiment_sessions")
    .select("assigned_group")
    .eq("is_demo", false);
  if (countErr) throw new Error("Could not prepare a new session");

  const countA = (rows ?? []).filter((r) => r.assigned_group === "A").length;
  const countB = (rows ?? []).filter((r) => r.assigned_group === "B").length;
  const group =
    countA === countB ? (Math.random() < 0.5 ? "A" : "B") : countA < countB ? "A" : "B";

  const { data, error } = await supabaseAdmin
    .from("experiment_sessions")
    .insert({
      assigned_group: group,
      participant_code: participantCode?.trim() ? participantCode.trim() : null,
    })
    .select("id, session_token, assigned_group")
    .single();
  if (error || !data) throw new Error("Could not create a session");

  await logEvent(data.id, "session_started", { group: data.assigned_group });
  return {
    sessionId: data.id,
    token: data.session_token,
    group: data.assigned_group as "A" | "B",
  };
}

export async function getSessionForToken(sessionId: string, token: string) {
  const { data, error } = await supabaseAdmin
    .from("experiment_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (error || !data || data.session_token !== token) {
    throw new Error("Session not found");
  }
  return data;
}

export async function updateSession(
  sessionId: string,
  token: string,
  patch: Record<string, unknown>,
  eventName: string,
  eventPayload?: Record<string, unknown>,
) {
  const session = await getSessionForToken(sessionId, token);
  const { error } = await supabaseAdmin
    .from("experiment_sessions")
    .update(patch)
    .eq("id", session.id);
  if (error) throw new Error("Could not save progress");
  await logEvent(session.id, eventName, eventPayload);
  return session;
}

export function scoreQuiz(answers: number[]) {
  return QUIZ.reduce(
    (score, q, i) => score + (answers[i] === q.correctIndex ? 1 : 0),
    0,
  );
}
