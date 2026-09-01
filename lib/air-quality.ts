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

// Marker fills are the index color nudged a fixed step toward that same level's
// darker `ink`. Enough to take the electric edge off IMECA yellow and green on
// a pale basemap without shifting hue or breaking the read-back to the legend
// swatch. Mala, Muy mala and Extrem. already have ink === color, so they are
// untouched. The legend bar keeps the pure `color`.
export const MARKER_INK_MIX = 0.22;
export const getMarkerFill = (pm25: number | null): string | null => {
  if (pm25 === null || pm25 <= 0.4) return null;
  const level = getLevel(pm25);
  return `color-mix(in srgb, ${level.color} ${Math.round((1 - MARKER_INK_MIX) * 100)}%, ${level.ink})`;
};

// Markers are siblings in one container (mapbox appends every custom element
// straight into the canvas container) and so paint in DOM order. Which one wins
// an overlap is therefore a sampling rule, and a sampling rule correlated with
// the value on display biases the display: ordering by severity showed the
// worst reading in every overlap and hid the rest, making the basin look worse
// than the sensors say, with nothing on screen admitting that anything had been
// hidden. Order comes from latitude instead — see the marker build effect in
// mapa-sensors.tsx — which is mapbox's own convention for symbols
// (symbol-z-order: viewport-y) precisely because it is independent of the data.
// Markers are one size at every zoom, so the tie-break is live wherever discs
// overlap.
//
// Only these lifts are value-independent and so allowed to override it: the
// selected marker and the one under the pointer. The hover lift is what makes a
// click land on the disc you are actually pointing at: every marker's hit box
// is a square, so in a dense knot the squares overlap and, with all of them at
// the same z, the one that wins the click is just whichever mapbox drew last,
// not the one under the cursor. Raising the hovered marker above the field
// resolves that to the visible dot. Kept tiny, because the map container opens
// no stacking context and these compete directly with the floating panels at
// z-10.
export const ACTIVE_MARKER_Z = 6;
export const HOVER_MARKER_Z = 7;

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

export const roundPM25 = (value: number | null): string | null => {
  return value !== null ? Math.round(value).toString() : null;
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
