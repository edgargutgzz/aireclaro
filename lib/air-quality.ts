// Official Mexican Air and Health Index (NOM-172-SEMARNAT-2023) levels for
// PM2.5, and the single source of truth for the scale's colors.
//
// `color` is the index's own color — use it for anything filled: map markers,
// legend swatches and tints. `ink` is the same level darkened only as far as
// it must be to read on white — use it for text and hairlines, since pure
// #ffff00 disappears at 1px on a white chart, and for the marker's fill ring
// hairline. `legendInk` goes a step further for small labels sitting on a
// tinted chip. The marker's PM2.5 number is not one of these: it always sits
// on a white core in a single dark ink (see globals.css), so it needs no
// per-level pairing. `bounds` is the level's PM2.5 span with no unit: the
// legend prints μg/m³ once in its header, not on every row.
export const IMECA_LEVELS = [
  { limit: 15, label: "Buena", bounds: "0 – 15", color: "#00e400", ink: "#00b300", legendInk: "#007200" },
  { limit: 25, label: "Aceptable", bounds: "15 – 25", color: "#ffff00", ink: "#b2b200", legendInk: "#808000" },
  { limit: 79, label: "Mala", bounds: "25 – 79", color: "#ff7e00", ink: "#ff7e00", legendInk: "#c05e00" },
  { limit: 130, label: "Muy mala", bounds: "79 – 130", color: "#ff0000", ink: "#ff0000", legendInk: "#b30000" },
  { limit: Infinity, label: "Extremadamente mala", bounds: "> 130", color: "#8f3f97", ink: "#8f3f97", legendInk: "#6b2f72" },
] as const;


// The boundaries between levels, each carrying the color of the level it opens.
export const IMECA_THRESHOLDS = IMECA_LEVELS.slice(0, -1).map((level, i) => ({
  value: level.limit,
  color: IMECA_LEVELS[i + 1].ink,
}));

export const getLevel = (pm25: number) =>
  IMECA_LEVELS.find((level) => pm25 <= level.limit) ?? IMECA_LEVELS[IMECA_LEVELS.length - 1];

export const getPM25Color = (pm25: number | null): { bg: string; text: string } | null => {
  if (pm25 === null || pm25 <= 0.4) return null;
  const level = getLevel(pm25);
  return { bg: level.color, text: level.ink };
};

// The level's position in IMECA_LEVELS (0 Buena … 4 Extremadamente mala), or
// -1 for a reading that renders nothing. The cluster histogram is keyed on it.
export const getLevelIndex = (pm25: number | null): number => {
  if (pm25 === null || pm25 <= 0.4) return -1;
  return IMECA_LEVELS.findIndex((level) => pm25 <= level.limit);
};

// Marker fills are the index color nudged a fixed step toward that same level's
// darker `ink`. Enough to take the electric edge off IMECA yellow and green on
// a pale basemap without shifting hue or breaking the read-back to the legend
// swatch. Mala, Muy mala and Extrem. already have ink === color, so they are
// untouched. The legend bar and the cluster ring keep the pure `color`: they
// are thin bands read side by side, where full saturation aids separation.
export const MARKER_INK_MIX = 0.22;
export const getMarkerFill = (pm25: number | null): string | null => {
  if (pm25 === null || pm25 <= 0.4) return null;
  const level = getLevel(pm25);
  return `color-mix(in srgb, ${level.color} ${Math.round((1 - MARKER_INK_MIX) * 100)}%, ${level.ink})`;
};

// The median level across a cluster's per-level counts. A symmetric statistic,
// so it does not lean toward either end of the scale, and it never stands in as
// the cluster's color (the ring shows every level's share); it is only spoken,
// as one summary word, in the cluster's accessible name.
export const histMedianLevel = (hist: number[]): number => {
  const total = hist.reduce((a, b) => a + b, 0);
  if (!total) return -1;
  const mid = total / 2;
  let acc = 0;
  for (let i = 0; i < hist.length; i++) {
    acc += hist[i];
    if (acc >= mid) return i;
  }
  return hist.length - 1;
};

