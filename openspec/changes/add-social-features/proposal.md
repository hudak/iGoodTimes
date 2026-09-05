## Why

The beach-week calendar is currently a 100% static, public, read-only React app. The Gast family (~10-30 people) has no way to coordinate who's attending a given week, who's staying in which room, or leave day-to-day notes — that coordination happens outside the app today. `.kilo/plans/feature_requests.md` sketched this out already (accounts, sign-up, room assignment, notes on Supabase); this change migrates that plan into OpenSpec and reopens the platform choice, since the original "not Cloudflare Workers, not Railway" reasoning is out of date.

## What Changes

- Add admin-managed accounts (no self-service signup) and passwordless sign-in, layered on top of the app without gating the public calendar.
- Add a self-service "Sign Up" flow: an authenticated person picks a beach week and lists attendees as free text (kids/guests are never formal records).
- Add Room Assignment: pick one of the house's fixed rooms (Downstairs Primary, "Old People" Room, Upstairs Primary, Bunk Beds, Upstairs Front Room, Media Room), occupant is a known account holder or a free-text label; purely informational, no capacity limits or locking.
- Add per-day Notes (plain text) for a beach week, edited by anyone who signed up for that week; refresh-on-focus is sufficient, no real-time sync required.
- Access rule for the three features above: a person may view/edit a week's registration, room assignments, and notes only if they have a registration for that week.
- **Platform decision (confirmed)**: the original plan assumed Supabase by default and dismissed Cloudflare Workers and Railway. Updated research (see below) says that dismissal is now partly outdated. **Decision: PocketBase, self-hosted on Railway**, deployed via GitHub Actions, with a local (Docker or native binary) development option. Full deployment design is in `design.md`.
- No changes to the existing public, unauthenticated calendar view (`beachWeeksService.ts` and the pre-computed data stay untouched).

### Platform decision — confirmed

Re-evaluated against the actual requirements (small trusted user base, per-record access rules keyed on "did this person register for this week," low write volume, no real-time requirement, low budget tolerance):

| Option | Auth | Access-control fit | Cost at this scale | Verdict |
|---|---|---|---|---|
| **Supabase** (original plan's baseline) | Built-in magic link | Postgres RLS maps directly onto the "registered for this week" rule | Free tier, but auto-pauses after 7 days idle (cron-ping or $25/mo Pro avoids it) | Still viable, but the idle-pause is a real annoyance for a low-traffic family app |
| **PocketBase, self-hosted on Railway** | Built-in (email/password, OAuth, and one-time-code/OTP login) | Per-collection "API rules" — a genuine RLS-equivalent, same shape as the rule above | Railway service with **scale-to-zero (sleep on idle)** enabled — near-$0 given how infrequently this app is used, no forced 7-day pause like Supabase's free tier | **Chosen** — closest to Supabase's "configure, not code" model, satisfies "runs on Railway," and scale-to-zero fits the usage pattern better than any always-on tier |
| **Cloudflare Workers + D1 + Better Auth** | Better Auth now has first-class Workers/D1 support (Lucia, the old recommendation, is deprecated) | D1 has **no RLS equivalent** — every "only if registered for this week" check is hand-written in Worker route code | Likely $0 (generous free tier as of this research) | Viable, but trades "no server to run" for hand-rolled authorization logic on every gated route |
| Railway with a hand-built Node/Postgres/Auth.js stack | Nothing built-in, fully custom | Hand-written, same as above | Railway lost its free tier; $10-15/mo minimum | Not recommended — most custom code, costs more than the alternatives, and is essentially rebuilding what Supabase/PocketBase already provide |

**Decision:** PocketBase self-hosted on Railway, with scale-to-zero enabled. It's the only option that gives a real per-record access-control primitive (matching the "registered_by = current_person for this week" rule) *and* satisfies the ask to move off Supabase onto Railway or Cloudflare Workers, without taking on Cloudflare Workers' hand-rolled-authorization tradeoff — and scale-to-zero keeps cost minimal for a low-traffic family app without Supabase's forced pause behavior. The trade-off is a cold-start delay on the first request after idle; see `design.md` for the mitigation. Full schema, API-rule design, auth flow, Railway deployment (via GitHub Actions), and local development setup are detailed in `design.md`.

## Capabilities

### New Capabilities
- `identity`: admin-invited accounts and passwordless sign-in, additive to the existing public app (no gating of the public calendar).
- `beach-week-registration`: the sign-up flow (free-text attendees) that also serves as the access gate for a given week.
- `room-assignment`: free-text, unenforced room assignment for a beach week, gated by registration.
- `beach-week-notes`: per-day plain-text notes for a beach week, gated by registration.

### Modified Capabilities
(none — the existing public calendar's behavior is unchanged; it has no OpenSpec capability defined yet and is out of scope for this change)

## Impact

- **New backend dependency**: introduces a persistence + auth layer where none existed (currently 100% static/client-side) — PocketBase, self-hosted on Railway. Full setup in design.md.
- **Frontend**: new auth context/provider, new routes/UI for sign-up, room assignment, and notes — additive only; no changes to existing calendar components or `beachWeeksService.ts`.
- **Ops**: new hosted service to provision and pay for, with scale-to-zero enabled to keep cost near-$0 given low traffic; deployment via GitHub Actions on merge to main; a local development option (Docker or native binary) for working on backend-dependent features without touching the hosted instance. Admin must be able to invite/manage accounts via the PocketBase admin UI.
- **Source migration**: `.kilo/plans/feature_requests.md` and `.kilo/plans/1784433081976-beach-weeks-react-rebuild.md` were superseded by this OpenSpec change and its specs; both files have been deleted along with the now-empty `.kilo/plans/` directory.
