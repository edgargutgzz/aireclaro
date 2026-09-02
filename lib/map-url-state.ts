// Shareable map state in the query string. Read once on load, written back on
// change through the History API directly — never the Next router, whose
// replace() refetches the page's RSC payload on every call and, the moment
// page.tsx reads searchParams, forces the route dynamic and drops its ISR
// cache. The map only needs the URL as an input on load and an output on
// change, so plain history.replaceState is all it takes.
//
// v1 carries only the selected sensor (?sensor=<id>). Camera (?map=) and the
// Capas filters (?src=, ?hide=) are the next phases and slot in here.

const SENSOR_PARAM = "sensor";

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
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.replaceState(null, "", next);
  }
}
