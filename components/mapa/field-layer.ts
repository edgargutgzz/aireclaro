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

// Resting disc radius (px) by zoom, before the hover multiplier. SIMA reference
// stations run a step fuller than the citizen field at every zoom — the same
// weight split the DOM markers carried (27 vs 24px), now zoom-responsive. The
// stroke width stays flat (below) so a shrunk disc keeps its "instrument" edge
// instead of reading as basemap furniture, which is what killed the last
// zoom-sizing attempt.
// radius = (SIMA ? sima : citizen) * (hovered ? 1.14 : 1), evaluated per stop.
// The zoom `interpolate` MUST stay top-level in the paint value — Mapbox
// silently drops a layer whose zoom expression is nested inside `*` (this repo
// hit that once already with an IDW layer), so the hover multiply is folded
// into each stop's output instead of wrapping the whole interpolate.
const stopR = (sima: number, citizen: number) => [
  "*",
  ["case", ["boolean", ["get", "isSima"], false], sima, citizen],
  ["case", ["boolean", ["feature-state", "hover"], false], 1.14, 1],
];
// Sized twice (2026-09-15, "a bit bigger" ×2, uniform ~15% passes each time)
// before the user flagged the actual problem: the PM2.5 number
// (FIELD_LABEL_SIZE) didn't fit the disc at the opening/resting zoom (11) —
// diameter there was only ~1.7x the text size, tight for two digits. This
// pass re-derives radius from that ratio directly (diameter ≈ 2.4x
// FIELD_LABEL_SIZE at each zoom, not a flat multiplier on the old numbers),
// so the disc always has headroom around its own digits. SIMA still ~1.25x
// citizen.
//
// A single stop table, not two separate hardcoded lists: FIELD_RADIUS (the GL
// expression) and `fieldRadiusAt` (a plain-JS interpolator the selected DOM
// marker's runtime size reads, mapa-sensors.tsx's resizeSelectedMarker) are
// both built from this so they can't drift apart again. They already did
// once — the DOM marker's old fixed 27/24px size never grew alongside the
// field's zoom-responsive one, so by zoom 11 an ordinary SIMA field disc had
// grown *past* the selected marker, breaking "selected leads by size."
const FIELD_RADIUS_STOPS: readonly [zoom: number, sima: number, citizen: number][] = [
  [8, 15, 12],
  [11, 17.5, 14],
  [13.5, 21, 17],
  [16, 25, 20],
];
export function fieldRadiusAt(zoom: number, isSima: boolean): number {
  const stops = FIELD_RADIUS_STOPS;
  if (zoom <= stops[0][0]) return isSima ? stops[0][1] : stops[0][2];
  for (let i = 1; i < stops.length; i++) {
    const [z1, s1, c1] = stops[i - 1];
    const [z2, s2, c2] = stops[i];
    if (zoom <= z2) {
      const t = (zoom - z1) / (z2 - z1);
      return (isSima ? s1 : c1) + ((isSima ? s2 : c2) - (isSima ? s1 : c1)) * t;
    }
  }
  const last = stops[stops.length - 1];
  return isSima ? last[1] : last[2];
}
export const FIELD_RADIUS = [
  "interpolate", ["linear"], ["zoom"],
  ...FIELD_RADIUS_STOPS.flatMap(([zoom, sima, citizen]) => [zoom, stopR(sima, citizen)]),
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
