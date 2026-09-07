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

Provisioned on Railway: project `goodtimes-pocketbase`, built from `pocketbase/Dockerfile`, with a persistent volume at `/pb/pb_data` and **scale-to-zero** enabled (dashboard/API-only setting — not expressible in `railway.json`). Reachable at `https://api.goodtimes.huskytown.net` (a custom domain, kept on its own subdomain of `huskytown.net` so it doesn't collide with the frontend's `goodtimes.huskytown.net`).

Point a production frontend build at it with `VITE_POCKETBASE_URL=https://api.goodtimes.huskytown.net`.

SMTP (OTP email delivery) goes through Resend via `RESEND_TOKEN` (set as a Railway variable on the service) — see `pb_migrations/1788600004_configure_smtp.js`. Note it uses port `2465`, not the standard `587`: Railway blocks that port outbound.

`RAILWAY_TOKEN` (a project-scoped deploy token, Project Settings → Tokens) is set as this repo's GitHub secret — [`.github/workflows/deploy-pocketbase.yml`](.github/workflows/deploy-pocketbase.yml) uses it to deploy on every push to `main` that touches `pocketbase/**`.

To deploy by hand instead of waiting on CI (needs `railway login` or `RAILWAY_TOKEN` set locally):

```bash
mise run pb:deploy
```

### Frontend — Cloudflare Pages (production)

Deploys go through [`.github/workflows/deploy-frontend.yml`](.github/workflows/deploy-frontend.yml) (`wrangler pages deploy`) on every push to `main` that touches `beach-weeks/**`, authenticated via the `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` repo secrets — **not** Cloudflare Pages' own git-integration auto-builds, which are disabled on this project.

Why: Cloudflare Pages' dashboard/API "environment variables" feature doesn't reliably inject build-time vars into the actual build process for this project (confirmed: two rebuilds with `VITE_POCKETBASE_URL` configured that way produced a bundle identical to one built *without* it). The GitHub Actions workflow sidesteps this entirely — `VITE_POCKETBASE_URL` is a plain step-level `env:` value read directly by `pnpm build`.

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
