# Backlog

## Email notifications, bundled with self-service invites
Notify people by email on relevant activity — someone registering for a beach week they're also registered for, a room assignment change, a new response/note on a beach week they're part of, etc. Bundled here with letting existing members invite new people themselves, since both need the same net-new piece: a `pb_hooks`-triggered custom email sent through the existing Resend SMTP relay (`RESEND_TOKEN`), which today only covers PocketBase's own auth-flow templates.

### Activity notifications
- Not built into PocketBase — its mail sending only covers auth-flow templates (OTP, password reset, email verification, email-change confirmation, new-location alert).
- Would require new `pb_hooks` files: a create hook on `registrations` that notifies other registrants for the same `beach_week_n`, plus equivalent hooks for room-assignment changes and new notes/responses — each sends a custom email via the existing Resend SMTP relay (already wired up through `RESEND_TOKEN`).
- Net new code, not configuration — no existing hook covers any of these today.
- Open question: one hook per trigger (registration, room assignment, notes) vs. a shared notification-sending helper they all call — worth deciding once the actual set of triggers is settled, so the email-sending code isn't duplicated three times.

### Self-service invites
Today, granting a new person access means gathering their email by hand and adding it to the Cloudflare Zero Trust allowlist (see the identity/Cloudflare Access item below) — a bottleneck that requires one person to track everyone's email and doesn't scale past a very small, static group.

- Idea: let any signed-in member submit an email to invite. A hook calls the Cloudflare API to append that email to the Zero Trust List (needs a new List-edit-scoped API token as a credential). No separate "accept invite" page is needed — once an email is on the List, that person can sign in directly through Cloudflare Access (Google or email PIN).
- Optionally log invites in a new PocketBase `invites` collection (inviter, invited email, timestamp) for an audit trail of who let whom in.
- Open question to settle before building: should *any* signed-in member be able to invite, or only specific ones? "Anyone can invite" is probably fine at family-app scale, but it's a deliberate narrowing of the `identity` capability's "admin-managed, no self-service" requirement and should be written down as an explicit spec change, not left implicit.
- Net new code: an invite endpoint/hook, the Cloudflare API credential, and (optionally) an email to the invitee sent via the same Resend relay as registration notifications — hence bundling this with the notifications work rather than treating it as fully separate.

## Local combined deployment task (frontend + backend) for QA testing

Currently there's no single task that runs frontend and backend together locally — they're two separately-run pieces:
- Backend: `mise run pb:serve` (native PocketBase binary, not Docker, against `pocketbase/pb_data_local/`)
- Frontend: `pnpm dev` from `beach-weeks/`, pointed at the local backend via `VITE_POCKETBASE_URL=http://127.0.0.1:8090` in `.env.local`

For QA testing from a local machine, it'd help to have one task (or `docker-compose.yml`) that:
- Builds/runs the existing `pocketbase/Dockerfile` (currently built only for the Railway deploy target) alongside the frontend dev server or a production-mode frontend build
- Wires `VITE_POCKETBASE_URL` automatically so a QA tester doesn't need to hand-configure `.env.local`
- Ideally mirrors production closely enough (Docker-based backend, not just the native binary) to catch container-specific issues before they reach Railway

Would need: a `docker-compose.yml` (net new — none exists today) or an equivalent `mise` task that starts both pieces together, plus a decision on whether the frontend side runs via `pnpm dev` (fast iteration) or a built/served `dist` (closer to production).

## Identity via Cloudflare Access (replaces the Google + Apple OAuth plan)

Supersedes the original "OAuth sign-in (Google + Apple), alongside OTP" idea from the plan (`.kilo/plans/feature_requests.md`'s Phase 3 polish) — see `openspec/changes/refine-oauth-sign-in/` for the full proposal. Decision: **route all authentication through Cloudflare Zero Trust Access**, placed in front of both the frontend and API hostnames, instead of adding OAuth2 providers to PocketBase directly.

- **Login methods:** Google and Access's built-in email **one-time PIN** (reproduces today's passwordless flow, now handled at Cloudflare's edge instead of via PocketBase + Resend/SMTP). More providers — e.g. the Pocket ID instance already running at `id.huskytown.net` — can be added later purely via Cloudflare dashboard config, no app code change needed.
- **Apple dropped entirely** — its only justification was parity with Google, which doesn't outweigh the $99/yr Apple Developer Program membership and the extra setup friction (Services ID, domain/redirect config, signing key) it alone required.
- **Fixes the design conflict the original plan flagged:** `identity`'s "Account creation is admin-managed, no self-service" requirement used to break the moment any OAuth provider auto-created a `users` record for anyone who authenticated. Now the allowlist is a Cloudflare Zero Trust **List** (type: email), referenced by both Access Applications' policies — nobody reaches PocketBase's auto-provisioning at all unless their email is already on the List, so no PocketBase-side allowlist hook is needed.
- **PocketBase's role narrows to one bridge**, regardless of how many login methods Cloudflare offers upstream: verify the incoming Cloudflare Access JWT (against Cloudflare's published JWKS) and map the verified email onto a `users` record, creating one on first sign-in if none exists.
- **Retires** PocketBase's native OTP sign-in and its use of the Resend/SMTP wiring for auth emails (the Resend relay itself stays — it's reused for the activity-notification and invite emails above).
- **Considered and rejected:** Cloudflare Access's [External Evaluation](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/external-evaluation/) policy rule, which could let PocketBase's own `users` collection be the allowlist source directly. Rejected because it would put every sign-in on PocketBase's critical path (PocketBase is a scale-to-zero Railway service — a cold instance would add latency/timeout risk to the access decision itself) and requires implementing Cloudflare's request-signature verification, which is exactly the kind of custom auth code this change is trying to eliminate.

**External setup, not code:**
- Cloudflare Zero Trust: create two Access Applications (frontend and API hostnames in the `huskytown.net` zone), enable the Google and one-time-PIN login methods, create one Zero Trust email List with the family's addresses, and reference it in both Applications' policies.
- Google: OAuth Client ID/Secret from Google Cloud Console, consent screen basics. Can stay in "Testing" mode (no Google review needed) as long as the family's actual emails are added as test users.

**Code work:**
- A `pb_hooks` bridge that verifies the Cloudflare Access JWT and maps/auto-provisions the `users` record.
- Remove PocketBase's native OTP config and `SignInForm.tsx`'s OTP input UI, replacing it with a redirect into the Cloudflare Access-gated flow.
- Needs a real domain under Cloudflare's proxy to test against — Access doesn't gate `localhost` — so meaningful end-to-end testing happens against the deployed Railway/Cloudflare domains, not local dev.