// Markers are siblings in one container (mapbox appends every custom element
// straight into the canvas container) and so paint in DOM order. Which one wins
// an overlap is therefore a sampling rule, and a sampling rule correlated with
// the value on display biases the display: ordering by severity showed the
// worst reading in every cluster and hid the rest, making the basin look worse
// than the sensors say, with nothing on screen admitting that anything had been
// hidden. Order comes from latitude instead — see renderClusters in
// mapa-sensors.tsx — which is mapbox's own convention for symbols
// (symbol-z-order: viewport-y) precisely because it is independent of the data.
//
// Most overlaps no longer reach that tie-break. At zoom 12 and below a
// Supercluster index groups the field into `sensor-cluster` bubbles, so the
// dense basin reads as a handful of legible groups rather than a hundred
// stacked discs.
// The bubble does not pick a color to stand for its members — that would be the
// same bias one rung up — it draws a conic ring split by how many of its
// sensors sit in each level, the legend's own scale bent into a circle, and
// nothing about the group is hidden. `histMedianLevel` is spoken in the
// bubble's accessible name and shown nowhere.
//
// Only these lifts are value-independent and so allowed to override it: the
// selected marker, the one under the pointer, and the visitor's own location.
// The hover lift is what makes a click land on the disc you are actually
// pointing at: every marker's hit box is a 40px square, so in a dense cluster
// the squares overlap and, with all of them at the same z, the one that wins
// the click is just whichever mapbox drew last, not the one under the cursor.
// Raising the hovered marker above the field resolves that to the visible dot.
// Kept tiny, because the map container opens no stacking context and these
// compete directly with the floating panels at z-10.
export const ACTIVE_MARKER_Z = 6;
export const HOVER_MARKER_Z = 7;
export const USER_MARKER_Z = 8;

// `label` becomes the marker's accessible name — without it the markers are
// unreachable by keyboard and announce as nothing to a screen reader.
export const createMarker = (pm25: number | null, label?: string): HTMLElement | null => {
  const colorInfo = getPM25Color(pm25);
  if (!colorInfo) return null;

  const bg = getMarkerFill(pm25)!;
  const level = getLevel(pm25!);

  // Structure, rather than one styled button: the pulse must paint *behind*
  // the circle, the way Google's location halo does, and a pseudo-element can
  // only get there with z-index: -1, which escapes the marker's stacking
  // context and drops it behind the map. A sibling drawn earlier in the DOM
  // sits behind with no stacking tricks at all.
  const el = document.createElement("button");
  el.type = "button";
  el.className = "sensor-marker";
  if (label) el.setAttribute("aria-label", label);
  el.style.border = "none";
  el.style.padding = "0";
  el.style.background = "none";
  el.style.fontFamily = "inherit";

  const pulse = document.createElement("span");
  pulse.className = "sensor-marker__pulse";
  el.appendChild(pulse);

  const dot = document.createElement("span");
  dot.className = "sensor-marker__dot";
  dot.style.borderRadius = "50%";
  dot.style.display = "flex";
  dot.style.alignItems = "center";
  dot.style.justifyContent = "center";
  dot.style.backgroundColor = bg;
  dot.textContent = Math.round(pm25!).toString();
  // Handed to CSS so the stylesheet owns the rim: --marker-edge is the ink
  // hairline that keeps a pale fill from dissolving into pale terrain. The
  // number's color is a fixed dark ink set in globals.css, not a per-level
  // value, since it sits on a white core rather than on the fill.
  dot.style.setProperty("--marker-edge", level.ink);
  el.appendChild(dot);

  return el;
};

