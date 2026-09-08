# Backlog

## Email notifications, bundled with self-service invites
Notify people by email on relevant activity — someone registering for a beach week they're also registered for, a room assignment change, a new response/note on a beach week they're part of, etc. Bundled here with letting existing members invite new people themselves, since both need the same net-new piece: a `pb_hooks`-triggered custom email sent through the existing Resend SMTP relay (`RESEND_TOKEN`), which today only covers PocketBase's own auth-flow templates.

### Activity notifications
- Not built into PocketBase — its mail sending only covers auth-flow templates (OTP, password reset, email verification, email-change confirmation, new-location alert).
- Would require new `pb_hooks` files: a create hook on `registrations` that notifies other registrants for the same `beach_week_n`, plus equivalent hooks for room-assignment changes and new notes/responses — each sends a custom email via the existing Resend SMTP relay (already wired up through `RESEND_TOKEN`).
- Net new code, not configuration — no existing hook covers any of these today.
- Open question: one hook per trigger (registration, room assignment, notes) vs. a shared notification-sending helper they all call — worth deciding once the actual set of triggers is settled, so the email-sending code isn't duplicated three times.

### Self-service invites
Today, granting a new person access means gathering their email by hand and adding it as a `users` record (see `openspec/changes/refine-oauth-sign-in/` — the roster is admin-managed directly in PocketBase, not a Cloudflare allowlist) — a bottleneck that requires one person to track everyone's email and doesn't scale past a very small, static group.

- Idea: let any signed-in member submit an email to invite. Since the roster lives in PocketBase's own `users` collection, this is a plain record create — no external API call or credential needed, unlike the Cloudflare-Access-allowlist version of this idea considered earlier.
- Optionally log invites in a new PocketBase `invites` collection (inviter, invited email, timestamp) for an audit trail of who let whom in.
- Open question to settle before building: should *any* signed-in member be able to invite, or only specific ones? "Anyone can invite" is probably fine at family-app scale, but it's a deliberate narrowing of the `identity` capability's "admin-managed, no self-service" requirement and should be written down as an explicit spec change, not left implicit.
- Net new code: an invite endpoint/hook that creates the `users` record directly. This is a separate mechanism from `refine-oauth-sign-in`'s create-account guard hook, which only blocks unapproved *login-time* auto-provisioning — an invite is exactly how someone gets added to the approved set in the first place. Also, optionally, an email to the invitee sent via the same Resend relay as registration notifications — hence bundling this with the notifications work rather than treating it as fully separate.

## Local combined deployment task (frontend + backend) for QA testing

Currently there's no single task that runs frontend and backend together locally — they're two separately-run pieces:
- Backend: `mise run pb:serve` (native PocketBase binary, not Docker, against `pocketbase/pb_data_local/`)
- Frontend: `pnpm dev` from `beach-weeks/`, pointed at the local backend via `VITE_POCKETBASE_URL=http://127.0.0.1:8090` in `.env.local`

For QA testing from a local machine, it'd help to have one task (or `docker-compose.yml`) that:
- Builds/runs the existing `pocketbase/Dockerfile` (currently built only for the Railway deploy target) alongside the frontend dev server or a production-mode frontend build
- Wires `VITE_POCKETBASE_URL` automatically so a QA tester doesn't need to hand-configure `.env.local`
- Ideally mirrors production closely enough (Docker-based backend, not just the native binary) to catch container-specific issues before they reach Railway

Would need: a `docker-compose.yml` (net new — none exists today) or an equivalent `mise` task that starts both pieces together, plus a decision on whether the frontend side runs via `pnpm dev` (fast iteration) or a built/served `dist` (closer to production).

## Identity via Google + OTP (replaces the original Google + Apple OAuth plan)

Supersedes the original "OAuth sign-in (Google + Apple), alongside OTP" idea from the plan (`.kilo/plans/feature_requests.md`'s Phase 3 polish). Full decision, rationale, and rejected alternatives (including Cloudflare Zero Trust Access, which was considered and rejected) live in `openspec/changes/refine-oauth-sign-in/` — see `proposal.md` for the why/what and `design.md` for the how.

## Secrets management via fnox (homelab-wide, not just this app)

Every secret in this repo currently lives in exactly one place with no shared tooling across it: `RESEND_TOKEN` and the OAuth client credentials (once added, see `openspec/changes/refine-oauth-sign-in/`) sit only in Railway's dashboard env vars; `PROD_ADMIN_USER`/`PROD_ADMIN_PASS` sit only in `mise.local.toml` (gitignored). Nothing keeps these recoverable from, or in sync with, a single canonical source. `fnox` — already installed locally and already used for secret management in other homelab projects — would give this app the same encrypted, git-trackable source of truth the rest of the homelab already uses, instead of a bespoke pattern unique to this repo.

- Doesn't need a native Railway backend to work: the practical integration is wrapping the process's start command (`fnox exec -- pocketbase serve ...`), with only fnox's own backend credential (e.g. a 1Password service token) set as the Railway env var. Rotating a real secret then means updating it once in the vault — visible everywhere — instead of re-pasting it into Railway's dashboard per secret per environment.
- **New risk that wrapping introduces, specific to this app:** PocketBase already scales to zero on Railway, so every cold start would additionally depend on reaching the fnox backend before PocketBase can even boot. That's the same shape of concern that ruled out Cloudflare Access's External Evaluation option for identity (see `openspec/changes/refine-oauth-sign-in/proposal.md`) — an external dependency on a cold-starting service's critical path; a vault outage at the wrong moment would mean the app is fully down, not just slow.
- Would make the most sense as one deliberate migration of *all* of this repo's secrets (`RESEND_TOKEN`, `PROD_ADMIN_USER`/`PASS`, and the Google OAuth credentials) at once, not adopted for just the newest one — mixing "some secrets via fnox, some via plain env vars" in one small repo is worse than either pattern alone.
- **Decided trigger: adopt when a second deployment environment shows up (a dev/preview Railway service alongside prod), not before.** With one environment there's nothing to keep in sync, so the single-source-of-truth benefit is minimal while the boot-time vault dependency is a pure added risk. Each additional environment multiplies the manual-sync burden fnox would remove (N environments × secrets, pasted by hand) without changing the boot-time risk — so the case gets stronger exactly when it's actually needed, rather than being adopted speculatively now. fnox's per-environment profile support fits this directly once it applies.
- **Revisit the deployment method itself at that same trigger point, not separately.** `mise run pb:deploy` (see `mise.toml`) and `.github/workflows/deploy-pocketbase.yml` currently both assume exactly one Railway service: the task hardcodes `--service goodtimes-pocketbase`, sets a single `PB_VERSION` service variable before every deploy, and the workflow only triggers on push to `main`. A second environment breaks those assumptions directly - which service a deploy targets stops being a constant, and a preview environment needs its own trigger (e.g. on PR) distinct from prod's. Redesigning deploy targeting and adopting fnox are the same moment, not two - doing them as one pass avoids reshaping the deploy scripts twice.

