// The map opens zoomed out over the metro, then one flyTo settles in on the
// default sensor at zoom 13, the "standing beside it" framing. No locate-me,
// this is an open-data map of the airshed, not a personal "air near me" readout.
//
// flyTo, not easeTo, for the ~5 zoom levels: flyTo runs the van Wijk-Nuij curve
// that holds *perceived* zoom speed constant, where easeTo interpolates the
// zoom number linearly and the view accelerates into the stop. 4.5s, not 3s:
// three seconds over five levels read as a lunge. No custom easing on flyTo,
// its curve is already tuned. A visitor who asked the OS for reduced motion
// gets an instant jumpTo to the same framing.
export const OPENING_CENTER: [number, number] = [-100.301, 25.685];
export const OPENING_ZOOM = 8;
export const OPENING_MOVE_MS = 4500;

// The marker field is a single native Mapbox GL circle layer, not ~180 DOM
// markers: the GPU sizes every disc per zoom, resolves overlap/hit-testing
// deterministically, and never rewrites an element transform on pan. The one
// exception is the *selected* station, which stays a DOM marker so it can carry
// the expanding CSS pulse halo GL can't draw (see syncActive).
export const FIELD_SOURCE = "sensor-field";
export const FIELD_LAYER = "sensor-field-dots";
// Every disc's PM2.5 reading, printed straight on its fill — a second
// `symbol` layer over the same source, text-only (no icon). The selected
// station hides its label here (feature-state `selected`) the same way it
// hides its flat circle: the DOM marker prints its own, larger number.
export const FIELD_LABEL_LAYER = "sensor-field-labels";
// The government (SIMA) reference stations carry the Landmark badge at all times
// — GL circles can't hold one, so it's a second `symbol` layer over the same
// source, filtered to `isSima`, with the badge pre-rendered to a raster icon
// (makeSimaBadge). ~15 stations, spatially spread, so `icon-allow-overlap`.
export const SIMA_BADGE_LAYER = "sensor-field-sima-badge";
export const SIMA_BADGE_IMAGE = "sima-badge";

