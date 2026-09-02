// Readings are stored as naive Monterrey wall-clock — no UTC offset in the
// string. Mexico dropped DST nationally in 2022 and Nuevo León isn't one of the
// US-border municipalities that kept it, so it's a fixed UTC-6 year-round. Any
// comparison against a time_stamp column has to be built in the same naive
// local terms or it silently loses hours equal to the offset.
export const MONTERREY_UTC_OFFSET_MS = -6 * 60 * 60 * 1000;

// "now", and "now minus N hours", as naive local ISO strings (no trailing Z) —
// the shape the time_stamp column is stored in, so gte/lte compare like for like.
export function monterreyNaiveNow(): string {
  return new Date(Date.now() + MONTERREY_UTC_OFFSET_MS).toISOString().replace("Z", "");
}

export function monterreyNaiveHoursAgo(hours: number): string {
  return new Date(Date.now() + MONTERREY_UTC_OFFSET_MS - hours * 3_600_000)
    .toISOString()
    .replace("Z", "");
}

// Parse a stored naive wall-clock string as an instant without the server's own
// timezone shifting it: treat the printed parts as UTC. Use only for formatting
// the parts back out (never for "how long ago"), since the instant is offset by
// six hours from the real one.
export function parseMonterreyNaive(ts: string): Date {
  return new Date(ts.replace(" ", "T").replace(/Z?$/, "") + "Z");
}

// The hour bucket a naive timestamp falls in, as "YYYY-MM-DDTHH" — the key the
// field-history series is aligned on.
export function monterreyHourKey(ts: string): string {
  return ts.replace(" ", "T").slice(0, 13);
}
