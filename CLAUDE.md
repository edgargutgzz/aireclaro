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

## How a session usually starts

Most sessions open with an idea, not a spec — "I think we should do X", "what's
missing from this page". The default response to that is **decide whether to
build it, then build it**: scope it, weigh it against the objective, name a
smaller version or an alternative, give a recommendation — *before* writing
code. Only a direct task ("fix the X bug", "change Y to Z") goes straight to
implementation.

## How we build — priority order

1. **Best practices over bespoke.** Front-end and back-end alike — reach for the
   established pattern, framework, or library. Don't reinvent the wheel.
2. **It works first, before how it looks.** Loads fast. Doesn't break. Function
   before form.
3. **Then how it looks — consistency and order before aesthetics.** Follow
   `.ai-style-guide.md`, reuse the same conventions, tokens, and components.
   Taste calls ("lighter / stronger / nicer") come *after* consistency is in
   place, and are never a reason to diverge from the system.

## Editorial invariant

**Report what a named station or sensor measured. Never a metro-wide verdict,
headline number, or aggregate.** The scientific-NGO reason and the details are
in `docs/methodology.md`.

## Commands

```bash
pnpm dev        # localhost:3000
pnpm build      # production build
pnpm exec tsc --noEmit   # the type gate
```

**`pnpm lint` is broken in this repo** — the gate is `tsc --noEmit` then
`pnpm build`. No test suite. `pnpm build` always logs one
`DYNAMIC_SERVER_USAGE` warning on `/` — that one is expected (cookies).

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
| `docs/architecture.md` | data model, ingestion boundary, home-page flow, API routes, the `field_history` RPC, URL-state model, `/datos` |
| `docs/methodology.md` | editorial stance, data sources & their reliability, known gaps, the FIN/Saltillo exclusion, the PM2.5 / NOM-172 scale, license/citation status |
| `.ai-style-guide.md` | the visual contract — read before writing **any** UI |

## Hiding / showing a PurpleAir sensor

Add / remove a `.neq("sensor_id", <id>)` line in
`components/data/purple-air-sensors.tsx`.

## Environment variables

```
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```
