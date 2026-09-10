import { createClient } from "@/utils/supabase/server";
import { getPM25Color, roundPM25 } from "@/lib/air-quality";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Pilot: August 2026 only, PM2.5 only. Reads sima_promedios_diarios (a view
// over sima_mediciones_finales that applies the >=18-valid-hour / 75%
// completeness rule per NGO/methodology convention) and sima_sensores
// (station labels only, never written here).
const PARAM = "PM2.5";
const FECHA_INI = "2026-08-01";
const FECHA_FIN = "2026-09-01";

function diasDeAgosto(): string[] {
  const dias: string[] = [];
  for (let d = 1; d <= 31; d++) {
    dias.push(`2026-08-${String(d).padStart(2, "0")}`);
  }
  return dias;
}

export default async function Pm25DailyTable() {
  const supabase = await createClient();

  const [{ data: estaciones, error: estacionesError }, { data: promedios, error: promediosError }] =
    await Promise.all([
      supabase
        .from("sima_sensores")
        .select("sensor_id, nombre_display")
        .neq("sensor_id", "FIN")
        .order("nombre_display"),
      supabase
        .from("sima_promedios_diarios")
        .select("sensor_id, fecha, promedio")
        .eq("parametro", PARAM)
        .gte("fecha", FECHA_INI)
        .lt("fecha", FECHA_FIN),
    ]);

  if (estacionesError || promediosError) {
    throw new Error(
      `Failed to load PM2.5 daily table: ${estacionesError?.message ?? promediosError?.message}`,
    );
  }

  const porCelda = new Map<string, number | null>();
  for (const row of promedios ?? []) {
    porCelda.set(`${row.sensor_id}|${row.fecha}`, row.promedio);
  }

  const dias = diasDeAgosto();

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 bg-white text-xs font-medium uppercase tracking-wide text-gray-400">
              Día
            </TableHead>
            {(estaciones ?? []).map((estacion) => (
              <TableHead
                key={estacion.sensor_id}
                className="whitespace-nowrap text-xs font-medium text-gray-500"
              >
                {estacion.nombre_display}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {dias.map((fecha) => (
            <TableRow key={fecha} className="border-t border-gray-100">
              <TableCell className="sticky left-0 z-10 bg-white text-sm font-medium text-gray-700">
                {fecha.slice(-2)}
              </TableCell>
              {(estaciones ?? []).map((estacion) => {
                const promedio = porCelda.get(`${estacion.sensor_id}|${fecha}`) ?? null;
                const colorInfo = getPM25Color(promedio);
                return (
                  <TableCell
                    key={estacion.sensor_id}
                    className="text-sm font-medium"
                    style={colorInfo ? { color: colorInfo.text } : undefined}
                  >
                    {promedio !== null ? roundPM25(promedio) : (
                      <span className="text-gray-300">–</span>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
