import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FlaskConical, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OceanX Learning Journey | Beyond the Screen" },
      {
        name: "description",
        content:
          "An educational research prototype exploring whether linking a real-world activity to digital ocean learning helps learners continue their journey. Sample lesson, not official OceanX content.",
      },
      { property: "og:title", content: "OceanX Learning Journey | Beyond the Screen" },
      {
        property: "og:description",
        content:
          "A validation experiment prototype: does a linked real-world activity make learners more likely to start the next ocean learning journey?",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="ocean-surface min-h-screen">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="animate-float absolute left-[10%] top-[18%] size-16 rounded-full bg-ocean-teal/20" />
        <div className="animate-float-slow absolute right-[12%] top-[30%] size-24 rounded-full bg-primary/10" />
        <div className="animate-bob absolute bottom-[20%] left-[20%] size-10 rounded-full bg-accent/30" />
      </div>

      <main className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6 flex size-16 items-center justify-center rounded-2xl ocean-deep-surface text-primary-foreground shadow-lg">
          <Waves className="size-8" />
        </div>
        <h1 className="text-4xl font-bold text-ocean-deep sm:text-5xl">
          OceanX Learning Journey
        </h1>
        <p className="mt-2 text-xl font-semibold text-ocean-teal">Beyond the Screen</p>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          A short ocean lesson, a sorting game, and — for some learners — a small
          real-world activity at home. At the end, you choose what happens next.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Button asChild size="lg" className="px-8 text-base">
            <Link to="/learn">
              Start the learning journey
              <ArrowRight className="ml-1" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="px-8 text-base">
            <Link to="/about">About this experiment</Link>
          </Button>
        </div>

        <p className="mt-8 flex max-w-md items-start gap-2 rounded-xl border border-border bg-card/80 p-4 text-left text-sm text-muted-foreground">
          <FlaskConical className="mt-0.5 size-4 shrink-0 text-ocean-teal" />
          Educational demonstration; sample lesson, not official OceanX content. This is an
          anonymous university research prototype — no names, emails or photos are collected.
        </p>

        <Link
          to="/auth"
          className="mt-10 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
        >
          Researcher sign-in
        </Link>
      </main>
    </div>
  );
}
