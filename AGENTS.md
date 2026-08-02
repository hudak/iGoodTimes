# AGENTS.md

Guidance for AI agents working in this repository.

## Repo Layout

- `beach-weeks/` — the React SPA; all app code lives here
- `supabase/` — migrations, seed, and config (created via `supabase init`; coming Phase 1)
- `wrangler.toml` — Cloudflare Pages config; `pages_build_output_dir` points to `beach-weeks/dist`
- `.kilo/plans/` — feature specs and architecture decisions; read before making structural changes

## Tech Stack

- React 19, TypeScript, Vite, Tailwind CSS 4
- Vitest for tests, oxlint for linting
- pnpm (not npm or yarn)
- Deployed to Cloudflare Pages via `wrangler`
- Tool versions managed by `mise` (`mise.toml`)

## Critical Constraints

- **`beachWeeks.ts` is generated** — never hand-edit `src/data/beachWeeks.ts`; run `pnpm generate` instead
- **`beachWeeksService.ts` is the only data access point** — components must not import from `src/data/beachWeeks.ts` directly
- **Public calendar requires no auth** — do not add auth guards to existing calendar views
- **No runtime date math** — all date computation happens in `scripts/generate.ts` at build time

## Commands

Frontend (run from `beach-weeks/`):

```bash
pnpm install       # install deps
pnpm dev           # dev server
pnpm build         # tsc + vite build
pnpm test          # vitest run
pnpm lint          # oxlint
pnpm generate      # regenerate src/data/beachWeeks.ts
pnpm deploy        # build + wrangler pages deploy --branch=dev
```

Supabase (run from repo root):

```bash
supabase init      # one-time: creates supabase/ directory
supabase start     # local Postgres + Auth
supabase db push   # apply migrations to linked project
```

## Conventions

- Components in `src/components/`, hooks in `src/hooks/`, service in `src/services/`
- Prefer editing `beachWeeksService.ts` over adding new data files
- Tests live in `src/tests/`; fixtures in `src/tests/fixtures/`
- TypeScript strict mode is on — no `any`, no `@ts-ignore` without a comment explaining why

## Planned Work

The next major feature adds Supabase auth + sign-up + room assignments + notes on top of the existing static app. See `.kilo/plans/feature_requests.md` for the full data model, RLS policies, and phased rollout plan. The public calendar must remain unaffected.
