// When most official stations stop updating at once (a network or
// transmission outage), the homepage ticker switches to citizen sensors
// (components/home/ticker.tsx).

// Of the 15 metro stations, at least this many without a reading from the
// last 3 hours counts as an outage rather than a few stations off.
export const SIMA_OUTAGE_MIN_SILENT = 10;
