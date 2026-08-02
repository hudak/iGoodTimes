# iGoodTimes

Beach week calendar for the Gast family. Displays pre-computed beach week dates with infinite scroll, date search, and countdown — no login required to view.

## Structure

```
beach-weeks/   React SPA (Vite + TypeScript + Tailwind)
supabase/      Migrations, seed, and config (coming: Phase 1)
wrangler.toml  Cloudflare Pages deployment config
mise.toml      Tool versions (Node 22, pnpm, wrangler)
```

## Getting Started

```bash
mise install          # install Node, pnpm, wrangler
cd beach-weeks && pnpm install
pnpm dev              # http://localhost:5173
```

Once the Supabase backend is added:

```bash
supabase start        # local Postgres + Auth (run from repo root)
supabase db push      # apply migrations
```

## Key Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm build` | Type-check + build |
| `pnpm test` | Run Vitest tests |
| `pnpm lint` | Run oxlint |
| `pnpm generate` | Regenerate `src/data/beachWeeks.ts` from algorithm |
| `pnpm deploy` | Build + deploy to Cloudflare Pages (dev branch) |

## Architecture

The beach week dates (2005–2075) are pre-computed at build time via `scripts/generate.ts` and validated against a CSV fixture. The frontend imports the static data — no date math in the browser.

The data access layer (`src/services/beachWeeksService.ts`) is the single seam for a future backend migration: swap `import` for `fetch` and no UI components change.

## Planned Features

Auth and social features (sign-up, room assignments, per-day notes) are planned via Supabase. The public calendar will remain unauthenticated. See `.kilo/plans/feature_requests.md` for the full spec.
