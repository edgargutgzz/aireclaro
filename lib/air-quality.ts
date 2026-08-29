// Official Mexican Air and Health Index (NOM-172-SEMARNAT-2023) levels for
// PM2.5, and the single source of truth for the scale's colors.
//
// `color` is the index's own color — use it for anything filled: map markers,
// legend swatches and tints. `ink` is the same level darkened only as far as
// it must be to read on white — use it for text and hairlines, since pure
// #ffff00 disappears at 1px on a white chart. `legendInk` goes a step further
// for small labels sitting on a tinted chip.
export const IMECA_LEVELS = [
  { limit: 15, label: "Buena", range: "0 – 15 μg/m³", color: "#00e400", ink: "#00b300", legendInk: "#007200" },
  { limit: 25, label: "Aceptable", range: "15 – 25 μg/m³", color: "#ffff00", ink: "#b2b200", legendInk: "#808000" },
  { limit: 79, label: "Mala", range: "25 – 79 μg/m³", color: "#ff7e00", ink: "#ff7e00", legendInk: "#c05e00" },
  { limit: 130, label: "Muy mala", range: "79 – 130 μg/m³", color: "#ff0000", ink: "#ff0000", legendInk: "#b30000" },
  { limit: Infinity, label: "Extremadamente mala", range: "> 130 μg/m³", color: "#8f3f97", ink: "#8f3f97", legendInk: "#6b2f72" },
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

// `label` becomes the marker's accessible name — without it the markers are
// unreachable by keyboard and announce as nothing to a screen reader.
export const createMarker = (pm25: number | null, label?: string): HTMLElement | null => {
  const colorInfo = getPM25Color(pm25);
  if (!colorInfo) return null;

  const { bg } = colorInfo;
  const textColor = bg === "#ffff00" ? "#9ca3af" : "white";

  const el = document.createElement("button");
  el.type = "button";
  el.className = "sensor-marker";
  if (label) el.setAttribute("aria-label", label);
  el.style.border = "none";
  el.style.padding = "0";
  el.style.fontFamily = "inherit";
  el.style.width = "40px";
  el.style.height = "40px";
  el.style.backgroundColor = bg;
  // The pin's tail is drawn in CSS and needs this fill.
  el.style.setProperty("--pin-color", bg);
  el.style.borderRadius = "50%";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.opacity = "0.9";
  el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25), 0 0 0 2.5px white";
  el.textContent = Math.round(pm25!).toString();
  el.style.color = textColor;
  el.style.fontSize = "12px";
  el.style.fontWeight = "700";

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
