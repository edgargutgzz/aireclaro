// Official Mexican Air and Health Index (NOM-172-SEMARNAT-2019, Tabla 11)
// levels for PM2.5, and the single source of truth for the scale's colors.
//
// Two tokens per level:
//   `color` — the index's own NOM-172 color, untouched. Use it for anything
//     with area: legend swatches, the scale bar, map-marker bodies, the
//     selected-marker pulse halo, a status chip's fill.
//   `ink` — the same hue, darkened (and saturation held) only as far as it
//     needs to clear 3:1 on white — the WCAG floor for large bold text and
//     for graphical/non-text objects, which is what every `ink` use actually
//     is (never body text): the card's quality headline (24–30px bold), the
//     marker rim, the legend swatch's inset hairline. Not the stricter 4.5:1 body-text
//     floor — that was leaving real vividness on the table for no
//     accessibility gain. There is no honest dark "yellow" at any contrast
//     floor, so Aceptable's ink is nudged to gold; Muy mala and Extrem.
//     already clear 3:1 at their official `color`, so ink === color for both.
//
// `numberInk` is the third digit-ink token: the flat colour the marker's
// printed PM2.5 number takes straight on the mixed fill (getMarkerFillHex).
// `#283240` clears the house's own 3:1 floor for large bold non-body text
// (see `ink` above) on every level's fill — the tightest case is Muy mala's
// red at ~3.2:1, still a real margin — while reading lighter than stone-800
// (#1f2937, ~3.7:1 on that same case), which read too close to near-black.
// Extremadamente mala's deep purple still takes white; no ink survives that
// fill at a useful contrast.
// `bounds` is the level's PM2.5 span with no unit: the legend prints μg/m³
// once in its header, not on every row.
export const IMECA_LEVELS = [
  { limit: 15, label: "Buena", bounds: "0 – 15", color: "#00e400", ink: "#00a400", numberInk: "#283240" },
  { limit: 25, label: "Aceptable", bounds: "15 – 25", color: "#ffff00", ink: "#ad8900", numberInk: "#283240" },
  { limit: 79, label: "Mala", bounds: "25 – 79", color: "#ff7e00", ink: "#de6e00", numberInk: "#283240" },
  { limit: 130, label: "Muy mala", bounds: "79 – 130", color: "#ff0000", ink: "#ff0000", numberInk: "#283240" },
  { limit: Infinity, label: "Extremadamente mala", bounds: "> 130", color: "#8f3f97", ink: "#8f3f97", numberInk: "#ffffff" },
] as const;


export const getLevel = (pm25: number) =>
  IMECA_LEVELS.find((level) => pm25 <= level.limit) ?? IMECA_LEVELS[IMECA_LEVELS.length - 1];

// The number's ink for a reading, picked by the fill's luminance (AirNow /
// PurpleAir / IQAir convention). Used by both the selected DOM marker and the
// GL field's label layer, so the two treatments match.
export const getMarkerNumberInk = (pm25: number): string => getLevel(pm25).numberInk;

// A real reading: -9999 and small negatives (and anything up to 0.4, which
// rounds to 0) are the feeds' no-data values.
export const isValidPM25 = (pm25: number | null | undefined): pm25 is number => pm25 != null && pm25 > 0.4;

export const getPM25Color = (pm25: number | null): { bg: string; text: string } | null => {
  if (!isValidPM25(pm25)) return null;
  const level = getLevel(pm25);
  return { bg: level.color, text: level.ink };
};

// Marker fills are the index color nudged a fixed step toward that same
// level's darker `ink` — ~25%. Enough to take the electric edge off IMECA
// yellow and green on a pale basemap without shifting hue or breaking the
// read-back to the legend swatch. Extrem. has ink === color, so it is
// untouched. The legend bar keeps the pure `color`. The resting-disc alpha
// (75%) is a separate lever and lives in globals.css, not here.
//
// `ink` was retuned lighter (§ above, 3:1 not 4.5:1) after this mix was
// tuned, so the calming effect here is weaker than when this constant was
// last set — re-check the marker field on a real map if it reads too
// electric again, and raise this mix rather than re-darkening `ink`.
export const MARKER_INK_MIX = 0.25;
export const getMarkerFill = (pm25: number | null): string | null => {
  if (!isValidPM25(pm25)) return null;
  const level = getLevel(pm25);
  return `color-mix(in srgb, ${level.color} ${Math.round((1 - MARKER_INK_MIX) * 100)}%, ${level.ink})`;
};

