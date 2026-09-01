# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # Start development server (localhost:3000)
pnpm build      # Production build
pnpm lint       # Run ESLint
```

No test suite is configured.

## Architecture

This is a Next.js 16 / React 19 app deployed on Vercel. It shows real-time PM2.5 air quality data for the Monterrey–Saltillo metro area on an interactive Mapbox map.

**Data flow (home page):**
1. `app/page.tsx` — server component that fetches in parallel and passes data as props to the map.
2. `components/data/purple-air-sensors.tsx` — queries `purpleair_sensores` table (sensor metadata: id, name, lat/lon). Active sensors only (`.eq("estatus", "activo")`). **Individual sensors are hidden here using `.neq("sensor_id", <id>)` chained calls.**
3. `components/data/purple-air-data.tsx` — queries `purpleair_mediciones` for the latest 150 readings, then deduplicates to one reading per sensor.
4. `components/mapa/mapa-sensors.tsx` — `"use client"` Mapbox GL component that renders color-coded circular markers per sensor based on PM2.5 thresholds (Mexican Air and Health Index).

**SIMA (official government stations) is live.** `app/page.tsx` fetches `sima-sensors.tsx` / `sima-data.tsx` alongside PurpleAir and merges them into the marker set tagged `source: "sima"` (`sima_sensores`, `sima_mediciones` tables). On the map, SIMA markers are the same discs as citizen sensors but carry a `Landmark` corner badge (`.sensor-marker__badge`, gray-500 ground, see `.ai-style-guide.md` §3/§5); the Capas panel's **Fuente** section filters citizen vs. government.

**Supabase** is the backend. The client is created server-side via `utils/supabase/server.ts` using `@supabase/ssr`.

## Hiding/showing sensors

To hide a PurpleAir sensor, add `.neq("sensor_id", <id>)` in `components/data/purple-air-sensors.tsx`. To show a hidden sensor, remove its `.neq()` line from that file.

## PM2.5 color scale (Mexican IMECA)

| Range (μg/m³) | Color  | Label                  |
|---------------|--------|------------------------|
| ≤ 0.4 or null | Gray   | Not shown on map       |
| 0.4 – 15      | Green  | Buena                  |
| 15 – 25       | Yellow | Aceptable              |
| 25 – 79       | Orange | Mala                   |
| 79 – 130      | Red    | Muy mala               |
| > 130         | Purple | Extremadamente mala    |

Gray markers (no valid reading) are not rendered at all.

## Environment variables

```
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```
