# Backlog

## Email notifications on registration
When someone registers for a beach week, notify everyone else already registered for that same week via email.

- Not built into PocketBase — its mail sending only covers auth-flow templates (OTP, password reset, email verification, email-change confirmation, new-location alert).
- Would require a new `pb_hooks` file: a create hook on `registrations` that queries other registrations for the same `beach_week_n` and sends a custom email to each via the existing Resend SMTP relay (already wired up through `RESEND_TOKEN`).
- Net new code, not configuration — no existing hook covers this today.

## Local combined deployment task (frontend + backend) for QA testing

Currently there's no single task that runs frontend and backend together locally — they're two separately-run pieces:
- Backend: `mise run pb:serve` (native PocketBase binary, not Docker, against `pocketbase/pb_data_local/`)
- Frontend: `pnpm dev` from `beach-weeks/`, pointed at the local backend via `VITE_POCKETBASE_URL=http://127.0.0.1:8090` in `.env.local`

For QA testing from a local machine, it'd help to have one task (or `docker-compose.yml`) that:
- Builds/runs the existing `pocketbase/Dockerfile` (currently built only for the Railway deploy target) alongside the frontend dev server or a production-mode frontend build
- Wires `VITE_POCKETBASE_URL` automatically so a QA tester doesn't need to hand-configure `.env.local`
- Ideally mirrors production closely enough (Docker-based backend, not just the native binary) to catch container-specific issues before they reach Railway

Would need: a `docker-compose.yml` (net new — none exists today) or an equivalent `mise` task that starts both pieces together, plus a decision on whether the frontend side runs via `pnpm dev` (fast iteration) or a built/served `dist` (closer to production).

## OAuth sign-in (Google + Apple), alongside OTP

Deferred since the original plan (`.kilo/plans/feature_requests.md`'s Phase 3 polish); PocketBase has built-in OAuth2 support for both providers, so this is real but bounded work — **estimate: half a day to a day of hands-on work**, plus external setup time that isn't really "work," just waiting (Apple Developer Program enrollment/approval in particular can take a day or two if not already enrolled).

**A real design conflict to resolve first, not just an implementation detail:** `identity`'s "Account creation is admin-managed, no self-service" requirement doesn't hold automatically once OAuth is added — PocketBase's default OAuth2 flow auto-creates a `users` record for *anyone* who successfully authenticates with Google/Apple, which is exactly the self-service signup this app deliberately doesn't want. Options:
- Accept OAuth as a second, legitimate self-service path (a policy change to the spec, not just code) — probably wrong for a small family app that wants to control who gets in.
- Add an `onRecordBeforeCreateRequest` hook on `users` that rejects auto-created OAuth signups unless the email is already pre-approved somehow (e.g. an admin-managed allowlist collection) — real net-new code, not configuration, roughly the same shape as the `room_assignments` validation hook this change already removed.

**External setup, not code:**
- Google: OAuth Client ID/Secret from Google Cloud Console, consent screen basics. Can stay in "Testing" mode (no Google review needed) as long as the family's actual emails are added as test users — avoids the verification-review overhead entirely at this scale.
- Apple: needs an active Apple Developer Program membership ($99/yr) if not already enrolled, a Services ID, Sign In with Apple domain/redirect configuration, and a signing key for the client secret JWT. Meaningfully more setup friction than Google, and the only one with a hard dollar cost.

**Code work, once the design question above is settled:**
- Migration change enabling `oauth2` on the `users` collection with both providers' client id/secret read from env vars (same pattern as `RESEND_TOKEN`).
- "Sign in with Google" / "Sign in with Apple" buttons in `SignInForm.tsx` calling `pb.collection('users').authWithOAuth2({ provider: ... })` — the JS SDK handles the popup/redirect flow, and the resulting session slots into the existing `pb.authStore` handling unchanged.
- The pre-approval hook from above, if that's the direction chosen.
- OAuth redirect callbacks need a real HTTPS domain to test against (Apple in particular doesn't play well with `localhost`), so meaningful end-to-end testing has to happen against the deployed Railway/Cloudflare domains, not local dev.