// The same mix as getMarkerFill, resolved to a plain hex string. Mapbox GL
// paint properties can't parse CSS `color-mix()`, so the GL marker field
// (components/mapa/mapa-sensors.tsx) precomputes each disc's fill through this.
// Numeric sRGB blend: (1 - MARKER_INK_MIX) of the level `color` + MARKER_INK_MIX
// of its `ink`, identical to what the browser resolves for the DOM markers.
const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const rgbToHex = (r: number, g: number, b: number): string =>
  "#" + [r, g, b].map((n) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0")).join("");

// The house calming mix -- `color` nudged toward its `ink` by `t`. Exported
// so any other data surface (not just map markers) can reuse the exact same
// treatment instead of inventing its own tone. `t` defaults to the marker
// mix, but callers may pass their own (e.g. 0 to intentionally skip
// calming, which is what Muy mala/Extrem. amount to anyway since their ink
// already equals their color).
export const mixColorInk = (color: string, ink: string, t: number = MARKER_INK_MIX): string => {
  const [cr, cg, cb] = hexToRgb(color);
  const [ir, ig, ib] = hexToRgb(ink);
  return rgbToHex(cr * (1 - t) + ir * t, cg * (1 - t) + ig * t, cb * (1 - t) + ib * t);
};

export const getMarkerFillHex = (pm25: number | null): string | null => {
  if (!isValidPM25(pm25)) return null;
  const level = getLevel(pm25);
  return mixColorInk(level.color, level.ink);
};

// `label` becomes the marker's accessible name — without it the markers are
// unreachable by keyboard and announce as nothing to a screen reader.
//
// `isSima` pins a small Landmark badge to the disc's upper-right (styled in
// globals.css, `.sensor-marker__badge`) so the government reference stations
// read apart from the citizen field. The disc itself is untouched: a different
// shape (squircle) was built and pulled, and a glyph inside the fill is the
// PM2.5-number problem again. The badge is a child of the dot so it tracks the
// selected disc's scale and lift; the network is also on the estación card, in
// Capas → Fuente, and in this button's aria-label.
//
// The two networks no longer split by weight (disc size / rest alpha) —
// same disc, same size, for SIMA and citizen alike; only the badge above
// says which network a station belongs to.
// `hasReading` false means the caller passed a placeholder pm25 just to get a
// disc rendered (a SIMA station silent for the hour) — the grey nodata fill
// comes entirely from CSS, so no number should print over it.
export const createMarker = (
  pm25: number | null,
  label?: string,
  isSima = false,
  hasReading = true,
): HTMLElement | null => {
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
  el.className = isSima ? "sensor-marker sensor-marker--sima" : "sensor-marker sensor-marker--citizen";
  if (label) el.setAttribute("aria-label", label);
  el.style.border = "none";
  el.style.padding = "0";
  el.style.background = "none";

  const pulse = document.createElement("span");
  pulse.className = "sensor-marker__pulse";
  el.appendChild(pulse);

  const dot = document.createElement("span");
  dot.className = "sensor-marker__dot";
  dot.style.borderRadius = "50%";
  // A dedicated child, not dot.textContent directly: the SIMA badge below is
  // also a child of dot, and .textContent replaces *every* child node —
  // repainting the number that way silently deleted the badge on the first
  // live-data refresh after creation (paintSelectedMarker in
  // mapa-sensors.tsx does the same repaint, same reason).
  const number = document.createElement("span");
  number.className = "sensor-marker__number";
  if (hasReading) number.textContent = Math.round(pm25!).toString();
  dot.appendChild(number);
  // Handed to CSS so the stylesheet owns the rim, the fill alpha and the
  // printed number:
  //   --marker-fill   the mixed colour, painted by globals.css at 75% at rest
  //                   and solid on the selected disc
  //   --marker-edge   the ink hairline that keeps a pale fill from dissolving
  //                   into pale terrain
  //   --marker-number the digit ink, straight on the fill (getMarkerNumberInk)
  dot.style.setProperty("--marker-fill", bg);
  dot.style.setProperty("--marker-edge", level.ink);
  dot.style.setProperty("--marker-number", level.numberInk);
  dot.style.setProperty(
    "--marker-number-shadow",
    level.numberInk === "#ffffff" ? "0 1px 2px rgba(0, 0, 0, 0.3)" : "0 1px 1px rgba(255, 255, 255, 0.4)",
  );
  el.appendChild(dot);

  // Government (SIMA) badge: the Landmark mark the Capas panel and estación
  // card already use for "gobierno", on its own neutral stone-600 ground so it
  // never has to hold contrast against the five air-quality fills. Sits on
  // __dot to scale with the selected disc. Decorative — network is in aria-label.
  if (isSima) {
    const badge = document.createElement("span");
    badge.className = "sensor-marker__badge";
    badge.setAttribute("aria-hidden", "true");
    badge.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">' +
      '<polygon points="12 2 20 7 4 7" fill="currentColor" stroke="none" />' +
      '<line x1="4" x2="20" y1="22" y2="22" />' +
      '<line x1="7" x2="7" y1="18" y2="11" />' +
      '<line x1="12" x2="12" y1="18" y2="11" />' +
      '<line x1="17" x2="17" y1="18" y2="11" />' +
      "</svg>";
    dot.appendChild(badge);
  }

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
  // The norm's full message for población general, behind "Ver más" (AdviceText).
  generalFull?: string;
  // The two sensitive groups of NOM-172-SEMARNAT-2023, Tabla 12.
  sensitiveRecs: {
    menoresGestantes: string;
    enfermedadesMayores: string;
  };
  // The norm's full message for a group, verbatim from Tabla 12, shown behind
  // a "Ver más" after the short one (AdviceText). Only where it
  // says more than the short text.
  sensitiveFull?: Partial<Record<keyof QualityInfo["sensitiveRecs"], string>>;
}

// `color` is the official NOM-172 fill; `textColor` is the level's `ink`, the
// same hue darkened to clear 4.5:1 on white. The card's quality headline uses
// `textColor`.
export const getQualityInfo = (pm25: number | null): QualityInfo | null => {
  if (!isValidPM25(pm25)) return null;
  if (pm25 <= 15) return {
    label: IMECA_LEVELS[0].label, color: IMECA_LEVELS[0].color, textColor: IMECA_LEVELS[0].ink,
    generalRec: "Disfruta las actividades al aire libre.",
    sensitiveRecs: {
      menoresGestantes: "Disfruta las actividades al aire libre.",
      enfermedadesMayores: "Disfruta las actividades al aire libre.",
    },
  };
  if (pm25 <= 25) return {
    label: IMECA_LEVELS[1].label, color: IMECA_LEVELS[1].color, textColor: IMECA_LEVELS[1].ink,
    generalRec: "Disfruta las actividades al aire libre.",
    generalFull: "Disfruta las actividades al aire libre. Infórmate sobre la evolución de la calidad del aire.",
    sensitiveRecs: {
      menoresGestantes: "Disfruta las actividades al aire libre.",
      enfermedadesMayores: "Reduce las actividades físicas vigorosas al aire libre.",
    },
    sensitiveFull: {
      menoresGestantes: "Disfruta las actividades al aire libre. Infórmate sobre la evolución de la calidad del aire.",
      enfermedadesMayores: "Es posible realizar actividades físicas al aire libre como trotar suave, caminar a paso rápido o moverse en bicicleta, monopatín/scooter, patines y patinetas. Reduce las actividades físicas vigorosas al aire libre como ejercicios aeróbicos, jugar fútbol, básquetbol, voleibol, atletismo, ciclismo deportivo o correr. Si presentas algún síntoma o molestia o tienes dudas, busca el consejo de tu médico. Infórmate sobre la evolución de la calidad del aire.",
    },
  };
  if (pm25 <= 79) return {
    label: IMECA_LEVELS[2].label, color: IMECA_LEVELS[2].color, textColor: IMECA_LEVELS[2].ink,
    generalRec: "Es posible realizar actividades al aire libre. Si presentas síntomas como tos o falta de aire, toma más descansos y realiza actividades menos vigorosas.",
    sensitiveRecs: {
      menoresGestantes: "Reduce las actividades físicas vigorosas al aire libre. Es posible hacer actividades moderadas en el exterior.",
      enfermedadesMayores: "Reduce las actividades físicas vigorosas al aire libre.",
    },
    sensitiveFull: {
      enfermedadesMayores: "Reduce las actividades físicas vigorosas al aire libre como ejercicios aeróbicos, jugar fútbol, básquetbol, voleibol, atletismo, ciclismo deportivo o correr, trotar suave, caminar a paso rápido o moverse en bicicleta, monopatín/scooter, patines y patinetas. Si presentas algún síntoma o molestia o tienes dudas, busca el consejo de tu médico. Infórmate sobre la evolución de la calidad del aire.",
    },
  };
  if (pm25 <= 130) return {
    label: IMECA_LEVELS[3].label, color: IMECA_LEVELS[3].color, textColor: IMECA_LEVELS[3].ink,
    generalRec: "Reduce las actividades físicas al aire libre. Evita la actividad física vigorosa o prolongada en exteriores.",
    sensitiveRecs: {
      menoresGestantes: "Evita la actividad física al aire libre. Consulta a tu médico si presentas síntomas.",
      enfermedadesMayores: "Evita las actividades físicas y el tiempo al aire libre. Acude al médico si presentas síntomas.",
    },
    sensitiveFull: {
      enfermedadesMayores: "Es posible realizar actividades físicas en espacios interiores, siempre y cuando se trate de un espacio libre de humo de tabaco. Evita las actividades físicas vigorosas y moderadas, así como el tiempo de estancia al aire libre. Si presentas algún síntoma o molestia o tienes dudas, busca el consejo de tu médico. Infórmate sobre la evolución de la calidad del aire.",
    },
  };
  return {
    label: IMECA_LEVELS[4].label, color: IMECA_LEVELS[4].color, textColor: IMECA_LEVELS[4].ink,
    generalRec: "Permanece en interiores. Si presentas síntomas respiratorios o cardiacos acude al médico.",
    sensitiveRecs: {
      menoresGestantes: "Permanece en interiores. Acude al médico si presentas síntomas.",
      enfermedadesMayores: "Permanece en interiores. Acude al médico si presentas síntomas.",
    },
    sensitiveFull: {
      enfermedadesMayores: "Permanece en espacios interiores en donde puedes realizar actividades físicas, reprograma tus actividades al aire libre y si presentas síntomas respiratorios y/o cardiacos acude al médico. Infórmate sobre la evolución de la calidad del aire.",
    },
  };
};
