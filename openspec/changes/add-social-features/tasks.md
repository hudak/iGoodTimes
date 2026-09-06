## 1. Local PocketBase setup

- [x] 1.1 Add `pocketbase` and `railway` to `mise.toml`'s `[tools]` (both are in mise's core registry, no plugin needed); verify `mise install` on a clean clone pulls both alongside the existing `node`/`pnpm`/`wrangler` tools
- [x] 1.2 Add a `pb_migrations/` directory and a `mise` task (e.g. `mise run pb:serve`, matching the existing `deploy` task style in `mise.toml`) that runs `pocketbase serve --dir ./pb_data_local`; verify it starts cleanly with an empty data dir
- [x] 1.3 Document the local dev flow (README or `docs/`) including that OTP codes appear in the local PocketBase log instead of requiring SMTP, and that `mise install` provisions `pocketbase`/`railway`; verify by following the doc from a clean checkout

## 2. Collection schema & API rules (migrations)

- [x] 2.1 Write a `pb_migrations` migration creating `registrations` (`beach_week_n`, `registered_by` relation, `attendees`) with the unique index on (`beach_week_n`, `registered_by`) and the API rules from design.md; verify by running the migration locally and inspecting the collection in the Admin UI
- [x] 2.2 Write a migration creating `room_assignments` (`beach_week_n`, `room_name` as a select field with the fixed values Downstairs Primary / "Old People" Room / Upstairs Primary / Bunk Beds / Upstairs Front Room / Media Room, `person` relation, `label`, `added_by` relation) plus the "exactly one of person/label" validation hook and the registration-gated API rules; verify with a manual create via the Admin UI/API for both a `person`-only and `label`-only record, confirm a record with both or neither is rejected, and confirm a `room_name` outside the fixed list is rejected
- [x] 2.3 Write a migration creating `notes` (`beach_week_n`, `date`, `content`, `created_by`, `updated_by`) with the unique index on (`beach_week_n`, `date`) and the registration-gated API rules; verify locally the same way
- [x] 2.4 Confirm the exact cross-collection back-reference rule syntax (`@collection.registrations...`) against the installed PocketBase version for both `room_assignments` and `notes`; verify with a live API call from a second (non-registered) test account that access is denied as expected

## 3. Identity & auth

- [x] 3.1 Configure PocketBase's built-in OTP auth on the `users` collection; verify a test account can request and complete an OTP sign-in locally (code visible in the PocketBase log)
- [x] 3.2 Document the admin account-creation flow (Admin UI → new `users` record, no password) as the only way to create an account; verify by creating a test account this way and completing sign-in as that user
- [x] 3.3 Verify no create/self-signup endpoint is reachable by an unauthenticated client (test against the local instance's API)

## 4. Frontend integration

- [x] 4.1 Add `@pocketbase` (or `pocketbase` JS SDK) as a dependency and a `pocketbaseClient.ts` reading `VITE_POCKETBASE_URL`; verify the app builds with the env var unset (falls back gracefully) and set (connects)
- [x] 4.2 Add an auth context/provider (sign-in form, OTP entry, session persistence) that never gates the existing calendar routes; verify the public calendar renders identically with no session, per `identity` spec's "Public calendar requires no authentication"
- [x] 4.3 Build the Sign Up view (pick a week, free-text attendees, submit/update) against `registrations`; verify against the `beach-week-registration` spec's create and edit-in-place scenarios
- [x] 4.4 Build the Room Assignment view (pick one of the six fixed rooms, assign a known account holder or free-text label, show existing occupants) against `room_assignments`; verify against the `room-assignment` spec's scenarios, including that the room picker offers only the fixed list and that adding to an occupied room is never blocked
- [x] 4.5 Build the per-day Notes view (edit plain text, refetch on window/tab focus) against `notes`; verify against the `beach-week-notes` spec's scenarios, including refresh-on-refocus showing another user's saved edit
- [x] 4.6 Verify end-to-end that a person with no registration for week N is denied access in the UI (not just the API) for both room assignments and notes for week N

## 5. Railway deployment

- [ ] 5.1 Create the Railway project and service for PocketBase with a persistent volume mounted at the data directory and scale-to-zero (sleep on idle) enabled; verify the Admin UI is reachable at the Railway-issued URL after a manual first deploy
- [ ] 5.2 Wake the sleeping service with a cold request and measure the delay; add a loading state to the frontend for the affected auth/data calls if the delay is noticeable
- [ ] 5.3 Configure SMTP env vars on Railway for OTP email delivery; verify a real OTP email is received and completes sign-in against the deployed instance
- [ ] 5.4 Set the frontend's production `VITE_POCKETBASE_URL` to the Railway instance URL; verify a production build talks to the deployed PocketBase instance

## 6. CI/CD via GitHub Actions

- [ ] 6.1 Add a `RAILWAY_TOKEN` repository secret and a GitHub Actions workflow that installs the Railway CLI via `jdx/mise-action` (using the version pinned in `mise.toml`) and deploys the PocketBase service to Railway on push to `main`; verify a push triggers a successful deploy in the Actions log and Railway dashboard
- [ ] 6.2 Verify migrations in `pb_migrations/` are applied automatically on Railway boot after a deploy (inspect the collections in the Admin UI post-deploy) without any manual migration step
- [ ] 6.3 Document the rollback step (redeploy a prior Railway deployment) and confirm it's available from the Railway dashboard

## 7. Cross-cutting verification

- [ ] 7.1 Run through every scenario in `specs/identity/spec.md`, `specs/beach-week-registration/spec.md`, `specs/room-assignment/spec.md`, and `specs/beach-week-notes/spec.md` against the deployed Railway instance and record the result
- [x] 7.2 Confirm the existing public calendar (routes, `beachWeeksService.ts`, pre-computed data) is byte-for-byte unchanged by diffing against `main` before this change — verified: `beachWeeksService.ts`, all calendar components, hooks, and data are byte-identical to `main`; only `App.tsx`/`main.tsx` changed, and purely additively (new auth wiring, zero lines touched in existing calendar logic)

## 8. Migrate planning docs

- [x] 8.1 Confirm every requirement in `.kilo/plans/feature_requests.md` is represented in this change's specs/design/tasks (cross-check line by line); note and resolve any gap before deleting — done during planning; deferred items (OAuth, self-service invites, notifications, rich text, PWA/offline) carried into design.md's Non-Goals rather than dropped
- [x] 8.2 Delete `.kilo/plans/feature_requests.md` and `.kilo/plans/1784433081976-beach-weeks-react-rebuild.md` once 8.1 is confirmed; verify `.kilo/plans/` is empty (or remove it if nothing else lives there) — done during planning; both files and the now-empty `plans/` directory were removed
