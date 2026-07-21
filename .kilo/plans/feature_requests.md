# Beach Weeks App - Feature Implementation Plan

## Overview
Iterative rollout on top of the React rebuild: admin-managed accounts, a self-service "Sign Up" flow (free-text attendee list + optional free-text room assignment), and simple day-by-day notes. Designed for Gast family members only (10-30 people). Kids and guests without accounts are never modeled as formal records — they're just text.

**Core principle: the public calendar never requires login.** Auth and the new features (sign up, room assignment, notes) are additive layers on top of the existing static React app.

## Access Model (Simple, No Roles)

- **No admin/member roles for app features.** The only "admin" action is account creation, handled outside the app via the Supabase dashboard (see Authentication Approach). Everything else — signing up, assigning rooms, editing notes — is available to any authenticated person.
- **Signing up is the permission gate.** You have access to view/edit a beach week's room assignments and notes if you submitted a sign-up for that week.
- **Kids and guests without accounts are just text.** They never need their own login or their own access grant — whoever signs up (a real account holder) lists them as free text and retains access on their behalf. No formal dependent records.
- **Public calendar unaffected.** The pre-computed beach week calendar (dates, countdown, search) remains fully public — no sign-in required to view it.

### Concrete access rule
A person has view/edit access to plans for `beach_week_n` if:
```
EXISTS registration WHERE beach_week_n = X
  AND registration.registered_by = current_person
```
In plain terms: you have access to a week if you signed up for it.

## Platform Decision: Supabase

**Why Supabase:**
- Built-in auth: magic links (passwordless) as primary; OAuth available if wanted later
- PostgreSQL for relational data (people, registrations, notes)
- Free tier sufficient for a family app (500MB DB, 2GB bandwidth)
- Single platform, minimal ops burden; standard Postgres avoids lock-in

**Why not Cloudflare Workers:** No built-in per-user identity model (Access protects apps, not user data); would need to build auth and account logic from scratch; D1 is less mature than Postgres.

**Why not Railway:** More expensive, requires custom auth implementation, more infra to manage for no added benefit at this scale.

## Data Model

### People
Real account holders only — no managed/dependent records.
```sql
people (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) not null,
  email text unique not null,
  name text not null,
  created_at timestamp default now()
)
```
- A `people` row is created automatically via a `security definer` Postgres trigger when a new `auth.users` row is inserted (i.e., when someone accepts a dashboard invite) — no application code needed for this step, and no client-side insert policy is needed either (only the trigger writes to this table).

### Beach Week Registrations (Sign Ups)
One row per account holder per week. The permission gate. Attendees (including kids/guests without accounts) are captured as free text.
```sql
beach_week_registrations (
  id uuid primary key default gen_random_uuid(),
  beach_week_n int not null,                          -- references pre-computed beach weeks
  registered_by uuid references people(id) not null,
  attendees text not null,                             -- free text, e.g. "Mike & Sarah + kids Emma and Jack"
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(beach_week_n, registered_by)                  -- one sign-up per account holder per week; edit in place
)
```

### Room Assignments
Purely organizational — no rooms table, no capacity, no locks. Room name is free text; occupant is either a known account holder or free text.
```sql
room_assignments (
  id uuid primary key default gen_random_uuid(),
  beach_week_n int not null,
  room_name text not null,             -- free text, e.g. "Master Bedroom" (autocomplete from prior entries in the UI, not enforced)
  person_id uuid references people(id),  -- set if occupant has an account
  label text,                            -- set if occupant has no account, e.g. "Lauren's Kids"
  added_by uuid references people(id) not null,
  created_at timestamp default now(),
  check (person_id is not null or label is not null)
)
```
No unique constraints, no capacity enforcement. "Who's already in this room" is just: query existing `room_assignments` for that `beach_week_n` grouped by `room_name`, shown for coordination — adding more people to an already-listed room is never blocked.

### Notes
Simple per-day text, no real-time sync.
```sql
notes (
  id uuid primary key default gen_random_uuid(),
  beach_week_n int not null,
  date date not null,
  content text not null default '',
  created_by uuid references people(id),
  updated_by uuid references people(id),
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(beach_week_n, date)
)
```

## Authentication Approach

**Account creation: Supabase dashboard invite (admin-managed, zero code).**
- New accounts are created via Supabase Dashboard → Authentication → Users → "Invite user." Supabase generates the magic link and sends the email — no custom token/email infrastructure.
- Confirmed: invites are an admin action (whoever manages the Supabase project), not self-service by any family member. Fine for a small family where onboarding is rare.
- On accept, a trigger auto-creates the matching `people` row.

**Sign-in: Magic links (passwordless email)** for anyone with an account. OAuth (Google/Apple) deferred to Phase 3 polish.

**Sign Up flow (one form, covers attendance and room assignment):**
1. Authenticated person picks a beach week
2. Types free text for who's coming (themselves plus anyone else — kids, guests, other family members with or without their own accounts)
3. Submits — creates or updates their `beach_week_registrations` row for that week (upsert on `(beach_week_n, registered_by)`), which grants them access to that week's room assignments and notes
4. Optionally, in the same or a follow-up step, assigns people/labels to a room: type or pick a room name, pick a known account holder or type a free-text label — no restriction on adding more people to a room that already has occupants

## Iterative Rollout

### Phase 1: Accounts, Sign Up, Room Assignment
**Goal:** Establish identity via dashboard-managed accounts and a single self-service sign-up flow covering attendance and room assignment.

