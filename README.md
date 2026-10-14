# OceanX Learning Journey

A student IS615 Digital Transformation Strategy prototype testing whether a real-world activity encourages learners to start another ocean learning journey. This is an independent educational demonstration, not an official OceanX product.

## Current implementation

**The completed and verified prototype is on [feat/camera-research-dashboard](https://github.com/rekojni/oceanx-continue/tree/feat/camera-research-dashboard), in [pull request #1](https://github.com/rekojni/oceanx-continue/pull/1).** The application code on `main` is still the original version until that pull request is approved and merged. This README update does not merge or deploy application changes.

The verified version includes:

- Fixed automatic Group A/B allocation and a shared digital lesson, activity and quiz.
- A Group B home activity with written observations and optional camera/image upload.
- Persistent Supabase records, private photo storage and token-checked progress saves.
- Actual next-module starts and automatically classified continuation outcomes.
- An authenticated researcher dashboard, A/B metrics and CSV export.
- Demonstration sessions excluded from participant results by default.

The primary measure is **actual next-module starts / sessions reaching the continuation decision**. Demonstration records are software evidence; they do not prove improved engagement.

## Verification and setup

The completed implementation passed 15 tests across four files, TypeScript checking and a production build. Both GitHub validation checks passed for commit `2382c29`. Live browser/backend checks and owner-operated iPhone Safari testing verified persistence, camera upload and actual continuation.

- [Current code and local setup](https://github.com/rekojni/oceanx-continue/blob/feat/camera-research-dashboard/README.md)
- [Backend architecture and configuration](https://github.com/rekojni/oceanx-continue/blob/feat/camera-research-dashboard/OCEANX_PROTOTYPE_GUIDE.md)
- [Test evidence and limitations](https://github.com/rekojni/oceanx-continue/blob/feat/camera-research-dashboard/artifacts/VERIFICATION.md)
- [Demonstration walkthrough](https://github.com/rekojni/oceanx-continue/blob/feat/camera-research-dashboard/DEMO_WALKTHROUGH.md)

The replacement Free Supabase backend is configured locally. Server credentials are ignored and are not published in this repository. The original hosted runtime needs its database upgrade and backend configuration before deploying the updated code. Android hardware and real participant effectiveness have not been tested.

## Development history

The initial scaffold was generated using Lovable. Subsequent implementation, backend integration, fixes and verification were completed locally with Codex. The prototype uses React, TypeScript, TanStack Start and Supabase.
