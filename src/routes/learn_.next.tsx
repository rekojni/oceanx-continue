import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Loader2, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HABITATS, NEXT_MODULE_TITLE } from "@/lib/experiment-content";
import { markNextModuleViewed } from "@/lib/experiment.functions";
import { clearStoredSession, loadStoredSession } from "@/lib/session-store";

export const Route = createFileRoute("/learn_/next")({
  head: () => ({
    meta: [
      { title: "Ocean Habitats | OceanX Learning Journey" },
      {
        name: "description",
        content:
          "The follow-up module of the OceanX Learning Journey prototype: a short introduction to ocean habitats. Educational demonstration, not official OceanX content.",
      },
      { property: "og:title", content: "Ocean Habitats | OceanX Learning Journey" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NextModulePage,
});

function NextModulePage() {
  const [state, setState] = useState<"loading" | "recorded" | "no-session" | "error">("loading");

  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const saved = loadStoredSession();
    if (!saved) {
      setState("no-session");
      return;
    }
    markNextModuleViewed({ data: saved })
      .then((res) => {
        if (!res.ok) {
          setState("no-session");
          return;
        }
        if (active) setState("recorded");
      })
      .catch(() => {
        if (active) setState("error");
      });
    return () => {
      active = false;
    };
  }, [retry]);

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

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-10">
        {state === "loading" && (
          <div className="flex justify-center py-16">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        )}

        {state === "recorded" && (
          <p className="mb-6 flex items-center gap-2 rounded-xl border border-ocean-teal/40 bg-seafoam px-4 py-3 text-sm font-semibold text-ocean-deep">
            <Check className="size-4 shrink-0 text-ocean-teal" />
            You started the next journey — this has been recorded in the research log.
          </p>
        )}

        {state === "error" && (
          <div role="alert" className="mb-6 rounded-xl border bg-card p-4">
            <p>
              Your next journey is open, but its start has not been confirmed as saved. Check your
              connection and retry.
            </p>
            <Button
              className="mt-3"
              onClick={() => {
                setState("loading");
                setRetry((v) => v + 1);
              }}
            >
              Retry saving progress
            </Button>
          </div>
        )}
        {state === "no-session" && (
          <p className="mb-6 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            This module is part of the learning journey.{" "}
            <Link
              to="/learn"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Start from the beginning
            </Link>{" "}
            to have your progress saved.
          </p>
        )}

        <p className="text-sm font-semibold uppercase tracking-wide text-ocean-teal">
          Next journey
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-ocean-deep sm:text-4xl">
          {NEXT_MODULE_TITLE}
        </h1>
        <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
          The ocean isn't one place — it's many neighbourhoods. Here are four of them.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {HABITATS.map((h) => (
            <article
              key={h.name}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <h2 className="font-display text-lg font-bold text-primary">{h.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{h.fact}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row">
          <Button asChild>
            <Link to="/">Finish and go home</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              clearStoredSession();
              window.location.assign("/learn");
            }}
          >
            Start a separate session
          </Button>
          <Button asChild variant="outline">
            <Link to="/about">About this experiment</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
