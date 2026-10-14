# OceanX Learning Journey

A student-built IS615 prototype testing whether adding a real-world activity to a digital ocean lesson encourages learners to start the next learning journey. It is an educational demonstration with original sample content, independent of OceanX.

## What works

- Automatic, fixed Group A/B allocation with the same digital lesson, sorting interaction and quiz.
- Group B Plastic Detective activity with a written observation, optional camera or image upload, preview and save confirmation.
- Persistent Supabase session records, events and private photographs; refresh/resume using a session token.
- Actual next-module opening recorded in the database, with automatically classified Continued/Finished status.
- Authenticated researcher dashboard with restricted evidence access, continuation rates, supporting observations and CSV export.
- Demonstration records excluded from participant metrics by default.

The primary measure is **actual next-module starts / sessions reaching the continuation decision**. Software tests and demonstration sessions do not establish that the intervention improves engagement.

## Local setup

Use Node.js 24 and the committed Bun lockfile:

```sh
npx --yes --package=bun bun install --frozen-lockfile
cp .env.example .env.local
```

Configure your Supabase project's public values and server-only secret in ignored `.env.local`, apply the SQL migrations in order, and configure an authorised researcher account as described in the [setup guide](OCEANX_PROTOTYPE_GUIDE.md). The replacement Free Supabase project is already configured on the original development Mac. Its credentials are not included in this repository.

```sh
npm run dev -- --host 127.0.0.1 --port 5173
```

Open `/learn` for the learner journey, `/auth` for researcher sign-in and `/research` for the restricted dashboard. For approved testing on the same trusted Wi-Fi, `npm run dev:wifi` prints the learner URL.

## Verification and documentation

```sh
npm run typecheck
npm test
npm run build
```

The verified implementation passed 15 tests across four files, TypeScript checking and a production build. Separate live browser/Supabase checks verified persistence and private access; the owner tested iPhone Safari capture and continuation. Android hardware and real participant effectiveness have not been tested.

- [Setup, backend architecture and limits](OCEANX_PROTOTYPE_GUIDE.md)
- [Two-minute walkthrough and report screenshots](DEMO_WALKTHROUGH.md)
- [Verification evidence and limitations](artifacts/VERIFICATION.md)

## Development history and deployment

The initial scaffold was created in Lovable. Subsequent implementation, backend integration, fixes and verification were completed locally with Codex. The updated code is maintained on `feat/camera-research-dashboard` in [pull request #1](https://github.com/rekojni/oceanx-continue/pull/1).

The original Lovable deployment has not been reconfigured. Before deploying these changes, apply the database upgrade and configure that runtime's backend credentials. The feature branch remains separate from `main`; no public deployment or hypothesis-validation claim is implied by the code update.
