## Context

See `proposal.md` - Why/What Changes for motivation; this covers how.

Current state:
- `pocketbase/pb_migrations/1788600000_configure_users_auth.js` already locks the `users` collection to admin-only creation (`createRule = null`), disables password auth entirely, and enables OTP. Admin-created, no-real-password accounts are therefore an existing, working procedure today - not something this change introduces.
- `pocketbase/pb_migrations/1788600004_configure_smtp.js` establishes the repo's pattern for secrets in migrations: read via `$os.getenv(...)`, no-op (leave the feature disabled) when unset, so local dev - which sets none of these - degrades gracefully instead of erroring.
- `pocketbase/pb_hooks/` is currently empty.
- `.github/workflows/deploy-pocketbase.yml` already deploys on every push to `main` that touches `pocketbase/**` (which covers both `pb_migrations/` and `pb_hooks/`), via `railway up --service goodtimes-pocketbase`. `pocketbase/Dockerfile` `COPY`s both directories into the image at build time - hooks reach Railway by being baked into the image, not by any runtime copy step. No workflow change is needed for this change; the existing path filter already matches the new files.
- `beach-weeks/src/auth/AuthContext.tsx` exposes `requestOtp`/`confirmOtp` as the only sign-in methods; `SignInForm.tsx` renders the two-step OTP form.
- PocketBase version is pinned at `0.40.2` (`mise.toml`).
- Confirmed against PocketBase's source and docs (not assumed):
  - `requestOTP()` already "doesn't create or send anything" for an email with no matching record - this is PocketBase core anti-enumeration behavior, unrelated to any hook, and already noted in `SignInForm.tsx`'s existing comment.
  - The OAuth2 login handler looks up an existing link by provider identity first, falls back to matching an existing record by verified email, and only creates a new record (from `e.createData`) when neither matches.
  - The `onRecordAuthWithOAuth2Request` hook fires with `e.record` already set to whichever existing record was matched (by prior link or by email), or left `null` when nothing matched.

## Goals / Non-Goals

**Goals:**
- Add Google sign-in without weakening "admin-managed, no self-service" - not even during the moment a first-time OAuth2 login is processed.
- Keep the guard minimal and scoped only to the path that actually needs it.
- Commit no secrets; follow the existing `$os.getenv` migration pattern.
- Give a person who is refused a specific, distinguishable message - not a generic error indistinguishable from a network failure.

**Non-Goals:**
- Multiple email addresses per person (out of scope per proposal).
- A second backup OAuth2 provider (deferred per proposal).
- Any Cloudflare-side change (rejected per proposal).
- A self-service flow for reconciling a mismatched provider email - if someone's Google address doesn't match their roster email, fixing it is an admin action (edit `users.email`, or point them at OTP instead), not something the app resolves automatically.

## Decisions

**D1. The guard hook is scoped to OAuth2 only - not "federated or OTP" as the proposal's wording suggested.**
`requestOTP()` is already structurally incapable of creating a record for an unmatched email; that's core PocketBase behavior, not something a hook adds. The only path that can auto-provision is OAuth2's fallback-to-`createData` branch. So there is exactly one guard, on exactly one hook. This is a wording correction to the proposal's What Changes bullet, not a change in effective behavior - either way, nobody without a pre-existing account can end up with one.

**D2. Implementation: `onRecordAuthWithOAuth2Request`, fail-closed by construction, not by care.**
In a new `pb_hooks/` file, scoped to the `users` collection:
- If `e.record` is `null` (no existing link or email match), throw a distinct, matchable error and do not call `e.next()`. Throwing aborts the hook chain - there is no code path after a thrown error that reaches record creation from `e.createData`. This makes "fail closed" a property of the control flow, not a behavior that has to be gotten right under every input.
- If `e.record` is set, call `e.next()` and let sign-in proceed normally.
- Log the rejected email and timestamp (a plain log line PocketBase already captures) so "did Susan actually try?" is answerable without a dedicated audit collection.

