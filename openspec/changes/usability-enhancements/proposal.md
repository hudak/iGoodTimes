## Why

Three frictions, one theme: the app works, but everyday coordination takes more effort than it should. Signing in means copying a one-time code out of an email, the per-day coordination that matters most (who's at the house on which days, and meals) has nowhere to live, and adding someone to the roster bottlenecks on one administrator. Most people read email on the same device they'd use the app, so the same email can do more of the work without adding a new authentication mechanism.

## What Changes

- **Core principle: free-text boards — one shared, freely-editable text field per key, no per-person or per-item records.** This is visible throughout the week panel (rooms are a single shared text per room). A "manager" writing *"me, 3 kids, my parents, arriving Wed"* into one box is the central example; kids and other guests are usually names in that text rather than separate accounts. The content is intentionally not queryable (you can't programmatically count heads). Future requests to layer structure on top should be evaluated against this principle.
- **Generalize `beach-week-notes` into one board concept with three faces.** Today `beach-week-notes` already *is* a per-day shared free-text board for a week; the new proposal generalizes that shape instead of duplicating it. The result is a `beach-week-boards` capability with three boards selectable in the week panel:
  - **Day Plans** (existing — renamed from `notes`),
  - **Who's Going** (new — working title; "Who's Here" was considered as the short runner-up because the existing **"I'm going" check-in** for the whole week and a "Who's Going" *tab* for per-day free text share a phrase, even though the underlying things are different),
  - **Meals** (new).
  Each board is per-day free text, visible and editable by anyone registered for that week — the same rule and refresh-on-focus behavior as Day Plans today. `room-assignment` stays a separate capability (different key space — a fixed room list rather than dates), and `beach-week-registration`'s wording that the registration gate "is the sole gate for rooms and notes" is widened to "rooms and boards."
- **Invite-based account creation, replacing the current admin-only model.** **BREAKING**: the `identity` requirement that "new accounts may only be created by an admin action" is expanded so that any signed-in member may add someone by entering their email in an invite form. The invariant that **signing in never creates an account** is unchanged — an invite is an explicit, authenticated action distinct from sign-in, and the OAuth2 fail-closed guard from `refine-oauth-sign-in` is untouched. Implemented as a small authenticated endpoint/hook (a `POST /api/goodtimes/invite`-style invitation path, for example), with email validation/normalization, duplicate detection, an `invitedBy` audit record, and rate-limiting. The `users.createRule` remains least-privilege (`null`); clients never directly create `users` records.
- **Quick-login links.** The signed-in user story splits cleanly into two deliverables: first, **making the invite email frictionless**, and second, **making everyday OTP sign-in frictionless.**
  - **Quick-login link for everyday sign-in.** The `users` OTP email gains a sign-in link (carrying the issued OTP id and code — PocketBase exposes both to the template as `{OTP_ID}` and `{OTP}`) alongside the existing code. A new frontend route reads the link, shows a one-tap confirmation (mail providers and security scanners prefetch links, and an auto-submitting page would let them silently burn a single-use code), and then completes the existing OTP sign-in, stripping the parameters from the address bar after. The typed-code path stays. The code now also travels in a URL (email body → browser history/referrers), mitigated by single-use enforcement, short expiry, and the confirm step — an intentional trade-off accepted over a separate token mechanism.
  - **Invite email with that same link, plus Google-first onboarding.** The invite sent by the hook delivers a one-tap path with a plain-link fallback:
    - The email contains the quick-login link for that invitee (the hook mints the OTP in the same step), prefilled to that email address.
    - The same email highlights **Continue with Google** as the first option when the invitee's Google address matches their roster email — one tap, no code at all.
    - A separate fallback line is a plain invite ("You've been added — sign in here") so onboarding doesn't depend on the short-lived link.
  - **Header invite UX.** A signed-in member taps an Invite button in the app header (week panel is week-scoped, so this is account-level); a modal opens with an email field. States: success, already on the list, could not send.
  - **Pragmatism note.** The underlying OTP is 180 seconds long — ideal for "I'm on the sign-in page, email me a link" and marginal for an invite that sits in an inbox. The plain-link + Google-first combination is the "prefill email / don't auto-send on GET" posture on the everyday side, and "plain app link + prefilled quick-login" on the invite side, with an explicit POST-or-tap that sends the OTP rather than firing on link prefetch.
- **Update `meta.appURL`.** It is still PocketBase's default `http://localhost:8090` in production, so any `{APP_URL}`-based link would be wrong. Set it to the real frontend.

## Capabilities

### New Capabilities
<!-- None. This change generalizes `beach-week-notes` into `beach-week-boards` and relaxes `identity`. -->

### Modified Capabilities
- `beach-week-boards`: renamed from `beach-week-notes`; Day Plans, plus "Who's Going" and Meals, as per-day shared boards behind the registration gate; the free-text-board principle stated explicitly.
- `identity`: "Passwordless sign-in" gains a quick-login link (one-tap confirmation) as an alternative to typing the one-time code; "Account creation is admin-managed" is replaced by invite-based creation reachable from the header by any signed-in member, with controlled fields, `invitedBy` audit, and rate limiting; the guarantee that signing in never creates an account is unchanged.
- `beach-week-registration`: the access-gate requirement's wording widens from "rooms and notes" to "rooms, boards, and all per-day shared boards."

## Impact

- **PocketBase** — migrations customizing the `users` OTP email template and setting `meta.appURL`; a new `day_boards` collection (or rename) with indexed `(beach_week_n, board, date)`, one shared text per `(week, board, day)`, behind the existing registration gate; and an invite path (endpoint/hook plus collection rules) for creating accounts. The conflict with the current "no self-service, admin-managed" model is intentional and is the breaking part of this change. The OAuth2 fail-closed guard from `refine-oauth-sign-in` is untouched — it only blocks account creation *via sign-in*, which remains true.
- **Frontend** — a quick-login route reusing `confirmOtp`, an invite modal in the header, and a parameterized board component replacing `Notes`/`RoomAssignments` duplication where applicable; no new auth primitive.
- **Security posture** — two deliberate broadenings. The one-time code now also travels in a URL (email body → browser history/referrers), mitigated as described. Account creation moves from admin-only to any signed-in person, mitigated by requiring an authenticated actor, recording `invitedBy`, and rate-limiting. Both are intentional; the invariant that nobody gains access without an existing account is preserved.
- **Config** — `meta.appURL` must be set per environment (Railway). Stray `pocketbase/pb_migrations/Notes from Meggie.md` is included in this proposal's scope and should be removed or moved out of the migrations directory.
