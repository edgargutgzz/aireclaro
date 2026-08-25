import { createClient } from "@/utils/supabase/server";

// NOM-025-SSA1-2021 daily PM2.5 limit. 33 µg/m³ in 2025, lowered to 25 µg/m³ in 2026.
const PM25_LIMIT = 25;

// A station-day only counts if at least 75% of the day's hours (18 of 24) have a reading.
const MIN_VALID_HOURS = 18;

export interface DiaInsalubre {
  dia: number;
  estatus: "insalubre" | "saludable" | null;
}

interface StationDayStats {
  hours: Set<number>;
  sum: number;
  count: number;
}

export default async function SimaDiasInsalubres(
  year: number,
  month: number, // 1-indexed
): Promise<DiaInsalubre[]> {
  const supabase = await createClient();

  const start = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 19);
  const end = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 19);
  const daysInMonth = new Date(year, month, 0).getDate();

  const pageSize = 1000;

  const { count, error: countError } = await supabase
    .from("sima_mediciones")
    .select("sensor_id", { count: "exact", head: true })
    .neq("sensor_id", "FIN") // exclude the Saltillo station
    .gte("time_stamp", start)
    .lt("time_stamp", end);
  if (countError) {
    console.error("SIMA días insalubres count error:", countError);
    throw new Error(`Failed to count SIMA mediciones: ${countError.message}`);
  }

  const pageCount = Math.ceil((count ?? 0) / pageSize);
  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, i) =>
      supabase
        .from("sima_mediciones")
        .select("sensor_id, pm25, time_stamp")
        .neq("sensor_id", "FIN")
        .gte("time_stamp", start)
        .lt("time_stamp", end)
        .order("time_stamp", { ascending: true })
        .order("sensor_id", { ascending: true })
        .range(i * pageSize, i * pageSize + pageSize - 1),
    ),
  );

  const rows: { sensor_id: string; pm25: number; time_stamp: string }[] = [];
  for (const { data, error } of pages) {
    if (error) {
      console.error("SIMA días insalubres fetch error:", error);
      throw new Error(`Failed to fetch SIMA mediciones: ${error.message}`);
    }
    if (data) rows.push(...data);
  }

  const byStationDay = new Map<string, StationDayStats>();

  for (const row of rows) {
    if (row.pm25 === null) continue;
    const date = new Date(row.time_stamp);
    const day = date.getDate();
    const hour = date.getHours();
    const key = `${row.sensor_id}_${day}`;
    let entry = byStationDay.get(key);
    if (!entry) {
      entry = { hours: new Set(), sum: 0, count: 0 };
      byStationDay.set(key, entry);
    }
    entry.hours.add(hour);
    entry.sum += row.pm25;
    entry.count += 1;
  }

  const dayStatus = new Map<number, "insalubre" | "saludable" | null>();
  for (let dia = 1; dia <= daysInMonth; dia++) dayStatus.set(dia, null);

  for (const [key, entry] of byStationDay) {
    if (entry.hours.size < MIN_VALID_HOURS) continue;
    const day = Number(key.split("_").pop());
    const dailyValue = Math.round(entry.sum / entry.count);
    if (dailyValue > PM25_LIMIT) {
      dayStatus.set(day, "insalubre");
    } else if (dayStatus.get(day) !== "insalubre") {
      dayStatus.set(day, "saludable");
    }
  }

  return Array.from(dayStatus.entries())
    .map(([dia, estatus]) => ({ dia, estatus }))
    .sort((a, b) => a.dia - b.dia);
}
