## Context

See `proposal.md` - Why / Platform decision for the motivation and the comparison that led here. Today the app is a 100% static React SPA with no backend (`beachWeeksService.ts` reads pre-computed data). This design adds the first backend: a self-hosted PocketBase instance on Railway, providing auth, data storage, and per-record access control for the four new capabilities (`identity`, `beach-week-registration`, `room-assignment`, `beach-week-notes`).

PocketBase is a single Go binary embedding SQLite, a built-in auth system, a REST+realtime API, and a per-collection API rule engine that plays the same role Postgres RLS played in the original Supabase-based plan.

## Goals / Non-Goals

**Goals:**
- Define the PocketBase collection schema and API rules that implement the four specs' access rules.
- Define the auth mechanism (passwordless) and admin account-creation flow.
- Define how the same schema/config reaches local dev, and Railway, without drift.
- Define a Railway deployment pipeline driven by GitHub Actions.
- Define a local development option that doesn't touch the hosted instance.

**Non-Goals:**
- Real-time sync for notes or room assignments (specs require refresh-on-focus only).
- Backups/disaster-recovery automation beyond a documented manual step (noted as a risk, not designed in depth here).
- Any change to the existing public calendar's code path.
- Carried over from the superseded `.kilo/plans/feature_requests.md` as explicitly deferred, non-blocking, and still out of scope here: OAuth sign-in alongside OTP, self-service in-app invites, email notifications (note updated / upcoming week reminder), rich-text notes (plain text remains the MVP), and a PWA/offline mode.

## Decisions

### Collections & API rules

All schema is defined as PocketBase JS migrations (`pb_migrations/*.js`), checked into the repo, applied automatically on startup (both locally and on Railway) via `pocketbase migrate up`. This is the single source of truth for collections and rules — no manual Admin UI schema edits in any environment.