**Tasks:**
1. Set up Supabase project; enable magic-link auth
2. Create tables: `people`, `beach_week_registrations`, `room_assignments`; add the `auth.users` insert trigger (security definer) that creates `people` rows
3. Configure RLS (see below)
4. Build the Sign Up form: pick a beach week → free-text attendees → submit
5. Build the Room Assignment UI: pick/type a room name, assign a known account holder or free-text label; show existing occupants of that room name for the week (informational only)
6. Add auth context/provider to React app — **without gating the existing public calendar**. Add a "Sign in" affordance; new features appear once authenticated.
7. `beachWeeksService.ts` remains unchanged (still static/pre-computed, still public)

**Validation:**
- [ ] Public calendar works identically with no session (unauthenticated)
- [ ] Accepting a dashboard invite creates a `people` row automatically via trigger
- [ ] Signing up creates/updates a single registration row per account holder per week, with free-text attendees
- [ ] Assigning a room succeeds regardless of how many people are already listed for that room name
- [ ] A person who hasn't signed up for week N cannot view/edit week N's plans

### Phase 2: Notes
**Goal:** Simple per-day notes for people who signed up for that week.

**Tasks:**
1. Build a note editor per day (plain text for MVP — see open item on rich text)
2. Save on blur/debounce; refetch notes when the browser tab regains focus (no live push, no presence)
3. RLS: select/insert/update only if the acting person has a registration for that `beach_week_n`

**Validation:**
- [ ] Only people who signed up for week N can view/edit notes for week N
- [ ] Notes persist across reloads; refocusing the tab shows the latest saved content from others

### Phase 3: Polish (Optional)
1. OAuth sign-in option (Google/Apple) alongside magic links
2. Self-service in-app invites, if dashboard-only proves limiting — single Edge Function calling `supabase.auth.admin.inviteUserByEmail()`
3. Email notifications (note updated, upcoming week reminder)
4. Rich text notes (TipTap/Slate) if plain text proves insufficient
5. PWA/offline support for notes
6. Live sync for notes (Supabase Realtime), only if refresh-on-focus proves genuinely insufficient in practice

## Migration Path from Static React App

1. Add `@supabase/supabase-js`; create `supabaseClient.ts`
2. Add auth context/provider — additive only, no route gating on the existing calendar views
3. Add new routes/sections for sign up (attendance + room assignment), notes — visible only when signed in
4. `beachWeeksService.ts` and the pre-computed data are untouched

## Row Level Security (RLS) Sketch

```sql
-- Helper: current person id from auth.uid()
create function current_person_id() returns uuid as $$
  select id from people where auth_user_id = auth.uid()
$$ language sql stable;

-- People: any authenticated user can read all people (small trusted family, for room-assignment dropdowns)
create policy "read all people" on people for select
  using (auth.role() = 'authenticated');
-- No client-side insert/update/delete policy on people: rows are only created by the auth.users trigger.

-- Registrations: any authenticated user can create/update their own sign-up
create policy "manage own registration" on beach_week_registrations for all
  using (registered_by = current_person_id())
  with check (registered_by = current_person_id());
create policy "read registrations" on beach_week_registrations for select
  using (auth.role() = 'authenticated');

-- Room assignments: gated by having a registration for that week
create policy "manage room assignments" on room_assignments for all
  using (
    exists (
      select 1 from beach_week_registrations r
      where r.beach_week_n = room_assignments.beach_week_n
        and r.registered_by = current_person_id()
    )
  );

-- Notes: gated by the same registration rule
create policy "manage notes" on notes for all
  using (
    exists (
      select 1 from beach_week_registrations r
      where r.beach_week_n = notes.beach_week_n
        and r.registered_by = current_person_id()
    )
  );
```

## Configuration

```bash
npm install -g supabase
supabase init
supabase link --project-ref <project-id>
supabase db push
```

```env
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

## Open Items (deferred, non-blocking)

1. **Rich text vs. plain text notes:** Start plain text; revisit if formatting is requested.
2. **OAuth providers:** Deferred to Phase 3; magic link covers MVP needs.
3. **Notifications:** Deferred to Phase 3.
4. **Self-service in-app invites:** Deferred; dashboard-only invites are the MVP. Upgrade path is one Edge Function if it proves limiting.
5. **Live sync for notes:** Deferred; refresh-on-focus is the MVP. Only revisit if concurrent editing conflicts become a real, recurring problem.

## Risks & Mitigations

**Risk:** Free-text attendees and room assignments have no structure — no validation, no dedup, typos possible (e.g., "Master Bedroom" vs "Master Bdrm").
**Mitigation:** Acceptable for a small trusted family; UI can autocomplete from previously-used room names per week to reduce drift without enforcing a schema.

**Risk:** Anyone who signed up for a week can add/change any room assignment for that week with no locks — two people could genuinely double-book a room by mistake.
**Mitigation:** Intentional per requirements ("no claims or locks or limits"); showing current occupants at assignment time is the only coordination mechanism, which is sufficient for a small family on the honor system.

**Risk:** Vendor lock-in with Supabase.
**Mitigation:** Standard Postgres underneath; migration path exists if needed.

## Success Criteria

1. Public calendar works with zero authentication required
2. New accounts are created via Supabase dashboard invite with zero custom code; a `people` row is created automatically on acceptance
3. Signing up for a beach week (free-text attendees) is a single form/action, editable later
4. Signing up for a beach week is the sole gate for viewing/editing that week's room assignments and notes
5. Room assignment has zero enforcement (no capacity, no locks) beyond showing existing occupants for coordination
6. Notes persist reliably; refocusing the tab shows others' latest saved edits
7. No breaking changes to the existing pre-computed calendar or its public accessibility
