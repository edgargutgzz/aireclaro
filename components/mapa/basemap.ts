import { addProtocol, setWorkerUrl, type StyleSpecification } from "maplibre-gl";
import { Protocol } from "pmtiles";
import { layers, namedFlavor } from "@protomaps/basemaps";
import { BASEMAP_GROUND } from "./ground";

// The basemap is served from this site, not a tile API: an OpenStreetMap
// extract of the region (Protomaps' basemap build) as one PMTiles archive in
// public/basemap, read by HTTP range requests, plus the label fonts and icon
// sprites beside it. Nothing on the map loads from a third party. Mapbox's
// tiles were stalling for 20 to 60+ seconds over HTTP/3 from at least one
// Monterrey ISP (2026-10-09), and an open-data platform shouldn't depend on a
// paid, keyed tile service to show its own readings.
//
// Refresh the extract (roads, names) every few months; the bbox covers every
// sensor, Saltillo to the east of the metro, with margin. The file name
// carries the build date because it is cached as immutable (next.config.mjs):
// a refresh is a new name here, never an overwrite.
//   pmtiles extract https://build.protomaps.com/<YYYYMMDD>.pmtiles \
//     public/basemap/monterrey-<YYYYMMDD>.pmtiles --bbox=-101.35,25.0,-99.55,26.25 --maxzoom=15
const BASEMAP_FILE = "monterrey-20261009.pmtiles";

export const BASEMAP_BOUNDS: [[number, number], [number, number]] = [
  [-101.35, 25.0],
  [-99.55, 26.25],
];

// Water a step deeper and cooler than the stock light flavor, so the Río
// Santa Catarina and the dams read across the city against the warm ground.
const BASEMAP_WATER = "#c9d6dd";
// Green space as a pale sage just off the ground. The stock flavor's saturated
// park/wood greens competed with the green "Buena" marker fill; the markers
// carry the colour on this map, the basemap stays out of the way.
const BASEMAP_GREEN = "#e3e8dd";
const BASEMAP_SCRUB = "#e8e9e2";
const BASEMAP_BUILDINGS = "#e3e1dd";

// The number printed on every marker disc (FIELD_LABEL_LAYER). Protomaps'
// self-hosted fonts stop at Medium; there is no Bold.
export const LABEL_FONT = "Noto Sans Medium";

// MapLibre resolves its web worker next to its own module by default, which
// a bundled chunk doesn't have; point it at the file explicitly. The pmtiles://
// protocol is registered once per page.
let registered = false;
function registerOnce() {
  if (registered) return;
  registered = true;
  setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);
  addProtocol("pmtiles", new Protocol().tile);
}

export function basemapStyle(): StyleSpecification {
  registerOnce();
  const origin = window.location.origin;
  const flavor = {
    ...namedFlavor("light"),
    background: BASEMAP_GROUND,
    earth: BASEMAP_GROUND,
    water: BASEMAP_WATER,
    park_a: BASEMAP_GREEN,
    park_b: BASEMAP_GREEN,
    wood_a: BASEMAP_GREEN,
    wood_b: BASEMAP_GREEN,
    scrub_a: BASEMAP_SCRUB,
    scrub_b: BASEMAP_SCRUB,
    buildings: BASEMAP_BUILDINGS,
  };
  return {
    version: 8,
    glyphs: `${origin}/basemap/fonts/{fontstack}/{range}.pbf`,
    sprite: `${origin}/basemap/sprites/light`,
    sources: {
      protomaps: {
        type: "vector",
        url: `pmtiles://${origin}/basemap/${BASEMAP_FILE}`,
        attribution:
          '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    },
    layers: layers("protomaps", flavor, { lang: "es" }),
  };
}
