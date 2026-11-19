# Aire Claro

An open-data platform for air quality in the Monterrey–Saltillo metropolitan
area, built by the **Observatorio Ciudadano de la Calidad del Aire (OCCAMM)**.

## What this is

Aire Claro's goal is to be a state-of-the-art open-data platform that empowers
NGOs, government, universities, other organizations, and power users to use
air-quality information to **take action for a cleaner city**.

The principle: Aire Claro reports what named monitoring stations and sensors
*measured*. On the map every reading is tied to a station; metro-scale views
(the `/datos` section) are fine but stay well-attributed. It aims to be the
trustworthy measurement layer that others build their analysis and advocacy on.

## Status

- **Live:** a real-time interactive map of PM2.5 across the metro — official
  SIMA reference stations and PurpleAir citizen sensors on one view (the only
  site that combines both), colour-coded by the Mexican Air and Health Index
  (NOM-172-SEMARNAT-2023), with a per-station detail card and shareable views.
- **Planned (the actual product):** a public API, bulk and per-sensor data
  download, a methodology page, and a data license. Not built yet.

## Data sources

- **SIMA** — [Sistema Integral de Monitoreo Ambiental](https://aire.nl.gob.mx/),
  Gobierno de Nuevo León. 16 government reference stations.
- **PurpleAir** — [citizen sensor network](https://www.purpleair.com/). ~165
  low-cost sensors.

Both sources are ingested by Vercel crons in this repo.

## Running it

Requires **Node 22+** and **pnpm**.

```bash
pnpm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=…
NEXT_PUBLIC_SUPABASE_ANON_KEY=…
```

```bash
pnpm dev      # localhost:3000
pnpm build    # production build
```

`pnpm lint` is currently broken; the checks that gate a change are
`pnpm exec tsc --noEmit` and `pnpm build`.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS ·
MapLibre GL + self-hosted OpenStreetMap basemap (Protomaps) · Supabase · deployed on Vercel. No UI component library — every
interactive piece is hand-built to the house tokens (`.ai-style-guide.md`).

## Documentation

| Doc | Contents |
|---|---|
| [`.ai-style-guide.md`](.ai-style-guide.md) | the visual contract for the UI |
| [`CLAUDE.md`](CLAUDE.md) | working guidance for AI coding agents |

## License

- **Code:** MIT, see [`LICENSE`](LICENSE).
- **Data** published on the site (the /datos downloads): CC BY 4.0, citing
  SINAICA as the original source.
- **Not covered by MIT:** the logos and brand marks, the team photos, and the
  publications in `public/` (PDFs, infographics, column images). They remain
  the property of OCCAMM or their authors.

## Contact

- Email: contacto@observatoriodelaire.com
- Web: [observatoriodelaire.com](https://www.observatoriodelaire.com/)
