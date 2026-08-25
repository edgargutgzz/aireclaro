import fs from "fs";
import path from "path";
import type { DiaInsalubre } from "@/components/data/sima-dias-insalubres";

const DATA_DIR = path.join(process.cwd(), "data", "dias-insalubres");

// Months before the SIMA reconnection (late June 2026) have no rows in
// Supabase at all. For those, and for anything before it, we use a static
// snapshot provided directly from SINAICA's own daily-validated exports
// instead of querying the (empty) live table.
export function getDiasInsalubresHistorico(year: number, month: number): DiaInsalubre[] | null {
  const filePath = path.join(DATA_DIR, `${year}-${String(month).padStart(2, "0")}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as DiaInsalubre[];
}
