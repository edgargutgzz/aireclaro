// The US EPA correction for PurpleAir PM2.5 (Barkjohn et al. 2021, extended
// for high concentrations in 2023; the version on AirNow's Fire and Smoke Map).
// Raw PurpleAir over-reads PM2.5, most in humid air, so every citizen reading
// shown on the site goes through this; purpleair_mediciones keeps the raw value.
//
// The formula is defined on the CF=1 channel. We store PurpleAir's 60-minute
// average, which for outdoor sensors is the ATM channel (PurpleAir staff,
// community.purpleair.com thread 4593). The two match below ~28 µg/m³; above
// it ATM reads lower, so a corrected high reading may come out a little low.
// Checked 2026-10-30 against SIMA stations within 1.5 km (18 pairs, 2,644
// hours): category agreement 53% raw → 79% corrected.
export function correctPurpleAirPM25(pa: number, humidity: number): number {
  const rh = humidity;
  let pm25: number;
  if (pa < 30) {
    pm25 = 0.524 * pa - 0.0862 * rh + 5.75;
  } else if (pa < 50) {
    const f = pa / 20 - 3 / 2;
    pm25 = (0.786 * f + 0.524 * (1 - f)) * pa - 0.0862 * rh + 5.75;
  } else if (pa < 210) {
    pm25 = 0.786 * pa - 0.0862 * rh + 5.75;
  } else if (pa < 260) {
    const f = pa / 50 - 21 / 5;
    pm25 =
      (0.69 * f + 0.786 * (1 - f)) * pa -
      0.0862 * rh * (1 - f) +
      2.966 * f +
      5.75 * (1 - f) +
      8.84e-4 * pa * pa * f;
  } else {
    pm25 = 2.966 + 0.69 * pa + 8.84e-4 * pa * pa;
  }
  // The EPA floors at 0; the site reads anything up to 0.4 as no data
  // (isValidPM25), so a very clean, humid hour is floored at 1 instead of
  // turning the sensor gray (~2% of October 2026 readings).
  return Math.max(pm25, 1);
}

// Corrects a batch of readings from about the same hour. A sensor with no
// humidity (7 devices never report it) uses the batch's median humidity:
// humidity barely varies across the metro area within an hour.
export function correctPurpleAirReadings<T extends { pm25: number; humidity: number | null }>(
  readings: T[],
): T[] {
  const known = readings.map((r) => r.humidity).filter((h): h is number => h != null);
  const fallback = median(known);
  return readings.map((r) => {
    const rh = r.humidity ?? fallback;
    return rh == null ? r : { ...r, pm25: correctPurpleAirPM25(r.pm25, rh) };
  });
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
