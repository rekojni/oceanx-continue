// Server-only helpers for the experiment. Never imported by client code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { QUIZ } from "./experiment-content";
import type { Tables, Json } from "@/integrations/supabase/types";

export type ExperimentSession = Tables<"experiment_sessions">;

export async function logEvent(
  sessionId: string,
  eventName: string,
  payload?: Record<string, unknown>,
) {
  const { error } = await supabaseAdmin.from("experiment_events").insert({
    session_id: sessionId,
    event_name: eventName,
    payload: (payload ?? null) as Json,
  });
  if (error) throw new Error("Could not save experiment event");
}

export async function createExperimentSession(
  sessionId: string,
  token: string,
  participantCode?: string,
  isDemo = false,
) {
  const { data, error } = await supabaseAdmin.rpc("oceanx_create_session", {
    _id: sessionId,
    _token: token,
    _code: participantCode?.trim() ?? "",
    _demo: isDemo,
  });
  if (error || !data)
    throw new Error("Could not create a session. Check the backend connection and migrations.");
  return data as { sessionId: string; token: string; group: "A" | "B" };
}

export async function saveStep(
  sessionId: string,
  token: string,
  step: string,
  payload: Record<string, unknown> = {},
) {
  const { data, error } = await supabaseAdmin.rpc("oceanx_save_step", {
    _id: sessionId,
    _token: token,
    _step: step,
    _payload: payload as Json,
  });
  if (error || !data)
    throw new Error(
      "Could not save this step. Check your connection and complete the earlier steps first.",
    );
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

export function scoreQuiz(answers: number[]) {
  return QUIZ.reduce((score, q, i) => score + (answers[i] === q.correctIndex ? 1 : 0), 0);
}
