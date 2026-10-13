# OceanX Learning Journey — setup and demonstration

This student prototype tests: **How might we keep learners engaged beyond their initial OceanX experience?** The one primary outcome is actual next-module starts. Meaningfulness, comprehension, activity completion and adult assistance are supporting observations. Original sample lessons are not official OceanX material.

## Run on this Mac

The checkout is on `feat/camera-research-dashboard`. Node 24 is installed. Dependencies were installed with Bun from the npm registry because this Mac's npm resolver failed; the existing `bun.lock` remains authoritative.

```sh
cd oceanx-continue
npm run dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173`. Researcher sign-in is `/auth`; the restricted dashboard is `/research`. Use your own registered credentials. Your approved, confirmed researcher account has the `admin` role in the new Supabase project.

For a fresh checkout, install the locked dependencies:

```sh
npx --yes --package=bun bun install --frozen-lockfile
```

No Xcode, paid Lovable credits, or paid API is required for local development.

## Backend configuration

The old public configuration points to a Lovable-managed endpoint. It responded, but its server credential was unavailable locally. A new **Free** Supabase organization/project was created with your account, and its schema and private access rules were applied with your approval. It is independent of the Lovable deployment. The original `.env` is retained; ignored `.env.local` overrides it locally.

Project dashboard: https://supabase.com/dashboard/project/woztnvawdwozlrbvexqa

Copy `.env.example` to `.env.local` when configuring another machine. Supply:

- `SUPABASE_URL` and `VITE_SUPABASE_URL`: the same project's URL.
- `SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_PUBLISHABLE_KEY`: its publishable key.
- `SUPABASE_SECRET_KEY`: the existing server-only secret key; a legacy `SUPABASE_SERVICE_ROLE_KEY` is also supported.

Never add `VITE_` to the secret name. `.env.local` is ignored and saved with owner-only file permissions on this Mac. Restart Vite after configuration changes. Keys are not in the guide or commits.

On a **new empty** Supabase project, apply these files in order in the SQL Editor:

1. `supabase/migrations/20261013000100_experiment.sql`
2. `supabase/migrations/20261013000200_atomic_steps_and_private_photos.sql`

The base file mirrors the original Drizzle schema. Do not rerun it on a populated/existing schema. For an existing original OceanX schema, apply only the upgrade after review. This Mac's replacement project already has both. The CLI migration ledger was not used: these SQL files were applied together in a transaction through the dashboard.

Register a researcher at `/auth`, confirm the email, then sign in. Registration does not grant research access. After the owner approves the exact account, a server operator may run:

```sh
node --env-file=.env --env-file=.env.local scripts/grant-researcher.mjs YOUR_CONFIRMED_EMAIL
```

This checks the confirmed account before assigning the role. Do not grant roles to unidentified accounts. Use the researcher dashboard on localhost; the Wi-Fi HTTP preview is intended for learner camera testing on a trusted local network.

## Architecture and measurement

React/TypeScript and TanStack Start provide the UI and server functions. Supabase Auth authenticates researchers; Postgres stores session records and audit events; private Supabase Storage stores optional JPEGs.

- **Group A:** lesson → sorting interaction → quiz/reflection/adult assistance → continuation decision.
- **Group B:** identical digital steps, with the Plastic Detective home activity between sorting and quiz. It accepts a written observation with an optional photo, or records skipping.
- `oceanx_create_session` allocates a fixed, approximately balanced group under a database lock. Demo/test sessions balance separately from participant sessions.
- A cryptographically random session ID and opaque token are saved before creation. A retry uses the same pair; refresh resumes the same session. Temporary connection errors preserve the stored session.
- `oceanx_save_step` locks the session, verifies its token and stage prerequisites, saves progress and the audit event in one transaction, and ignores completed-stage retries. The first choice and next-module timestamp are preserved.
- Quiz save does **not** set the denominator timestamp. `decision_reached_at` is saved after the decision component mounts. Its actions wait for that write.
- Continue saves only the choice. `/learn/next` renders Ocean Habitats, then its effect saves `next_module_started_at`. A database trigger classifies `Continued` only with that timestamp and a Continue choice; Finish becomes `Finished`; other sessions remain `In Progress`.
- The metric is `actual next-module starts / sessions reaching the decision × 100`, calculated independently for A and B. The difference is B minus A in percentage points. An empty denominator shows “—”.

