# OceanX Continue

Create a WORKING, polished, responsive full-stack web prototype called "OceanX Learning Journey | Beyond the Screen" for my university IS615 Digital Transformation Strategy INDIVIDUAL assignment. Start building now (not planning only). The application must meet an assessed requirement: a functional input interface, genuine persistent backend (Lovable Cloud/Supabase Postgres), trackable experiment evidence, and at least one working automated decision/update after user action; demonstrate a complete end-to-end learner workflow. I own this project; it is not an official OceanX product.

CONTEXT AND HMW
Sponsor OceanX Education seeks repeatable digital education and sustained engagement beyond one-off programmes. Specific HMW: "How might we keep learners engaged beyond their initial OceanX experience?" Professor feedback: ONE PRIMARY OUTCOME, actual continuation behaviour. My product validation hypothesis: "Compared with digital-only learning, upper-primary learners given a linked real-world activity will be more likely to START a subsequent OceanX learning journey." Secondary indicators only: perceived meaningfulness, comprehension, task completion, and parent assistance. Target: primary 4-6 learners doing optional parent-supported learning at home; use an anonymous research demo. Do not claim real impact/results or official OceanX endorsement.

EXPERIMENT DESIGN
Build two condition variants with same sample lesson, identical digital interaction, identical comprehension quiz, identical continuation prompt and follow-up module:
- A "Digital-only": sample ocean lesson > virtual interaction > common comprehension + meaningfulness reflection > choice.
- B "Digital + Real-world": same lesson and virtual interaction > safe OFF-SCREEN at-home activity > submitted artefact/observation > same comprehension + meaningfulness > choice.
Single independent variable is extra real-world activity; acknowledge time/friction difference in dashboard notes.
Randomly allocate group on server at session start, approximately balanced if feasible, keep assignment FIXED for session; do not allow learner to choose. Session code is pseudonymous, input optional participant code entered by adult facilitator; no name, DOB, school, photo of people, email, GPS.
Record unique session uuid, human-facing participant code, assigned_group, session start timestamp, stage reached timestamps, virtual interaction answer, B activity status (completed/skipped) and optional observation text artefact, parent help self-rating (0 no help /1 prompts /2 substantial assistance), comprehension answer and correct flag (same MCQ both groups), meaningfulness rating 1-5, continuation_choice, next_module_started_at, classified_status, created/updated timestamps. Save progress to DATABASE at each critical step, not only in local storage. Support refresh/resume if possible via secret session token, otherwise warn on refresh, but do not duplicate sessions.

THE PRIMARY MEASURE MUST BE BEHAVIOURAL: after their first journey learners see equally prominent actions "Explore the next journey" and "Finish for now". Clicking Explore should ACTUALLY load a simple second ocean learning page and persist next_module_started_at in the backend; clicking Finish saves status as finished. Denominator is participants who REACH THE continuation decision; numerator those who START the next module. Also show session attrition from experiment-starts. Do not count mere intention or hover.

LEARNER CONTENT & UI
Ocean visual theme, modern child-friendly yet not childish, accessible mobile and desktop; clean typography, animated but no distracting excessive motion. Copy should clearly say "Educational demonstration; sample lesson, not official OceanX content". Original short educational lesson: "Where Does Plastic Go?" tracing litter from street drains through rivers and the ocean, no copied/licensed OceanX videos or logos required. 3-card virtual sorting interaction (e.g. disposal choices) with clear feedback, identical in groups. Group B ONLY activity: "Plastic Detective" safe home audit: identify two or three plastic objects at home, pick one reduction/reuse action, then enter a SHORT TEXT FIELD as submitted artefact; don't require or upload personal photos. Include printable/offscreen prompt. Allow 'Skip activity' while recording skip (so attrition/friction observable). Both groups then same 3-question comprehension quiz + one 1–5 perceived meaningfulness rating. B parent assistance field. Follow-up module "Ocean Habitats" small but real content page to prove 'started next module'. Completion screen shown when finish. Progress indicator with labels.

PERSISTENCE & AUTOMATION
Enable Lovable Cloud database if not enabled. Define clean relational Postgres schema ideally experiment_sessions and experiment_events (and optionally artefacts) with appropriate constraints, statuses. Add actual server-side update classification in a database function/trigger or edge function: when continuation_choice=continue AND next_module_started_at is non-null, status becomes "Continued"; if finish selected, status becomes "Finished"; else "In Progress". Capture measurable events or stage timestamps. Explicitly build an end-to-end testable persistence path: learner creates session > saves textual real-world artefact in B > quiz reflection saved > continuation choice > database-driven outcome status > researcher dashboard updates.
Handle data securely with RLS and avoid public researcher data exposure. The learner is anonymous; use protected server-side functions with opaque tokens for creating/updating ONLY own session, not arbitrary row read/writes; do not expose admin reads to unauthenticated users. Researcher dashboard MUST be access-restricted with proper authenticated access (e.g. admin role), including server-side policies, NOT client-side password/hardcoded secret. If admin bootstrap needs to be configured, provide a clear admin setup instruction. Do not falsely claim admin is already configured. Minimise data, no unnecessary child information.

RESEARCHER DASHBOARD
Separate /research dashboard accessible to authorised admin only (real authentication). KPI tiles for eligible session counts A/B, continued counts A/B, continuation percentages A/B, percentage-point difference B - A. Use denominator of sessions reaching decision; show 'descriptive only; very small samples not causal evidence'. Supporting: mean meaningfulness, mean comprehension, B activity completed vs skipped, recorded parent-help, per-stage drop-off; sessions table with pseudonymous participant code, group, dates, observation text (only to admin), stage, continuation, automated status, ability to export CSV (no names). Data should be LIVE from database, not mocked data or hardcoded results. Clear empty state. Option to seed 2-4 obviously marked synthetic/demo records if needed, preferably via protected admin action; do not mix those with real results (demo flag and toggle exclude).

ASSIGNMENT RUBRIC
The report max 4 pages and 2-min video walkthrough require showing a real create/update, record appearing in app/dashboard, and an automated decision outcome. Make app have a "How to demo" admin section with 5 short steps: new B session; save observation; finish quiz; choose continue; open dashboard to see persisted Continued status. Include an /about page summarising HMW, hypothesis, what is functional vs simulated, primary metric definition, low sample limits, and ethical limitations. Prototype is intended as a validation experiment, not production deployment; don't imply tested outcomes exist.

Build an actual app with working data persistence, including migrations and backend. If you lack permissions or need an external manual step, surface that plainly and do as much as possible. Once built, please run/fix build checks and report exactly what works, how to access researcher dashboard, any uncompleted setup, and test instructions.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3fe24186-8ccb-49a0-8fe5-de3a8ece78ce).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
