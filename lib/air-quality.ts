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
//     sparkline dot rings, the sparkline threshold guides, the marker rim,
//     the legend swatch's inset hairline. Not the stricter 4.5:1 body-text
//     floor — that was leaving real vividness on the table for no
//     accessibility gain. There is no honest dark "yellow" at any contrast
//     floor, so Aceptable's ink is nudged to gold; Muy mala and Extrem.
//     already clear 3:1 at their official `color`, so ink === color for both.
//
// Markers print no number, so there is no third digit-ink token: the reading
// lives on the estación card and in each marker's aria-label (see createMarker).
// `bounds` is the level's PM2.5 span with no unit: the legend prints μg/m³
// once in its header, not on every row.
export const IMECA_LEVELS = [
  { limit: 15, label: "Buena", bounds: "0 – 15", color: "#00e400", ink: "#00a400" },
  { limit: 25, label: "Aceptable", bounds: "15 – 25", color: "#ffff00", ink: "#ad8900" },
  { limit: 79, label: "Mala", bounds: "25 – 79", color: "#ff7e00", ink: "#de6e00" },
  { limit: 130, label: "Muy mala", bounds: "79 – 130", color: "#ff0000", ink: "#ff0000" },
  { limit: Infinity, label: "Extremadamente mala", bounds: "> 130", color: "#8f3f97", ink: "#8f3f97" },
] as const;


// The boundaries between levels, each carrying the `ink` of the level it
// opens: these are 1px guide lines on the white sparkline, so they need the
// darkened hue to be visible at all (pure #ffff00 is invisible as a hairline).
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
//
// `isSima` pins a small Landmark badge to the disc's upper-right (styled in
// globals.css, `.sensor-marker__badge`) so the government reference stations
// read apart from the citizen field. The disc itself is untouched: a different
// shape (squircle) was built and pulled, and a glyph inside the fill is the
// PM2.5-number problem again. The badge is a child of the dot so it tracks the
// selected disc's scale and lift; the network is also on the estación card, in
// Capas → Fuente, and in this button's aria-label.
export const createMarker = (pm25: number | null, label?: string, isSima = false): HTMLElement | null => {
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
  el.className = isSima ? "sensor-marker sensor-marker--sima" : "sensor-marker";
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
  // No visible number: the exact reading lives on the estación card (always on
  // screen, with its word label) and in this button's aria-label. The marker
  // is a locator plus a severity colour, the IQAir / Google AQI model.
  // Handed to CSS so the stylesheet owns the rim and the fill alpha:
  //   --marker-fill   the mixed colour, painted by globals.css at 75% at rest
  //                   and solid on the selected disc
  //   --marker-edge   the ink hairline that keeps a pale fill from dissolving
  //                   into pale terrain
  dot.style.setProperty("--marker-fill", bg);
  dot.style.setProperty("--marker-edge", level.ink);
  el.appendChild(dot);

  // Government (SIMA) badge: the Landmark mark the Capas panel and estación
  // card already use for "gobierno", on its own dark ground so it never has to
  // hold contrast against the five air-quality fills. Sits on __dot to scale
  // with the selected disc. Decorative — the network is in the aria-label.
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
  sensitiveRecs: {
    menores: string;
    adultos: string;
    embarazadas: string;
    enfermedades: string;
  };
}

// `color` is the official NOM-172 fill; `textColor` is the level's `ink`, the
// same hue darkened to clear 4.5:1 on white. The card's quality headline uses
// `textColor`; the sparkline dot uses `color` for its body and `textColor`
// for its 1px ring.
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