**D3. No account-linking code is needed - it's already PocketBase's built-in behavior.**
Confirmed above: an OAuth2 login with a verified email matching an existing `users` record is auto-linked to that record, with no extra step. The only thing that has to be correct is operational: the email an admin enters in `users.email` when adding someone must be the address that person will actually authenticate with, on whichever method they use first. Get that right once and every method verifying the same email lands on the same account for free.

**D4. Google client credentials follow the existing SMTP secrets pattern.**
The new provider migration reads `$os.getenv("GOOGLE_OAUTH_CLIENT_ID")` / `GOOGLE_OAUTH_CLIENT_SECRET")` and leaves the provider disabled (no-op) when either is unset - mirroring `1788600004_configure_smtp.js` exactly. Local dev sets neither, so it shows only the OTP option, same as it shows no real SMTP today. Nothing Google-related is ever committed to the repo.

**D5. Client-side: the JS SDK's built-in OAuth2 popup flow, not a hand-rolled redirect.**
`pb.collection('users').authWithOAuth2({ provider: 'google' })` handles the popup window, PocketBase's own `/api/oauth2-redirect` page, and code exchange internally, resolving to a signed-in state the same way `confirmOtp` already does. `AuthContext.tsx` gains one method, `signInWithGoogle()`, alongside the existing `requestOtp`/`confirmOtp` - same shape, no new plumbing. It must catch the guard hook's distinct error separately from other failures so `SignInForm.tsx` can show "That address isn't on the list yet - ask an admin to add you" instead of a generic failure message.

**D6. Google Cloud Console consent screen published to Production.**
Carried from the proposal as the concrete external step: publish, don't leave in Testing. Only `email`/`profile`/`openid` scopes are requested, so no verification review applies.

## Risks / Trade-offs

- [Risk] Email mismatch - a person's Google address differs from their `users.email`. Google's own screen succeeds, then the guard refuses them with the same message a stranger gets. → [Mitigation] Ask which address someone will actually sign in with when adding them; the refusal message itself should point at "ask an admin," so the fix path is discoverable without support access to logs.
- [Risk] OTP's anti-enumeration silently no-ops on a typo'd email - pre-existing behavior, not introduced here. An approved person who mistypes gets no code and no error. → [Mitigation] None needed by this change; noting it so it isn't mistaken for a regression once it sits next to Google sign-in and gets compared.
- [Risk] The guard hook is the one new piece of security-critical code. A version that calls `e.next()` unconditionally, or mishandles the null-record case, silently reopens self-service account creation. → [Mitigation] Verifying the null-record path is non-negotiable before shipping. This repo has no backend test framework today (`pb_hooks/` is plain JSVM JS with nothing wired up to run it, unlike the frontend's Vitest suite), and introducing one (e.g. PocketBase's Go `tests` package) is a real, separate side project - not justified by one hook. So the required check is a documented manual verification procedure, not an automated test: attempt sign-in with an unapproved email against a running instance and confirm both refusal and that no `users` record was created. Recorded as its own task in `tasks.md`, not skipped as "covered by tests" when none exist.
- [Trade-off] No linking UI for the mismatch case. Accepted per the proposal's scope decision - flagged here so it reads as deliberate, not missed.

## Migration Plan

- Purely additive: one new `pb_migrations` file (Google provider config, no-op when env vars are unset) and one new `pb_hooks` file (the guard). Neither touches the existing OTP migration.
- The two must ship in the same deploy - the guard without the provider is a no-op; the provider without the guard reopens auto-creation. Not a sequencing concern within a single deploy, but a reason never to land one without the other.
- Rollback: the migration's `down` disables the Google provider again; removing the hook file removes the guard. No existing `users` record changes shape, so there's no data migration in either direction.
- No special ordering for the scale-to-zero Railway service - migrations run and hooks load together on the next cold start after deploy, as they already do today.
- Landing both files in the same PR/commit is sufficient - `deploy-pocketbase.yml`'s existing CI already deploys both together automatically on merge to `main`; there is no separate manual deploy step to remember.

## Open Questions

- Exact wording of the guard's refusal message and what "ask an admin" points to (a name, a mailto, a note) - copy detail, decided when `SignInForm.tsx`'s copy is written.
- Whether a lightweight audit trail beyond a console log line is ever worth adding - deferred until "did they actually try" comes up in practice.