// The SIMA badge as an ImageData: gray-500 disc, white casing ring, white
// Landmark glyph — pixel-for-pixel the `.sensor-marker__badge` the DOM markers
// use, so a selected station's DOM badge and the field badge match. Drawn at 2×
// for retina; `addImage` is told `pixelRatio: 2`.
export function makeSimaBadge(): ImageData {
  const S = 2; // device scale
  const box = 22; // logical px (disc + casing + slack)
  const cvs = document.createElement("canvas");
  cvs.width = box * S;
  cvs.height = box * S;
  const ctx = cvs.getContext("2d")!;
  ctx.scale(S, S);
  const c = box / 2;
  const rDisc = 8.5;
  ctx.beginPath();
  ctx.arc(c, c, rDisc + 1.5, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(c, c, rDisc, 0, Math.PI * 2);
  ctx.fillStyle = "#6b7280"; // gray-500 — as light as the white glyph clears 3:1
  ctx.fill();
  ctx.save();
  ctx.translate(c, c);
  const g = 11 / 24; // fit lucide's 24 viewBox into ~11 logical px
  ctx.scale(g, g);
  ctx.translate(-12, -12);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath(); // roof
  ctx.moveTo(12, 2.5);
  ctx.lineTo(20, 7);
  ctx.lineTo(4, 7);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath(); // base
  ctx.moveTo(4, 21.5);
  ctx.lineTo(20, 21.5);
  ctx.stroke();
  for (const x of [7, 12, 17]) {
    ctx.beginPath();
    ctx.moveTo(x, 17.5);
    ctx.lineTo(x, 11);
    ctx.stroke();
  }
  ctx.restore();
  return ctx.getImageData(0, 0, cvs.width, cvs.height);
}

// Resting disc radius (px) by zoom, before the hover multiplier. SIMA and
// citizen discs are now the SAME size at every zoom (2026-09-15, user: "make
// the estaciones markers the same size as the rest, lets just have the icon
// [be] the differentiator") — the network no longer reads apart by weight
// (disc size, rest opacity), only by the Landmark badge. The stroke width
// stays flat (below) so a shrunk disc keeps its "instrument" edge instead of
// reading as basemap furniture, which is what killed the last zoom-sizing
// attempt.
// radius = base * (hovered ? 1.14 : 1), evaluated per stop. The zoom
// `interpolate` MUST stay top-level in the paint value — Mapbox silently
// drops a layer whose zoom expression is nested inside `*` (this repo hit
// that once already with an IDW layer), so the hover multiply is folded into
// each stop's output instead of wrapping the whole interpolate.
const stopR = (radius: number) => [
  "*",
  radius,
  ["case", ["boolean", ["feature-state", "hover"], false], 1.14, 1],
];
// Derived from FIELD_LABEL_SIZE's own footprint (diameter ≈ 2.4x the text
// size, so the printed number always has headroom) rather than picked
// independently — see the git history on this file for the "a bit bigger"
// passes that got that backwards before the fit-driven redo.
//
// A single stop table, not a separate hardcoded list per property:
// FIELD_RADIUS (the GL expression) and `fieldRadiusAt` (a plain-JS
// interpolator the selected DOM marker's runtime size reads,
// mapa-sensors.tsx's resizeSelectedMarker) are both built from this so they
// can't drift apart again — they already did once (the DOM marker's old
// fixed px size never grew alongside the field's zoom-responsive one).
const FIELD_RADIUS_STOPS: readonly [zoom: number, radius: number][] = [
  [8, 12],
  [11, 14],
  [13.5, 17],
  [16, 20],
];
export function fieldRadiusAt(zoom: number): number {
  const stops = FIELD_RADIUS_STOPS;
  if (zoom <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [z1, r1] = stops[i - 1];
    const [z2, r2] = stops[i];
    if (zoom <= z2) {
      const t = (zoom - z1) / (z2 - z1);
      return r1 + (r2 - r1) * t;
    }
  }
  return stops[stops.length - 1][1];
}
export const FIELD_RADIUS = [
  "interpolate", ["linear"], ["zoom"],
  ...FIELD_RADIUS_STOPS.flatMap(([zoom, radius]) => [zoom, stopR(radius)]),
];

// The SIMA badge (makeSimaBadge, a ~20px-core raster) tracks the same radius
// curve as the (now-unified) disc size, so it can't quietly go undersized
// again the way it did when it was a flat icon-size/icon-offset tuned once
// for a much smaller SIMA-only radius. Ratio (badge diameter ≈ 1.12x radius,
// offset ≈ 0.5x radius) is the flat values' own ratio at their original
// tuning point, just held at every size now instead of one.
const badgeZoomRange = [FIELD_RADIUS_STOPS[0][0], FIELD_RADIUS_STOPS[FIELD_RADIUS_STOPS.length - 1][0]] as const;
export const FIELD_BADGE_SIZE = [
  "interpolate", ["linear"], ["zoom"],
  badgeZoomRange[0], (fieldRadiusAt(badgeZoomRange[0]) * 1.12) / 20,
  badgeZoomRange[1], (fieldRadiusAt(badgeZoomRange[1]) * 1.12) / 20,
];
export const FIELD_BADGE_OFFSET = [
  "interpolate", ["linear"], ["zoom"],
  badgeZoomRange[0], ["literal", [fieldRadiusAt(badgeZoomRange[0]) * 0.5, -fieldRadiusAt(badgeZoomRange[0]) * 0.5]],
  badgeZoomRange[1], ["literal", [fieldRadiusAt(badgeZoomRange[1]) * 0.5, -fieldRadiusAt(badgeZoomRange[1]) * 0.5]],
];

// Every disc's number is on the moment it's on screen, same as the selected
// DOM marker — no zoom-gated fade-in. A fade (off below zoom 9, in by 11) was
// tried first to dodge a hypothetical wall-of-digits at the metro-wide opening
// zoom, but the opening flyTo passes through that zoom in under a second on
// its way to resting at 11 — in practice the fade just read as the numbers
// "loading in" bit by bit during the fly-in, which looked broken, not
// deliberate. Simpler and consistent beats the theoretical clutter case.
export const FIELD_LABEL_SIZE = [
  "interpolate", ["linear"], ["zoom"],
  9, 10,
  13.5, 14,
  16, 17,
];
// Only the selected station's own label is hidden (its DOM marker prints a
// larger one instead) — a plain `case`, no zoom involved, so none of
// FIELD_RADIUS's "zoom must be the top-level expression" nesting rules apply
// here.
export const FIELD_LABEL_OPACITY = [
  "case",
  ["boolean", ["feature-state", "selected"], false], 0,
  1,
];