**`users`** (PocketBase's built-in auth collection, used directly — no separate `people` table)
- Fields: PocketBase defaults (`email`, `name`, `verified`, `avatar` optional) — no custom fields needed.
- Accounts are created only by an admin via the PocketBase Admin UI ("New record" on `users`, no password set) — satisfies `identity`'s "admin-managed, no self-service" requirement with zero custom code.
- Auth method: PocketBase's built-in **OTP (one-time password via email)** login — the passwordless mechanism satisfying `identity`'s sign-in requirement. Requires SMTP configured (see Migration Plan).

**`registrations`** (implements `beach-week-registration`)
- Fields: `beach_week_n` (number), `registered_by` (relation → `users`, required), `attendees` (text, required)
- Unique index on (`beach_week_n`, `registered_by`) — enforces "editable in place, one registration per person per week" at the DB level.
- API rules: `listRule`/`viewRule`: `@request.auth.id != ""` (any signed-in person can read all registrations — needed so the sign-up UI can show "who's already registered," mirroring the original plan's "read all" policy). `createRule`: `@request.auth.id != "" && @request.body.registered_by = @request.auth.id`. `updateRule`/`deleteRule`: `@request.auth.id != "" && registered_by = @request.auth.id`. (Verified against PocketBase 0.40.2: the submitted-body reference is `@request.body.<field>`, not `@request.data.<field>`.)

**`room_assignments`** (implements `room-assignment`)
- Fields: `beach_week_n` (number), `room_name` (**select**, required, fixed values: `Downstairs Primary`, `"Old People" Room`, `Upstairs Primary`, `Bunk Beds`, `Upstairs Front Room`, `Media Room`), `person` (relation → `users`, optional), `label` (text, optional), `added_by` (relation → `users`, required)
- `room_name` is a closed enum matching the house's actual rooms, not free text — this removes the free-text-drift concern the original plan flagged (e.g. "Master Bedroom" vs "Master Bdrm" typos) for this field entirely.
- Validation: exactly one of `person`/`label` must be set (enforced in a `pb_migrations` hook / `onRecordCreate` validation, since PocketBase field rules can't express "at least one of two fields" declaratively).
- API rules (list/view/create/update/delete, all the same shape): `@request.auth.id != "" && @collection.registrations.beach_week_n ?= beach_week_n && @collection.registrations.registered_by ?= @request.auth.id` — i.e. the acting user must have a `registrations` row for this `beach_week_n`. This is the PocketBase equivalent of the original plan's `EXISTS registration WHERE ...` RLS policy, expressed as a cross-collection back-reference filter.
- No unique index and no rule blocking multiple occupants per room — matches the "no capacity/lock enforcement" requirement directly in the rule (there simply is no such constraint).

**`notes`** (implements `beach-week-notes`)
- Fields: `beach_week_n` (number), `date` (date, required), `content` (text), `created_by`/`updated_by` (relation → `users`)
- Unique index on (`beach_week_n`, `date`).
- API rules: same registration-gate shape as `room_assignments`.

Exact PocketBase rule syntax (the `@collection.<name>.<field> ?=` cross-collection back-reference form) has been verified against PocketBase 0.40.2 by creating the collections against a live instance and confirming denial for a second, non-registered test account across all four gated operations (list/view/create/update) on both `room_assignments` and `notes` — see `pocketbase/pb_migrations/`.

`users` also needed one correction from the default PocketBase setup: the collection ships with `createRule: ""` (open self-registration) and password auth enabled. A dedicated migration (`1788600000_configure_users_auth.js`) sets `createRule` to `null` (superuser-only creation, i.e. admin-managed) and disables `passwordAuth` while enabling `otp`, so there is no self-service or password-based path at all — verified live: unauthenticated record creation on `users` is rejected, and password sign-in for an admin-created account is rejected while OTP sign-in for the same account succeeds.

### Auth flow

1. Admin creates a `users` record for a new family member via the Admin UI (email only, no password).
2. That person visits the app, enters their email, and requests a one-time code (PocketBase OTP endpoint).
3. PocketBase emails the code via configured SMTP; the person enters it in the app and is signed in, receiving a session token the frontend stores and attaches to subsequent API calls.
4. The public calendar route tree never checks for a session — only the sign-up, room-assignment, and notes routes do.

### Deployment target: Railway

- One Railway service running the official `pocketbase/pocketbase` (or a minimal custom) Docker image, with a Railway volume mounted at PocketBase's data directory so the SQLite file and uploaded files persist across deploys.
- **Scale-to-zero enabled**: Railway's sleep-on-idle setting is turned on for this service. At 10-30 users with low, bursty traffic (sign-up, room assignment, note edits), the service is idle most of the time, so scale-to-zero cuts cost close to nothing without sacrificing anything the specs require — no request needs sub-second latency, and the persistent volume means SQLite data survives sleep/wake exactly as it survives a normal restart.
- Config via Railway environment variables: SMTP host/port/user/password (for OTP emails), and the PocketBase superuser bootstrap credentials (set once, used only for first login to the Admin UI).
- **Provider: Resend.** `pb_migrations/1788600004_configure_smtp.js` reads `RESEND_TOKEN` and, only when it's present, points PocketBase's mail settings at Resend's SMTP relay (`smtp.resend.com`, username `resend`, password = the token) and sets the sender to `goodtimes@nhudak3.dev` (the Resend account's verified sending domain) — local dev has no `RESEND_TOKEN` by default, so it keeps the console-logged OTP fallback described below.
- **Port 2465, not 587.** Verified live against the deployed instance: a direct connection to `smtp.resend.com:587` timed out (`dial tcp ...:587: connect: connection timed out`) — Railway blocks that outbound port. Resend documents `2465`/`2587` as alternate ports for exactly this "platform blocks standard SMTP ports" case; `2465` (implicit TLS) connects successfully and a real test send through it returned `204`.
- The React app talks to this instance via a `VITE_POCKETBASE_URL` environment variable set at build time (Cloudflare Pages / current static host build config) — no other frontend build changes.
- **Custom domain: `api.goodtimes.huskytown.net`**, not the `.up.railway.app` domain — the frontend's public domain is `goodtimes.huskytown.net` (same zone, different subdomain), so the backend needed its own subdomain to avoid colliding with it. CNAME + TXT ownership-verification records added in the `huskytown.net` Cloudflare zone. CORS was a real question given frontend and backend now sit on different subdomains (different origins) — verified against the live instance: PocketBase returns `Access-Control-Allow-Origin: *` by default, and this app's auth uses Bearer tokens via the JS SDK (stored in `localStorage`), not cookies, so there's no credentialed-CORS restriction either. `meta.appURL` is set to this domain, not the frontend's — PocketBase's built-in password-reset/verification email templates hardcode an `{APP_URL}/_/#/auth/...` link (the Admin UI's own route), so `appURL` must point at wherever PocketBase itself is reachable.

### CI/CD: GitHub Actions → Railway

- A workflow triggered on push to `main` (path-filtered so unrelated frontend-only commits don't redeploy the backend needlessly, if desired) that deploys the PocketBase service to Railway using the Railway CLI (`railway up`) authenticated via a `RAILWAY_TOKEN` repository secret.
- The workflow installs the Railway CLI via `mise` (`jdx/mise-action`, reading the version pinned in `mise.toml`) rather than a separate ad hoc install step — this is the same version a developer gets locally, so "works on my machine" drift between CI and local is not a concern for this tool.
- `pb_migrations/*.js` ship inside the deployed image; PocketBase applies any pending migrations automatically on boot, so schema changes ride along with normal deploys — no separate manual migration step against production.
- Existing frontend deploy workflow is untouched; this is a new, independent workflow for the backend service only.

### Local development option

- Local tool versions (`pocketbase`, `railway`) are managed via **mise**, consistent with this repo's existing use of mise for `node`/`pnpm`/`wrangler` (see `mise.toml`). Add `pocketbase` and `railway` to `[tools]` — both are in mise's core registry (`github:pocketbase/pocketbase` and `github:railwayapp/cli` respectively), so no custom plugin is needed; `mise install` pulls the pinned versions for anyone cloning the repo.
- Local PocketBase run via the mise-installed binary — either directly (`pocketbase serve --dir ./pb_data_local`) or wrapped in a `mise run` task (e.g. `mise run pb:serve`, mirroring the existing `mise run deploy` task pattern) — using the same `pb_migrations/*.js` files, so local schema always matches what's deployed.
- A local `.env` sets `VITE_POCKETBASE_URL=http://127.0.0.1:8090` so the frontend points at the local instance instead of Railway.
- SMTP for local OTP emails: PocketBase logs the full rendered email (OTP code included) to its own console when SMTP isn't configured — **but only when run with `--dev`** (verified: without `--dev` the OTP request still succeeds but nothing is logged). The `pb:serve` mise task passes `--dev` for exactly this reason, so local development never requires a real mail provider; a real SMTP provider is only needed for Railway.

## Risks / Trade-offs

- **[Risk]** SQLite-backed single-instance deployment has no built-in HA and a ceiling on write concurrency → **Mitigation**: acceptable at 10-30 users with low write volume; revisit only if usage profile changes materially.
- **[Risk]** No designed backup automation (Non-Goal above) → **Mitigation**: document a manual "download the SQLite file / trigger a Railway volume snapshot before risky migrations" step as a task; automate later if data loss risk becomes a real concern.
- **[Risk]** Cross-collection API rule syntax (`@collection.registrations...`) is more fragile/less discoverable than Postgres RLS → **Mitigation**: cover the four access-gate scenarios (registered vs. not, for each of `room_assignments` and `notes`) with integration tests against a running PocketBase instance as part of implementation, not just manual QA.
- **[Risk]** OTP email delivery depends on SMTP configuration on Railway; misconfiguration silently locks everyone out of sign-in → **Mitigation**: verify OTP end-to-end against the Railway instance (not just local, where PocketBase can log codes without SMTP) before considering this change done.
- **[Risk]** Scale-to-zero introduces a cold-start delay (the service waking from sleep) on the first request after idle, which could make a sign-up/room-assignment/note action appear to hang or time out → **Mitigation**: verify the actual wake latency against Railway's current cold-start behavior for this image size, and surface a loading state in the frontend for auth/data calls rather than assuming an instant response; revisit (disable scale-to-zero) only if the delay proves disruptive in practice.

## Migration Plan

1. Create the Railway project, add a persistent volume, and set SMTP + superuser bootstrap env vars.
2. Add `pb_migrations/*.js` for the four collections and their API rules to the repo.
3. Add the GitHub Actions workflow (`RAILWAY_TOKEN` secret) that deploys to Railway on push to `main`.
4. Deploy once; log into the Admin UI with the bootstrap superuser to confirm migrations applied.
5. Create the first real admin-invited `users` record and verify OTP sign-in end-to-end on the deployed instance.
6. Wire the frontend: add `VITE_POCKETBASE_URL`, an auth context/provider, and the new sign-up / room-assignment / notes routes — additive only, no changes to existing calendar routes.
7. Rollback strategy: Railway keeps prior deploys; redeploying a previous image is sufficient since schema migrations are additive-only in this change (no destructive migration is introduced).
