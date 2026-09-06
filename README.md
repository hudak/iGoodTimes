# iGoodTimes

Beach week calendar for the Gast family. Displays pre-computed beach week dates with infinite scroll, date search, and countdown — no login required to view.

## Structure

```
beach-weeks/          React SPA (Vite + TypeScript + Tailwind)
pocketbase/           PocketBase backend: migrations (pb_migrations/) and hooks (pb_hooks/)
wrangler.toml         Cloudflare Pages deployment config
mise.toml             Tool versions (Node 22, pnpm, wrangler, pocketbase, railway)
```

## Getting Started

```bash
mise install          # install Node, pnpm, wrangler, pocketbase, railway
cd beach-weeks && pnpm install
pnpm dev              # http://localhost:5173
```

### Backend (PocketBase) — local dev

The social features (sign-up, room assignments, notes) are backed by [PocketBase](https://pocketbase.io), self-hosted on Railway in production. For local development, run it yourself — no cloud account needed:

```bash
mise run pb:serve     # http://127.0.0.1:8090, Admin UI at /_/
```

This runs PocketBase against `pocketbase/pb_data_local/` (gitignored) using the migrations in `pocketbase/pb_migrations/` and the validation hooks in `pocketbase/pb_hooks/` — the same schema that ships to Railway. On first run:

1. Follow the "create your first superuser" URL printed in the terminal (or run `pocketbase superuser upsert you@example.com yourpassword --dir ./pocketbase/pb_data_local`) to get into the Admin UI.
2. Create test accounts the same way an admin would in production: Admin UI → `users` collection → New record (email only — no self-service signup exists, by design).
3. Sign in from the app using that email. There's no SMTP configured locally, so the one-time sign-in code isn't emailed — it's printed to the `pb:serve` terminal output instead (the task runs PocketBase with `--dev` for exactly this reason).

Point the frontend at this local instance with `VITE_POCKETBASE_URL=http://127.0.0.1:8090` in `beach-weeks/.env.local`.

### Backend — Railway (production)

One-time setup (in the [Railway dashboard](https://railway.app)):

1. Create a project + service from `pocketbase/Dockerfile`, with a persistent volume mounted at `/pb/pb_data`.
2. Turn on **scale-to-zero** (Settings → sleep application) — this is dashboard/API-only, not expressible in `railway.json`.
3. Set SMTP env vars on the service so OTP sign-in emails actually deliver (locally, PocketBase just logs the code instead — see above).
4. Generate a **project-scoped** deploy token (Project Settings → Tokens) and add it as the `RAILWAY_TOKEN` secret in this repo's GitHub settings — that's what [`.github/workflows/deploy-pocketbase.yml`](.github/workflows/deploy-pocketbase.yml) uses to deploy on every push to `main` that touches `pocketbase/**`.

To deploy by hand instead of waiting on CI (needs `railway login` or `RAILWAY_TOKEN` set locally):

```bash
mise run pb:deploy
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

Auth and social features (sign-up, room assignments, per-day notes) are being built on a self-hosted PocketBase backend on Railway. The public calendar remains fully unauthenticated. See `openspec/changes/add-social-features/` for the full spec, design, and task breakdown.
