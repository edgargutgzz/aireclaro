# CLAUDE.md

Guidance for Claude Code working in this repo. Read this first, then the doc
pointers below as the task needs them.

## The objective — drives every decision

**Aire Claro is a state-of-the-art open-data platform. Its priority is to
empower NGOs, government, universities, other organizations, and power users to
use air-quality information to take action for a cleaner city.**

Weigh proposals against this in a product-management sense — scope, sequencing,
priority — not just feasibility. Act as product strategist as well as
developer/designer: when a request pulls the product off-objective, or a
smaller/different scope serves it better, say so before building. The
open-data layer (public API, bulk + per-sensor download, methodology page, data
license) is *the product* — planned, not built yet; it comes before
amplification features like embeds.

These are **guiding principles, not a cage.** Keep thinking, investigating, and
proposing freely — they inform judgment, they don't replace it.

## How we build — priority order

1. **Best practices over bespoke.** Front-end and back-end alike — reach for the
   established pattern, framework, or library. Don't reinvent the wheel.
2. **It works first, before how it looks.** Loads fast. Doesn't break. Function
   before form.
3. **Then how it looks — consistency and order before aesthetics.** Reuse the
   same conventions, tokens, and components; consult `.ai-style-guide.md` when
   adding a **new component** or changing a **token** (a one-off tweak to an
   existing component doesn't need a full read). **No component library** —
   shadcn/ui was removed 2026-09-19 (same reasoning as dropping Recharts:
   less lock-in, direct control); a new interactive control is hand-built to
   the style guide's tokens/recipes, or copied from the nearest existing
   pattern. Taste calls ("lighter / stronger / nicer") come *after*
   consistency is in place, and are never a reason to diverge from the
   system.

## Commands

```bash
pnpm dev        # localhost:3000
pnpm build      # production build
pnpm exec tsc --noEmit   # the type gate
```

**`pnpm lint` is broken in this repo** — the gate is `tsc --noEmit` then
`pnpm build`. No test suite. A clean build logs no app warnings, only
dependency noise (Node's `punycode` deprecation, a stale
`baseline-browser-mapping` notice). The old cookies-driven
`DYNAMIC_SERVER_USAGE` warning is gone since 2026-09-29.

## This repo's workflow

- Commit straight to `main` and push — no branches, PRs, or confirmation.
- No local-preview workflow: push and let the user check production. Skip the
  dev-server / screenshot / artifact review steps unless asked.
- Stop any background `pnpm dev` when wrapping up.
- User-facing Spanish copy: sentence case, no em-dashes (commas / periods).

## Where things are documented

| Doc | For |
|---|---|
| `README.md` | what the platform is, quickstart, the doc index |
| `docs/architecture.md` | data model, ingestion boundary, domains + routing, map data flow, the GL marker field, API routes, URL-state model, `/datos`, `/publicaciones` |
| `docs/methodology.md` | how readings are presented, data sources & their reliability, known gaps, the FIN/Saltillo exclusion, the PM2.5 / NOM-172 scale, license/citation status |
| `docs/sima-data-pipeline.md` | SIMA tables, the monthly sync, views, the /datos charts' rules, rounding, the public download |
| `docs/purpleair-data-pipeline.md` | PurpleAir tables (the sensor history, `estatus`), the hourly job, what the map shows |
| `.ai-style-guide.md` | the visual contract (tokens, spacing, component recipes) — consult for a new component or a token change |

## Hiding / showing a PurpleAir sensor

Add / remove a `.neq("sensor_id", <id>)` line in
`components/data/purple-air-sensors.tsx`. A sensor that moved, was renamed
or disappeared from PurpleAir is retired instead by setting its old row's
`estatus` to `historico` in `purpleair_sensores` (the table is a history of
every sensor; new location = new row with the same `sensor_id`).

## Environment variables

```
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```
