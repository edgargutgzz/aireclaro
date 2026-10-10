// The basemap's ground: one step off white, a very light warm grey. Kept in its
// own module so the loading placeholders can paint the same colour without
// pulling in the map's code, and the wait reads as one surface, not two greys.
export const BASEMAP_GROUND = "#f2f1ef";
