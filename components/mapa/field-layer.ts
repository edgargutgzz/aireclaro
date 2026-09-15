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
export const FIELD_RADIUS = [
  "interpolate", ["linear"], ["zoom"],
  8, stopR(5.5, 4.5),
  11, stopR(9.5, 8),
  13.5, stopR(13, 11),
  16, stopR(16, 14),
];

// The label only earns its keep once a disc is big enough to hold a 2-3 digit
// number without the field turning into a wall of digits at the metro-wide
// opening zoom (8) — the exact clutter that got the DOM version's every-marker
// numbers reverted the same day they first shipped. Text-size tracks
// FIELD_RADIUS loosely; opacity is the real gate, fully off below zoom 9 and
// in by 11 — the opening flyTo settles at 11 (default station) or 10.5 (no
// default), so the field is fully labelled by the time it comes to rest, not
// just the one DOM marker.
export const FIELD_LABEL_SIZE = [
  "interpolate", ["linear"], ["zoom"],
  9, 8,
  13.5, 11,
  16, 13,
];
export const FIELD_LABEL_OPACITY = [
  "interpolate", ["linear"], ["zoom"],
  9, 0,
  11, 1,
];
