## Why

`Backlog.md`'s OAuth sign-in item bundles Google and Apple together, but Apple Sign In requires an active paid Apple Developer Program membership ($99/yr) plus meaningfully more setup friction than Google — a real dollar cost and admin overhead nobody has decided is worth it for a small family app. Separately, that same backlog item already flags a real design conflict that was never resolved: `identity`'s "Account creation is admin-managed, no self-service" requirement doesn't hold once any OAuth provider is added, because PocketBase's default OAuth2 flow auto-creates a `users` record for anyone who authenticates successfully. Routing all sign-in through Cloudflare Zero Trust Access as a single front door resolves both problems in one architectural move: Apple is dropped without needing a replacement "second provider" inside PocketBase, and the self-service tension is resolved by making Cloudflare's own allowlist — not a PocketBase hook — the pre-approval gate, checked before a request ever reaches the app.

## What Changes

- Route all authentication through **Cloudflare Zero Trust Access**, placed in front of both the frontend and API hostnames, replacing PocketBase's native OTP sign-in entirely. PocketBase never gains its own per-provider OAuth2 configuration.
- Enable **Google** and Access's built-in **One-Time PIN** (email code) as the initial login methods — PIN reproduces today's passwordless email flow, now handled at Cloudflare's edge instead of via PocketBase + Resend/SMTP.
- Treat additional providers (Pocket ID via generic OIDC, or others) as login methods addable later purely through Cloudflare dashboard configuration — no application code change required to add one.
- Drop Apple entirely; its only justification (parity with Google) doesn't outweigh the recurring dollar cost and setup friction for this app.
- Enforce the family allowlist with a Cloudflare Zero Trust **List** (type: email), referenced by both Access Applications' policies — this replaces the PocketBase `onRecordBeforeCreateRequest` pre-approval hook idea from the original backlog entry, and is the actual resolution to the self-service conflict: nobody reaches PocketBase's auto-provisioning at all unless their email is already on the List.
- PocketBase's role narrows to one integration regardless of how many login methods Cloudflare offers upstream: verify the Cloudflare Access-issued JWT (against Cloudflare's published JWKS) on incoming requests, and map the verified email onto a `users` record — creating one on first sign-in if none exists yet.
- **Considered and rejected for now:** Cloudflare Access's [External Evaluation](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/external-evaluation/) policy rule, which would let an external endpoint (potentially backed by PocketBase's own `users` collection, making PocketBase the single holder of the allowlist) decide access per request. Rejected because it would put every sign-in on PocketBase's critical path — PocketBase runs as a scale-to-zero Railway service, so a cold instance would add latency or risk timeouts to the access decision itself, not just to app data calls — and because implementing Cloudflare's request-signature verification reintroduces exactly the kind of custom auth code this change is trying to eliminate. The Zero Trust List keeps the allow/deny decision entirely at Cloudflare's edge, independent of PocketBase's availability.

## Capabilities

### New Capabilities
(none — this refines an existing capability's requirements)

### Modified Capabilities
- `identity`: the "Account creation is admin-managed, no self-service" requirement needs an explicit carve-out for Cloudflare Access-authenticated accounts, and the deferred "OAuth sign-in (Google + Apple)" backlog item is replaced with a requirement scoped to sign-in via Cloudflare Access (Google and email one-time-PIN as initial login methods, more addable later without code changes), with pre-approval enforced by a Cloudflare Zero Trust email List rather than an in-app allowlist hook.

## Impact

- `Backlog.md`'s OAuth sign-in entry (updated to reflect this refined requirement).
- Future implementation (not part of this change): two Cloudflare Access Applications (frontend and API hostnames in the `huskytown.net` zone) sharing one Zero Trust email List; a `pb_hooks` bridge in PocketBase that verifies the Access JWT and auto-provisions/maps the `users` record; retirement of the OTP/SMTP (Resend) wiring described in `add-social-features`'s design.md; `SignInForm.tsx` simplifying to a Cloudflare Access redirect instead of juggling provider buttons or OTP input.
- No code changes in this change — planning and requirement refinement only.