// A cluster bubble: a conic ring split by the level mix of the sensors inside
// it, wrapped around a white core carrying the count in one dark ink — the same
// "number on white, color on the rim" treatment a selected marker gets, so the
// two read as the same family. `hist` is per-level counts (index 0..4);
// `medianLabel` is only for the accessible name. The ring, not a single fill,
// is what keeps a mixed group from hiding its spread behind one color.
export const createClusterMarker = (
  count: number,
  hist: number[],
  medianLabel: string,
): HTMLElement => {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "sensor-cluster";
  el.style.border = "none";
  el.style.padding = "0";
  el.style.background = "none";
  el.style.fontFamily = "inherit";
  el.setAttribute(
    "aria-label",
    `Grupo de ${count} sensores, calidad del aire mediana ${medianLabel}. Presiona para acercar y ver cada sensor.`,
  );

  // Grows with the count, gently and capped: a knot of fifty should read as
  // "many", not fifty times the area of a single disc.
  const size = Math.round(34 + (Math.min(count, 50) / 50) * 20);
  el.style.setProperty("--cluster-size", `${size}px`);

  const total = hist.reduce((a, b) => a + b, 0) || 1;
  let acc = 0;
  const stops = IMECA_LEVELS.map((level, i) => {
    const start = (acc / total) * 100;
    acc += hist[i] ?? 0;
    const end = (acc / total) * 100;
    return `${level.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
  }).join(", ");

  const ring = document.createElement("span");
  ring.className = "sensor-cluster__ring";
  ring.style.background = `conic-gradient(from 0deg, ${stops})`;
  el.appendChild(ring);

  const core = document.createElement("span");
  core.className = "sensor-cluster__core";
  core.textContent = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
  el.appendChild(core);

  return el;
};

export const roundPM25 = (value: number | null): string | null => {
  return value !== null ? Math.round(value).toString() : null;
};

export const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export interface QualityInfo {
  label: string;
  color: string;
  textColor: string;
  generalRec: string;
  sensitiveRecs: {
    menores: string;
    adultos: string;
    embarazadas: string;
    enfermedades: string;
  };
}

export const getQualityInfo = (pm25: number | null): QualityInfo | null => {
  if (pm25 === null || pm25 <= 0.4) return null;
  if (pm25 <= 15) return {
    label: IMECA_LEVELS[0].label, color: IMECA_LEVELS[0].color, textColor: IMECA_LEVELS[0].ink,
    generalRec: "Disfruta las actividades al aire libre.",
    sensitiveRecs: {
      menores: "Disfruta las actividades al aire libre.",
      adultos: "Disfruta las actividades al aire libre.",
      embarazadas: "Disfruta las actividades al aire libre.",
      enfermedades: "Disfruta las actividades al aire libre.",
    },
  };
  if (pm25 <= 25) return {
    label: IMECA_LEVELS[1].label, color: IMECA_LEVELS[1].color, textColor: IMECA_LEVELS[1].ink,
    generalRec: "Disfruta las actividades al aire libre. Infórmate sobre la evolución de la calidad del aire.",
    sensitiveRecs: {
      menores: "Disfruta las actividades al aire libre.",
      adultos: "Reduce las actividades físicas vigorosas al aire libre.",
      embarazadas: "Disfruta las actividades al aire libre.",
      enfermedades: "Reduce las actividades físicas vigorosas al aire libre.",
    },
  };
  if (pm25 <= 79) return {
    label: IMECA_LEVELS[2].label, color: IMECA_LEVELS[2].color, textColor: IMECA_LEVELS[2].ink,
    generalRec: "Es posible realizar actividades al aire libre. Si presentas síntomas como tos o falta de aire, toma más descansos y realiza actividades menos vigorosas.",
    sensitiveRecs: {
      menores: "Reduce las actividades físicas vigorosas al aire libre. Es posible hacer actividades moderadas en el exterior.",
      adultos: "Reduce las actividades físicas vigorosas al aire libre.",
      embarazadas: "Reduce las actividades físicas vigorosas al aire libre. Es posible hacer actividades moderadas en el exterior.",
      enfermedades: "Reduce las actividades físicas vigorosas al aire libre.",
    },
  };
  if (pm25 <= 130) return {
    label: IMECA_LEVELS[3].label, color: IMECA_LEVELS[3].color, textColor: IMECA_LEVELS[3].ink,
    generalRec: "Reduce las actividades físicas al aire libre. Evita la actividad física vigorosa o prolongada en exteriores.",
    sensitiveRecs: {
      menores: "Evita la actividad física al aire libre. Consulta a tu médico si presentas síntomas.",
      adultos: "Evita las actividades físicas y el tiempo al aire libre. Acude al médico si presentas síntomas.",
      embarazadas: "Evita la actividad física al aire libre. Consulta a tu médico si presentas síntomas.",
      enfermedades: "Evita las actividades físicas al aire libre. Acude al médico si presentas síntomas.",
    },
  };
  return {
    label: IMECA_LEVELS[4].label, color: IMECA_LEVELS[4].color, textColor: IMECA_LEVELS[4].ink,
    generalRec: "Permanece en interiores. Si presentas síntomas respiratorios o cardiacos acude al médico.",
    sensitiveRecs: {
      menores: "Permanece en interiores. Acude al médico si presentas síntomas.",
      adultos: "Permanece en interiores. Acude al médico si presentas síntomas.",
      embarazadas: "Permanece en interiores. Acude al médico si presentas síntomas.",
      enfermedades: "Permanece en interiores. Acude al médico si presentas síntomas.",
    },
  };
};
