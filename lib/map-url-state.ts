// Shareable map state in the query string. Read once on load, written back on
// change through the History API directly — never the Next router, whose
// replace() refetches the page's RSC payload on every call. The map only needs
// the URL as an input on load and an output on change, so plain
// history.replaceState is all it takes, and the page stays as static as it was.
//
//   ?sensor=<id>              the picked station
//   ?src=occamm,otros,gob     which Fuente groups are shown (omitted = all;
//                             "none" = all hidden)
//   ?hide=monterrey,guadalupe hidden municipio keys (normalizeName form)

const SENSOR_PARAM = "sensor";
const SRC_PARAM = "src";
const HIDE_PARAM = "hide";

type SrcKind = "occamm" | "otros" | "gob";
export type SrcState = Record<SrcKind, boolean>;

function replaceIfChanged(url: URL): void {
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) window.history.replaceState(null, "", next);
}

// ---- ?sensor= --------------------------------------------------------------

// The sensor_id named in ?sensor= at load, or null. Rejects anything that
// isn't a positive integer so a junk param can't become a NaN lookup.
export function readSensorParam(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get(SENSOR_PARAM);
  if (!raw) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Mirror the current selection into ?sensor=. Passing null drops the param,
// which also cleans up a stale or unresolvable id on the first render.
export function writeSensorParam(sensorId: number | null): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (sensorId == null) url.searchParams.delete(SENSOR_PARAM);
  else url.searchParams.set(SENSOR_PARAM, String(sensorId));
  replaceIfChanged(url);
}

// ---- ?src= / ?hide= ----------------------------------------------------------

// null src means the param was absent or named nothing valid — treat as "all
// sources on" rather than "all off", so a typo doesn't blank the map.
export function readFilterParams(): { src: SrcState | null; hide: string[] } {
  if (typeof window === "undefined") return { src: null, hide: [] };
  const p = new URLSearchParams(window.location.search);

  const rawSrc = p.get(SRC_PARAM);
  let src: SrcState | null = null;
  if (rawSrc === "none") {
    src = { occamm: false, otros: false, gob: false };
  } else if (rawSrc != null) {
    const on = new Set(rawSrc.split(",").map((s) => s.trim()).filter(Boolean));
    const parsed: SrcState = { occamm: on.has("occamm"), otros: on.has("otros"), gob: on.has("gob") };
    if (parsed.occamm || parsed.otros || parsed.gob) src = parsed;
  }

  const rawHide = p.get(HIDE_PARAM);
  const hide = rawHide ? rawHide.split(",").map((s) => s.trim()).filter(Boolean) : [];

  return { src, hide };
}

export function writeFilterParams(state: {
  showOccamm: boolean;
  showOtros: boolean;
  showSima: boolean;
  hiddenMunicipios: string[];
}): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);

  const on: string[] = [];
  if (state.showOccamm) on.push("occamm");
  if (state.showOtros) on.push("otros");
  if (state.showSima) on.push("gob");

  if (on.length === 3) url.searchParams.delete(SRC_PARAM);
  else url.searchParams.set(SRC_PARAM, on.length ? on.join(",") : "none");

  if (state.hiddenMunicipios.length) url.searchParams.set(HIDE_PARAM, state.hiddenMunicipios.join(","));
  else url.searchParams.delete(HIDE_PARAM);

  replaceIfChanged(url);
}