Admin dashboard queries page through database records and show session counts, progression, rates, scores, activity completion/skipping, adult help, observations, private photo review and CSV. CSV includes anonymous session IDs and stage timestamps, with formula-like text escaped. CSV contains no photo bytes or session tokens.

## Photo privacy and accessibility

The camera input uses `capture="environment"`; a separate file input provides photo-library fallback. Preview, replacement, removal and text-only submission are supported. Inputs accept JPEG/PNG/WebP and browser-decodable HEIC/HEIF, up to 15 MB. Unsupported HEIC decoding gives a JPEG-conversion suggestion. Canvas re-encoding strips source EXIF metadata and reduces the image to at most 720 pixels on its longest edge and less than 300 KB. The server checks JPEG encoding, size and signature.

`oceanx-evidence` is private and accepts only small JPEGs. Server code uploads using its secret key after session/group verification. Event payloads store an opaque object path, not new image bytes. Researcher photo retrieval checks the real authenticated account's admin role and uses its authenticated Storage client, so Storage RLS applies again. Anonymous/public image URLs were tested and denied. Legacy small JPEG event payloads remain readable only through the admin endpoint.

Do not photograph people, faces, addresses, documents or identifiable locations. Both groups answer the same adult-assistance question. The facilitator should use the **demonstration/test checkbox** for software tests and video recordings; these records are excluded from participant metrics by default. No manufactured participant records are seeded.

## iPhone on the same Wi-Fi

Keep the Mac awake and both devices on the same Wi-Fi. In a second terminal:

```sh
npm run dev:wifi
```

The script binds only the Wi-Fi IPv4 interface (`en0` by default) on port 5174 and prints the current URL. Open that URL in Safari. If the interface differs, set `OCEANX_WIFI_INTERFACE` to the correct interface. No public tunnel or deployment was created. The IP may change on another network; use the printed address.

For a camera test, tick demonstration/test, enter `PHONE-DEMO`, and complete a Group B journey. If initially allocated A, finish and start a separate session; assignment remains automatic. Photograph a plastic object, preview it, write an observation, submit, finish the quiz and open Ocean Habitats. The iPhone test was reported successful by the user; saved database metadata was checked separately.

Stop the Wi-Fi preview with Ctrl+C when finished. If Safari cannot reach it, check the same Wi-Fi, the Mac's firewall prompt for Node, and whether the preview process is running. Do not bypass browser certificate/security warnings.

## Checks and evidence

```sh
npm run typecheck
npm test
npm run build
npm run check:backend
node --env-file=.env --env-file=.env.local scripts/check-client-secrets.mjs
```

`npm test` contains browser UI unit tests and isolated PostgreSQL integration tests using PGlite. The integration suite runs the actual migrations and tests allocation, retries, ordering, scoring, continuation classification, RLS, private object reads and role-grant restrictions. Supabase's surrounding Auth/Storage schemas are emulated in that isolated suite; live backend and browser checks are recorded separately.

Evidence and limits: `artifacts/VERIFICATION.md`, `artifacts/backend-verification.json`, `artifacts/phone-verification.json`, and `artifacts/screenshots/`. The two-minute script is `DEMO_WALKTHROUGH.md`.

## Remaining limits

- Actual children/participant experiments and hypothesis validation have not been performed; software demonstrations are not evidence of increased engagement.
- The user verified iPhone capture. Android hardware and all browser/HEIC combinations have not been tested.
- Clearing browser storage or switching devices/origins starts a separate session. Transient errors preserve the current token; there is no cross-device resume service.
- A failed or ambiguous database acknowledgment after uploading may leave an unreferenced private object. The code deliberately avoids deleting possibly committed evidence. There is no scheduled retention or orphan cleanup; review these before real participant use.
- There is no production abuse limiting or deployment hardening. Keep this a restricted coursework prototype.
- Updated code is maintained on `feat/camera-research-dashboard` in pull request #1, separately from `main`. Before syncing it to Lovable or another runtime, apply the upgrade to that runtime's database and configure the server secrets. Do not merge or deploy without owner approval.

Supabase references: [API keys](https://supabase.com/docs/guides/getting-started/api-keys), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).
