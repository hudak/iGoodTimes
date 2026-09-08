## 1. Google Cloud setup (external, no code)

- [ ] 1.1 Create an OAuth 2.0 Client ID in Google Cloud Console for this app, requesting only the `email`, `profile`, and `openid` scopes, and verify the client ID/secret are generated.
- [ ] 1.2 Publish the OAuth consent screen to **Production** (per design.md D6 — not Testing, which would require every family member to be added as a Google Cloud test user) and verify the consent screen's publishing status shows "In production."
- [ ] 1.3 Set `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` as env vars on the Railway PocketBase service only (never committed, never set in local `mise.local.toml` — local dev is meant to stay OTP-only) and verify they appear in Railway's service variables.

## 2. PocketBase: Google provider config

- [ ] 2.1 Add a new `pb_migrations` file enabling the Google OAuth2 provider on the `users` collection, reading `GOOGLE_OAUTH_CLIENT_ID`/`GOOGLE_OAUTH_CLIENT_SECRET` via `$os.getenv(...)` and no-op'ing (provider left disabled) when either is unset — mirror `1788600004_configure_smtp.js`'s shape exactly (design.md D4). Verify: running `mise run pb:serve` locally (no env vars set) shows the `users` collection's OAuth2 settings with Google still disabled.
- [ ] 2.2 Add the migration's `down()` disabling the provider again. Verify: running the migration down locally reverts the collection to its prior state with no errors.
- [ ] 2.3 With the Production client ID/secret exported temporarily in a local shell, verify the same migration enables Google correctly (admin UI shows the provider configured) — then unset them again so local dev defaults back to OTP-only.

## 3. PocketBase: fail-closed guard hook

- [ ] 3.1 Add a new `pb_hooks` file registering `onRecordAuthWithOAuth2Request`, scoped to the `users` collection (design.md D1/D2): if `e.record` is `null`, throw a distinct, matchable error and do not call `e.next()`; if `e.record` is set, call `e.next()`. Verify: the hook file loads without error under `mise run pb:serve --dev`.
- [ ] 3.2 Add a log line in the rejection branch recording the attempted email and timestamp (design.md D2). Verify: triggering the rejection path (task 4.1) shows the log line in the `pb:serve` console output.
- [ ] 3.3 **Manual verification of the fail-closed path** (no automated backend test framework exists in this repo yet — see design.md's Risks/Trade-offs for why this is a documented procedure rather than an automated test): with the Production Google client wired up, attempt to sign in via Google using an email address with **no** matching `users` record. Verify: sign-in is refused with the hook's distinct error, and the `users` record count is unchanged before and after the attempt (check via `mise run pb:admin -- GET /collections/users/records`).
- [ ] 3.4 **Manual verification of the matched path**: create a `users` record for a test email (admin action), then sign in via Google using that same email. Verify: sign-in succeeds, exactly one `users` record exists for that email (no duplicate created), and the record is now linked to the Google identity.

## 4. Frontend: Google sign-in

- [ ] 4.1 Add `signInWithGoogle()` to `AuthContext.tsx`, calling `pb.collection('users').authWithOAuth2({ provider: 'google' })`, alongside the existing `requestOtp`/`confirmOtp` (design.md D5). Verify: `pnpm build` (tsc) passes with no type errors.
- [ ] 4.2 Catch the guard hook's distinct rejection error in `signInWithGoogle()` (or its caller) separately from other failures, and surface a specific "not approved" state to the UI rather than a generic error (design.md D5, Non-Goals). Verify: a component-level check (manual or test) confirms the specific state is reachable and distinguishable from a network-error state.
- [ ] 4.3 Add a Google sign-in button to `SignInForm.tsx` alongside the existing email-code form, and write the refusal-message copy for the "not approved" state — settling design.md's open question of what "ask an admin" points to (e.g. a name or contact note). Verify: `pnpm lint` and `pnpm test` pass; a manual click-through in `pnpm dev` shows both sign-in options and the refusal message renders correctly for an unapproved test account.

## 5. Rollout

- [ ] 5.1 Merge the migration (task 2.1) and the guard hook (task 3.1) to `main` in the same PR — `deploy-pocketbase.yml`'s existing CI already deploys everything under `pocketbase/**` together automatically on merge (Dockerfile `COPY`s both directories into the image; no manual `railway up` or workflow change needed). design.md's Migration Plan is explicit that neither should ship without the other (the guard alone is a no-op; the provider alone reopens auto-creation) — landing them in one PR is what guarantees that. Verify: the Actions run for this PR's merge commit succeeds, and its logs show the build picking up both the new migration and hook files.
- [ ] 5.2 End-to-end regression check against the deployed environment: an existing account holder still signs in via the one-time email code exactly as before (identity spec's unchanged "Returning account holder signs in" scenario). Verify: sign-in via OTP succeeds with no observable change in behavior.
- [ ] 5.3 End-to-end check against the deployed environment: an approved account holder signs in via Google for the first time and lands signed in (identity spec's new "Returning account holder signs in with a federated provider" scenario). Verify: sign-in succeeds and the header shows the signed-in state.
