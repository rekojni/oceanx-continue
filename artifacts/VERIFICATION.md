# Verification evidence — 13 October 2026 (Singapore)

All running-application checks use the replacement Free Supabase project. This document describes software verification, not participant research or proof of the hypothesis.

| Check | Result and evidence |
|---|---|
| TypeScript | `npm run typecheck` passed. |
| Automated tests | 15 tests in 4 files passed: routing, activity UI, input/photo/CSV/metric logic, and actual Postgres migrations with isolated Auth/Storage schema fixtures. |
| Production build | `npm run build` passed, including client, SSR and Nitro output. Chunk-size and upstream plugin warnings remain non-blocking. |
| Server credentials | `.env.local` ignored, owner-only permissions; exact configured server key absent from `.output/public`. |
| Actual backend | Server connection verified. Experiment data persisted to Supabase Postgres. Anonymous session/event/role queries were denied or returned no rows. |
| Group A browser journey | Created a demo session, refreshed without duplication, completed lesson/sorting/common quiz, finished. Persisted `Finished` with no next-module timestamp. |
| Group B browser journey | Same digital steps plus preview/removal/replacement of a PNG test fixture, observation submission and private JPEG storage, same quiz, Continue, actual Ocean Habitats opening. Persisted `Continued`. |
| Save confirmation | Visible success notification after Group B submission. |
| Restricted dashboard | User registered and confirmed their researcher account; approved admin role assigned. Real sign-in and live dashboard worked. Demo/test records excluded by default. |
| Private evidence | Admin dashboard retrieved private image. Anonymous authenticated-storage requests and public image URL requests were denied. |
| CSV export | Actual browser download completed (945 bytes for the two initial browser demonstrations); Chrome displayed Done after its Save dialog. Formula escaping tested, including leading whitespace. |
| Responsive UI | Welcome checked at 390 × 844; no horizontal page overflow; screenshot visually inspected. |
| Private Wi-Fi | Preview bound to Wi-Fi address on port 5174; HTTP 200 verified. No public deployment/tunnel. |
| iPhone hardware | User confirmed Safari link, camera capture, preview, save, quiz, second-module opening and saved-start confirmation. Phone demo metadata and photo-event existence checked in the database. |
| Primary measurement | SQL tests show quiz save is not a decision view, Continue choice alone remains In Progress, and first actual module start becomes Continued. Duplicate retries retain first timestamps and outcomes. |
| Records | Browser and phone sessions are explicitly demo/test. There are no fabricated participant rows. |

## Saved artifacts

- `backend-verification.json`: metadata of the two actual browser-created demonstration sessions, private JPEG byte size and anonymous/public access-denial checks.
- `phone-verification.json`: metadata for the phone demonstrations and separate user device confirmation. No phone photograph bytes are copied into this repository.
- `screenshots/activity-preview.png`: genuine upload and written-input UI using a tiny test fixture.
- `screenshots/continued.png`: loaded Ocean Habitats and successful continuation save.
- `screenshots/research-dashboard.png`: live initial browser demonstration records and metrics with explicit demonstration banner.
- `screenshots/mobile-welcome.png`: responsive welcome page.
- Local ignored `build.log` and `tests.log`: command output from final validation.

## Limits

Android hardware was not tested. The Postgres integration suite emulates Supabase's Auth/Storage surroundings rather than running the entire Supabase stack. Real browser/Supabase checks and the user-operated iPhone check provide separate evidence. There are no real child-participant results, no return-engagement experiment, no production abuse/retention controls, and no public deployment.

The original Lovable runtime has not been reconfigured. Apply the upgrade and configure the same runtime's backend credentials before syncing this change to another deployment. The verified implementation is maintained on `feat/camera-research-dashboard` in pull request #1; main remains unchanged until an approved merge.
