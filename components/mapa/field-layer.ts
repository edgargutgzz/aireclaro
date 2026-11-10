// The metro's centre: where the map opens when there is no station to open
// on. It opens straight on its resting view, with no fly-in (see the map's
// init effect in mapa-sensors.tsx).
// Framing calls 2026-11-02: nudged east of the metro's middle (-100.301 →
// -100.271), then back west in steps (-100.286, -100.301) with a closer zoom
// (OPENING_ZOOM 10.5, then 10.25). 2026-11-03: a step further west (-100.316), then -100.331, then -100.346 with zoom 10, then -100.354, then -100.369. 2026-11-05: a step northeast (-100.369, 25.685 → -100.354, 25.700), then a tad west (-100.362), then -100.370, then a tad north (25.708), then back south (25.704, 25.700). 2026-11-10: zoom 10 → 10.25.
export const OPENING_CENTER: [number, number] = [-100.370, 25.700];
export const OPENING_ZOOM = 10.25;

// The marker field is a single native MapLibre GL circle layer, not ~180 DOM
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

// The SIMA badge as an ImageData: stone-500 disc, white casing ring, white
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
  ctx.fillStyle = "#737373"; // neutral-500, white glyph clears 3:1 (4.7:1)
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
// `interpolate` MUST stay top-level in the paint value — MapLibre (like Mapbox before it) silently
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

// The SIMA badge (makeSimaBadge, a ~20px-core raster inside a 22px canvas)
// tracks the same radius curve as the (now-unified, smaller) disc size:
// badge radius ≈0.425x disc radius, offset distance ≈1.2x disc radius (user:
// "make the icon a bit bigger for the unselected estaciones") — leaves the
// printed number a clear berth and sits the badge nearer the disc's true
// edge, "breaking the edge" per the DOM badge's own original design intent
// rather than sitting well inside it. Bigger and further-out move together
// automatically here: FIELD_BADGE_OFFSET's raw [20,-20] gets multiplied by
// icon-size internally (see below), and icon-size is itself proportional to
// the single constant below, so nudging that constant scales the badge up
// AND pushes it out in lockstep — the clearance-to-badge-size ratio stays
// constant regardless of the constant's value, so this can't reintroduce the
// overlap a bigger badge alone would otherwise risk. Two earlier passes
// tuned the (then-smaller) ratio and
// (separately) fixed FIELD_BADGE_SIZE/OFFSET to track every FIELD_RADIUS_STOPS
// entry instead of a 2-point endpoint line — both looked right in their own
// screenshots, but the badge was STILL landing close to the number, because
// of a third, distinct bug: per the GL style spec, "[icon-offset]'s] each
// component is multiplied by the value of icon-size to obtain the final
// offset in pixels" (confirmed against the v8 style-spec source before
// changing this again — this file has a real scar for shipping GL expression
// assumptions unverified). FIELD_BADGE_OFFSET was passing an already
// disc-radius-scaled pixel value, which the renderer then scaled DOWN AGAIN by
// icon-size (a fraction well under 1 in our range) — so the true on-screen
// offset was only a fraction of what the code intended.
//
// Since icon-size already scales linearly with radius, and the renderer multiplies
// offset by icon-size for you, the offset the *code* supplies must be a flat
// constant in the base asset's own coordinate space — the radius cancels out
// algebraically once you solve for it, so it should never have been
// zoom/radius-dependent in the first place. FIELD_BADGE_SIZE still legitimately
// zoom-interpolates (that scaling is real, not double-applied).
export const FIELD_BADGE_SIZE = [
  "interpolate", ["linear"], ["zoom"],
  ...FIELD_RADIUS_STOPS.flatMap(([zoom, radius]) => [zoom, (radius * 0.95) / 20]),
];
export const FIELD_BADGE_OFFSET = ["literal", [16, -16]];

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
