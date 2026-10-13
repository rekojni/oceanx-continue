import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Compass,
  Home,
  Loader2,
  Printer,
  Waves,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ACTIVITY_STEPS,
  ACTIVITY_TITLE,
  deriveStage,
  LESSON_SECTIONS,
  LESSON_TITLE,
  QUIZ,
  SORT_ITEMS,
  SORT_OPTIONS,
  type LearnStage,
  type SessionSnapshot,
  type SortChoice,
} from "@/lib/experiment-content";
import {
  chooseContinuation,
  createSession,
  getSessionState,
  markLessonComplete,
  saveActivity,
  saveInteraction,
  saveQuiz,
} from "@/lib/experiment.functions";
import {
  clearStoredSession,
  loadStoredSession,
  saveStoredSession,
  type StoredSession,
} from "@/lib/session-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Start Learning | OceanX Learning Journey" },
      {
        name: "description",
        content:
          "Sample ocean lesson with a sorting game, an optional at-home activity, a short quiz and a real choice about what to do next. Educational demonstration, not official OceanX content.",
      },
      { property: "og:title", content: "Start Learning | OceanX Learning Journey" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LearnPage,
});

type Stage = "loading" | "welcome" | LearnStage;

function LearnPage() {
  const navigate = useNavigate();
  const [stored, setStored] = useState<StoredSession | null>(null);
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const [busy, setBusy] = useState(false);

  const getState = useServerFn(getSessionState);

  useEffect(() => {
    const saved = loadStoredSession();
    if (!saved) {
      setStage("welcome");
      return;
    }
    getState({ data: saved })
      .then((snap) => {
        setStored(saved);
        setSnapshot(snap);
        const s = deriveStage(snap);
        if (s === "continued") {
          void navigate({ to: "/learn/next" });
        } else {
          setStage(s);
        }
      })
      .catch(() => {
        clearStoredSession();
        setStage("welcome");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async (s: StoredSession) => {
    const snap = await getState({ data: s });
    setSnapshot(snap);
    return snap;
  };

  return (
    <div className="ocean-surface min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 pt-6">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-ocean-deep">
          <Waves className="size-5 text-primary" />
          OceanX Learning Journey
        </Link>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
          Educational demo
        </span>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-8">
        {snapshot && stage !== "finished" && (
          <ProgressSteps group={snapshot.group} stage={stage as LearnStage} />
        )}

        {stage === "loading" && (
          <div className="flex justify-center py-24">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        )}

        {stage === "welcome" && (
          <WelcomeStage
            busy={busy}
            onStart={async (code) => {
              setBusy(true);
              try {
                const res = await createSession({ data: { participantCode: code } });
                const s = { sessionId: res.sessionId, token: res.token };
                saveStoredSession(s);
                setStored(s);
                setSnapshot({
                  id: res.sessionId,
                  group: res.group,
                  lessonCompletedAt: null,
                  interactionCompletedAt: null,
                  interactionAnswers: null,
                  activityStatus: null,
                  quizCompletedAt: null,
                  continuationChoice: null,
                  classifiedStatus: "In Progress",
                });
                setStage("lesson");
              } catch {
                toast.error("Could not start a session. Please try again.");
              } finally {
                setBusy(false);
              }
            }}
          />
        )}

        {stage === "lesson" && stored && (
          <LessonStage
            busy={busy}
            onDone={async () => {
              setBusy(true);
              try {
                await markLessonComplete({ data: stored });
                await refresh(stored);
                setStage("interaction");
              } catch {
                toast.error("Could not save progress. Please try again.");
              } finally {
                setBusy(false);
              }
            }}
          />
        )}

        {stage === "interaction" && stored && (
          <InteractionStage
            initialAnswers={snapshot?.interactionAnswers ?? null}
            busy={busy}
            onDone={async (answers) => {
              setBusy(true);
              try {
                await saveInteraction({ data: { ...stored, answers } });
                const snap = await refresh(stored);
                setStage(snap.group === "B" ? "activity" : "quiz");
              } catch {
                toast.error("Could not save your choices. Please try again.");
              } finally {
                setBusy(false);
              }
            }}
          />
        )}

        {stage === "activity" && stored && (
          <ActivityStage
            busy={busy}
            onSubmit={async (status, text) => {
              setBusy(true);
              try {
                await saveActivity({
                  data: { ...stored, status, observationText: text },
                });
                await refresh(stored);
                setStage("quiz");
              } catch {
                toast.error("Could not save the activity. Please try again.");
              } finally {
                setBusy(false);
              }
            }}
          />
        )}

        {stage === "quiz" && stored && snapshot && (
          <QuizStage
            group={snapshot.group}
            busy={busy}
            onDone={async (answers, meaningfulness, parentHelp) => {
              setBusy(true);
              try {
                await saveQuiz({
                  data: { ...stored, answers, meaningfulness, parentHelp },
                });
                await refresh(stored);
                setStage("decision");
              } catch {
                toast.error("Could not save the quiz. Please try again.");
              } finally {
                setBusy(false);
              }
            }}
          />
        )}

        {stage === "decision" && stored && (
          <DecisionStage
            busy={busy}
            onChoose={async (choice) => {
              setBusy(true);
              try {
                await chooseContinuation({ data: { ...stored, choice } });
                if (choice === "continue") {
                  void navigate({ to: "/learn/next" });
                } else {
                  await refresh(stored);
                  setStage("finished");
                }
              } catch {
                toast.error("Could not save your choice. Please try again.");
              } finally {
                setBusy(false);
              }
            }}
          />
        )}

        {stage === "finished" && <FinishedStage />}
      </main>
    </div>
  );
}

function ProgressSteps({ group, stage }: { group: "A" | "B"; stage: LearnStage }) {
  const steps = useMemo(() => {
    const base = [
      { id: "lesson", label: "Lesson" },
      { id: "interaction", label: "Sorting game" },
    ];
    if (group === "B") base.push({ id: "activity", label: "Home activity" });
    base.push({ id: "quiz", label: "Quiz" }, { id: "decision", label: "Your choice" });
    return base;
  }, [group]);

  const currentIdx = Math.max(
    0,
    steps.findIndex((s) => s.id === stage),
  );

  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex flex-wrap items-center gap-2">
        {steps.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2">
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                i < currentIdx && "bg-ocean-teal/20 text-ocean-deep",
                i === currentIdx && "bg-primary text-primary-foreground",
                i > currentIdx && "bg-muted text-muted-foreground",
              )}
            >
              {i < currentIdx && <Check className="size-3" />}
              {s.label}
            </span>
            {i < steps.length - 1 && <span className="h-px w-3 bg-border" />}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function StageCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      {children}
    </div>
  );
}

function WelcomeStage({
  busy,
  onStart,
}: {
  busy: boolean;
  onStart: (code?: string) => void;
}) {
  const [code, setCode] = useState("");
  return (
    <StageCard>
      <h1 className="text-2xl font-bold text-ocean-deep sm:text-3xl">
        Ready to explore the ocean?
      </h1>
      <p className="mt-3 leading-relaxed text-muted-foreground">
        You'll read a short lesson called <strong>{LESSON_TITLE}</strong>, play a sorting
        game, answer three quick questions, and then decide what to do next. It takes
        about 5–10 minutes, and you can refresh the page without losing your place.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        No names, emails or photos — this is an anonymous educational demonstration with
        sample content, not official OceanX material.
      </p>
      <div className="mt-6">
        <label htmlFor="participant-code" className="text-sm font-semibold">
          Participant code <span className="font-normal text-muted-foreground">(optional — an adult facilitator can enter one)</span>
        </label>
        <Input
          id="participant-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={40}
          placeholder="e.g. P-07"
          className="mt-1.5 max-w-xs"
        />
      </div>
      <Button
        size="lg"
        className="mt-6"
        disabled={busy}
        onClick={() => onStart(code.trim() || undefined)}
      >
        {busy ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        Begin
      </Button>
    </StageCard>
  );
}

function LessonStage({ busy, onDone }: { busy: boolean; onDone: () => void }) {
  return (
    <StageCard>
      <p className="text-sm font-semibold uppercase tracking-wide text-ocean-teal">
        Sample lesson
      </p>
      <h1 className="mt-1 text-2xl font-bold text-ocean-deep sm:text-3xl">{LESSON_TITLE}</h1>
      <div className="mt-6 space-y-5">
        {LESSON_SECTIONS.map((s, i) => (
          <div key={s.heading} className="flex gap-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm font-bold text-primary">
              {i + 1}
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">{s.heading}</h2>
              <p className="mt-1 leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
      <Button size="lg" className="mt-8" disabled={busy} onClick={onDone}>
        {busy ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        I've read it — let's play
      </Button>
    </StageCard>
  );
}

function InteractionStage({
  initialAnswers,
  busy,
  onDone,
}: {
  initialAnswers: Record<string, string> | null;
  busy: boolean;
  onDone: (answers: Record<string, string>) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, SortChoice>>(
    (initialAnswers as Record<string, SortChoice>) ?? {},
  );
  const allAnswered = SORT_ITEMS.every((item) => answers[item.id]);

  return (
    <StageCard>
      <h1 className="text-2xl font-bold text-ocean-deep sm:text-3xl">Sort it right</h1>
      <p className="mt-2 text-muted-foreground">
        Where should each of these go when you're done with it? Tap a choice on each card.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {SORT_ITEMS.map((item) => {
          const chosen = answers[item.id];
          return (
            <div
              key={item.id}
              className={cn(
                "rounded-xl border p-4 transition-colors",
                chosen
                  ? chosen === item.correct
                    ? "border-ocean-teal bg-seafoam"
                    : "border-accent bg-sand"
                  : "border-border bg-background",
              )}
            >
              <p className="font-display font-semibold">{item.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.hint}</p>
              <div className="mt-3 flex flex-col gap-1.5">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAnswers((a) => ({ ...a, [item.id]: opt.id }))}
                    className={cn(
                      "rounded-lg border px-2 py-1.5 text-left text-xs font-semibold transition-colors",
                      chosen === opt.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:bg-secondary",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {chosen && (
                <p
                  className={cn(
                    "mt-3 text-xs leading-relaxed",
                    chosen === item.correct ? "text-ocean-deep" : "text-accent-foreground",
                  )}
                >
                  {chosen === item.correct ? "Correct! " : "Good try. "}
                  {item.feedback}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <Button size="lg" className="mt-8" disabled={!allAnswered || busy} onClick={() => onDone(answers)}>
        {busy ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        Continue
      </Button>
    </StageCard>
  );
}

function ActivityStage({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (status: "completed" | "skipped", text?: string) => void;
}) {
  const [text, setText] = useState("");
  return (
    <StageCard>
      <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ocean-teal">
        <Home className="size-4" /> Off-screen activity
      </p>
      <h1 className="mt-1 text-2xl font-bold text-ocean-deep sm:text-3xl">{ACTIVITY_TITLE}</h1>
      <p className="mt-2 text-muted-foreground">
        Time to look away from the screen! This is a safe at-home activity to do with an
        adult.
      </p>
      <ol className="mt-5 list-decimal space-y-2 pl-5 leading-relaxed text-foreground">
        {ACTIVITY_STEPS.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">
        <Printer className="size-4 shrink-0" />
        Tip: an adult can print this page or write the steps down so you can do the activity
        away from the screen. Please don't upload photos of people.
      </div>
      <div className="mt-6">
        <label htmlFor="observation" className="text-sm font-semibold">
          What did you find, and what action did you choose?
        </label>
        <Textarea
          id="observation"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="e.g. I found a shampoo bottle and a yoghurt pot. I'll reuse the pot for pencils."
          className="mt-1.5"
        />
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          disabled={busy || text.trim().length < 5}
          onClick={() => onSubmit("completed", text)}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Check />}
          I did it — save my answer
        </Button>
        <Button
          size="lg"
          variant="outline"
          disabled={busy}
          onClick={() => onSubmit("skipped")}
        >
          Skip activity
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Skipping is OK — it's recorded so researchers can see how much friction the activity
        adds.
      </p>
    </StageCard>
  );
}

function QuizStage({
  group,
  busy,
  onDone,
}: {
  group: "A" | "B";
  busy: boolean;
  onDone: (answers: number[], meaningfulness: number, parentHelp?: 0 | 1 | 2) => void;
}) {
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null]);
  const [meaningfulness, setMeaningfulness] = useState<number | null>(null);
  const [parentHelp, setParentHelp] = useState<0 | 1 | 2 | null>(null);

  const complete =
    answers.every((a) => a !== null) &&
    meaningfulness !== null &&
    (group !== "B" || parentHelp !== null);

  return (
    <StageCard>
      <h1 className="text-2xl font-bold text-ocean-deep sm:text-3xl">Quick check</h1>
      <p className="mt-2 text-muted-foreground">Three questions about the lesson.</p>
      <div className="mt-6 space-y-6">
        {QUIZ.map((q, qi) => (
          <fieldset key={q.id}>
            <legend className="font-display font-semibold">
              {qi + 1}. {q.question}
            </legend>
            <div className="mt-2 flex flex-col gap-2">
              {q.options.map((opt, oi) => (
                <label
                  key={opt}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                    answers[qi] === oi
                      ? "border-primary bg-primary/10 font-semibold"
                      : "border-border bg-background hover:bg-secondary",
                  )}
                >
                  <input
                    type="radio"
                    name={q.id}
                    className="accent-primary"
                    checked={answers[qi] === oi}
                    onChange={() =>
                      setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))
                    }
                  />
                  {opt}
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <fieldset>
          <legend className="font-display font-semibold">
            How meaningful did this lesson feel to you?
          </legend>
          <div className="mt-2 flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMeaningfulness(n)}
                className={cn(
                  "flex size-11 items-center justify-center rounded-full border font-display font-bold transition-colors",
                  meaningfulness === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-secondary",
                )}
                aria-label={`Meaningfulness ${n} out of 5`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            1 = not meaningful at all, 5 = very meaningful
          </p>
        </fieldset>

        {group === "B" && (
          <fieldset>
            <legend className="font-display font-semibold">
              How much help did an adult give you?
            </legend>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              {(
                [
                  [0, "None — I did it myself"],
                  [1, "A few prompts"],
                  [2, "Lots of help"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setParentHelp(v)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
                    parentHelp === v
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-secondary",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        )}
      </div>
      <Button
        size="lg"
        className="mt-8"
        disabled={!complete || busy}
        onClick={() =>
          onDone(answers as number[], meaningfulness!, parentHelp ?? undefined)
        }
      >
        {busy ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        Save my answers
      </Button>
    </StageCard>
  );
}

function DecisionStage({
  busy,
  onChoose,
}: {
  busy: boolean;
  onChoose: (choice: "continue" | "finish") => void;
}) {
  return (
    <StageCard>
      <h1 className="text-center text-2xl font-bold text-ocean-deep sm:text-3xl">
        What would you like to do next?
      </h1>
      <p className="mt-2 text-center text-muted-foreground">
        It's completely up to you.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onChoose("continue")}
          className="flex flex-col items-center gap-3 rounded-2xl border-2 border-primary bg-primary/5 p-8 text-center transition-colors hover:bg-primary/10 disabled:opacity-60"
        >
          <Compass className="size-10 text-primary" />
          <span className="font-display text-xl font-bold text-ocean-deep">
            Explore the next journey
          </span>
          <span className="text-sm text-muted-foreground">
            Open the next module: {`"Ocean Habitats"`}
          </span>
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onChoose("finish")}
          className="flex flex-col items-center gap-3 rounded-2xl border-2 border-border bg-card p-8 text-center transition-colors hover:bg-secondary disabled:opacity-60"
        >
          <Check className="size-10 text-ocean-teal" />
          <span className="font-display text-xl font-bold text-ocean-deep">
            Finish for now
          </span>
          <span className="text-sm text-muted-foreground">
            End this session here
          </span>
        </button>
      </div>
      {busy && (
        <p className="mt-4 flex justify-center">
          <Loader2 className="size-5 animate-spin text-primary" />
        </p>
      )}
    </StageCard>
  );
}

function FinishedStage() {
  return (
    <StageCard>
      <div className="py-6 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-seafoam">
          <Check className="size-8 text-ocean-teal" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-ocean-deep sm:text-3xl">
          Thanks for learning with us!
        </h1>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-muted-foreground">
          Your session is complete and saved. Every piece of plastic we keep out of drains
          and rivers is one less piece in the ocean.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/">Back to the start</Link>
        </Button>
      </div>
    </StageCard>
  );
}
