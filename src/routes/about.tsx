import { createFileRoute, Link } from "@tanstack/react-router";
import { Waves } from "lucide-react";
export const Route = createFileRoute("/about")({ component: AboutPage });
function AboutPage() {
  return (
    <div className="ocean-surface min-h-screen px-6 py-12">
      <main className="mx-auto max-w-3xl rounded-2xl bg-card p-8 shadow-sm">
        <Link className="flex items-center gap-2 font-semibold text-primary" to="/">
          <Waves className="size-5" />
          OceanX Learning Journey
        </Link>
        <h1 className="mt-7 text-3xl font-bold text-ocean-deep">About the experiment</h1>
        <p className="mt-4">
          <strong>
            How might we keep learners engaged beyond their initial OceanX experience?
          </strong>
        </p>
        <p className="mt-4">
          Hypothesis: Upper-primary learners who complete a real-world activity linked to digital
          ocean learning are more likely to start a subsequent journey than learners using
          digital-only content.
        </p>
        <h2 className="mt-7 text-xl font-bold">What is being compared?</h2>
        <p className="mt-2">
          Group A: digital lesson, virtual sorting and quiz. Group B: the same digital elements plus
          a safe at-home plastic audit with optional object-only photo evidence. Assignment is
          approximately balanced and assigned by the backend.
        </p>
        <h2 className="mt-7 text-xl font-bold">Primary measure</h2>
        <p className="mt-2">
          Continuation rate = unique sessions that actually open the next module ÷ sessions that
          reach the continuation choice. Clicking Continue without opening the next module does not
          count. Meaningfulness, comprehension, activity completion and parental help are secondary
          descriptive indicators.
        </p>
        <h2 className="mt-7 text-xl font-bold">Functional and simulated elements</h2>
        <p className="mt-2">
          Functional: session creation, backend record saving, group allocation, sorting, activity
          submission, photo capture, quiz scoring, follow-on module logging and automatic status
          classification. Simulated: the educational content itself, which is original demonstration
          material rather than official OceanX content.
        </p>
        <h2 className="mt-7 text-xl font-bold">Limitations and ethics</h2>
        <p className="mt-2">
          Small exploratory samples cannot establish a reliable causal effect. Immediate
          continuation is not seven-day return engagement. Added activity time may contribute to
          attrition. Do not photograph people, faces or identifiable locations. A facilitator should
          supervise at-home activities. Permission and relevant school/parent consent are necessary
          for child testing; mark initial demonstration sessions as demo/test so they are excluded
          from participant results.
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          Educational university prototype, not an official OceanX product.
        </p>
        <Link to="/" className="mt-6 inline-block font-semibold text-primary underline">
          Return home
        </Link>
      </main>
    </div>
  );
}
