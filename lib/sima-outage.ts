// The notice shown when most official stations stop updating at once (a
// network or transmission outage, like SINAICA's Nuevo León feed on
// 2026-10-05/06), on the map only (the homepage ticker just grays out). Plain
// language for citizens (the user's own wording): no SINAICA, no cause, just
// that the official stations aren't updating here and where the state's own
// data is.

// Of the 15 metro stations, at least this many without a reading from the
// last 3 hours counts as an outage rather than a few stations off.
export const SIMA_OUTAGE_MIN_SILENT = 10;

export const SIMA_OUTAGE_TEXT =
  "Por el momento las estaciones oficiales del SIMA no se están actualizando en este mapa. Consulta los datos del Gobierno de Nuevo León en";

export const SIMA_OUTAGE_LINK = { href: "https://aire.nl.gob.mx/", label: "aire.nl.gob.mx" };
