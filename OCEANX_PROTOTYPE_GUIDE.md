# OceanX Learning Journey — implementation and verification

This is a **student-built educational validation prototype**; it is not official OceanX content. The group comparison tests a specific hypothesis: whether adding a real-world activity increases **actual next-module starts** rather than merely asking whether a learner intends to continue.

## Routes
- `/`: welcome.
- `/learn`: automatically assigned Group A/B, digital lesson, identical virtual activity, Group B offscreen plastic audit with optional object-only photo, identical comprehension and meaningfulness questions, choice to finish/continue.
- `/learn/next`: second lesson. Opening it persists the real `next_module_started_at`, which triggers the backend's `Continued` classification. Clicking Continue alone is insufficient.
- `/auth`: researcher email/password sign-in and registration.
- `/research`: **admin-only** live data with A/B metrics, CSV export and restricted photo review. Excludes seeded demo data by default.
- `/about`: hypothesis, measurement definitions, functional/simulated elements, limitations.

## Backend and privacy
Lovable Cloud's Supabase database is used. The existing migration creates `experiment_sessions`, `experiment_events`, and `user_roles` with Row Level Security. The server alone stores anonymous session updates through session-scoped opaque tokens; researcher reads require login and an admin database role. Camera images are converted client-side into **small JPEGs** and retained as private `activity_photo_submitted` event payloads. This is suitable only for a restricted course demonstration: for production, move images into a private object-storage bucket with retention and deletion controls. Never put photos of people or identifiable addresses into the prototype; use staged object photographs. Photos are optional, and text submissions remain allowed.

## Admin access
Email/password registration does **not** automatically confer administrator rights. After signing up, an authorised backend administrator must grant your specific Supabase account the admin role. With authorised SQL-editor access, replace the placeholder with the user's actual verified auth user UUID:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('REPLACE_WITH_VERIFIED_AUTH_USER_UUID', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

Do **not** execute this against untrusted or randomly selected accounts. Never expose service-role credentials to the browser or GitHub. The live app's authenticated backend requires `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` as **server-side environment variables**; VITE-prefixed URL and publishable key are client-safe. The original Lovable Cloud deployment may provide secrets automatically; a local Codex run generally needs environment configuration using credentials from the linked Supabase project. GitHub `.env` contains public project configuration only, not the service-role key. If the backend is unavailable, verify configuration before testing.

## Local development (Codex or VS Code)
1. `git clone https://github.com/rekojni/oceanx-continue.git`
2. `cd oceanx-continue`
3. Check out this feature branch: `git checkout feat/camera-research-dashboard`
4. Install Bun (if not installed). Run `bun install`.
5. Configure required environment variables securely (above), never committing service-role keys.
6. `bun run build` and `bunx tsc --noEmit`; run `bun run test`.
7. `bun run dev` to test on the Mac.

The app is a TanStack Start application; **do not deploy it as a static-only SPA** because server functions and secret-backed database writes need a server runtime. A secure HTTPS endpoint is needed for camera/browser testing on another device. The file input offers capture on supported mobile browsers and photo-picker fallback.

## Verification sequence for the two-minute assignment video
1. Begin a fresh synthetic session and note Group A or B. To test B specifically, create successive synthetic sessions; allocation is approximately balanced, not controlled by participants.
2. Complete the lesson and sorting game. For Group B, perform the plastic audit, take an object-only photo or choose a file, add an observation, and submit.
3. Complete the common 3-question quiz and 1–5 meaningfulness rating.
4. Choose `Explore the next journey` and confirm the **Ocean Habitats** page actually loads. To show a comparison, finish for now in another synthetic session.
5. Sign in as the assigned admin, open `/research`, refresh and show saved records, private photo evidence (B), real calculated continuation rates and the database-triggered `Continued` or `Finished` outcomes.

**Never report synthetic/demo records as real participant results.** Experiment success thresholds, sample size, user permission, and institutional approval must be defined in the written report; implementation evidence is not evidence that the hypothesis is true. Small convenience samples, unequal task time and parental assistance limit causal interpretation.

## Known limitations
- Small JPEG images are stored in the private event log; migrate to private storage for any substantial or real-world rollout.
- Camera acquisition depends on device/browser and may present a chooser rather than forcing the camera.
- Researcher admin-role bootstrap is a separate manual setup step.
- Backend end-to-end and mobile-device tests need to be performed using your deployment/credentials. Source changes alone do not establish a working production deployment.
