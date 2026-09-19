import { createClient } from "@/utils/supabase/server";
import { getPM25Color, roundPM25 } from "@/lib/air-quality";

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

  const [
    { data: estaciones, error: estacionesError },
    { data: promedios, error: promediosError },
  ] = await Promise.all([
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

  // Plain table -- was shadcn's Table primitive, replaced when shadcn was
  // dropped project-wide. Classes below are the exact resolved output of the
  // old primitive + this component's own className overrides (captured once
  // via the actual cn()/tailwind-merge pipeline before removing the
  // dependency, not retyped by hand), so the rendered result is unchanged.
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="relative w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b transition-colors hover:bg-gray-50">
              <th className="sticky left-0 z-10 h-10 bg-white px-2 text-left align-middle text-xs font-medium uppercase tracking-wide text-gray-400 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                Día
              </th>
              {(estaciones ?? []).map((estacion) => (
                <th
                  key={estacion.sensor_id}
                  className="h-10 whitespace-nowrap px-2 text-left align-middle text-xs font-medium text-gray-500 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]"
                >
                  {estacion.nombre_display}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {dias.map((fecha) => (
              <tr
                key={fecha}
                className="border-b border-t border-gray-100 transition-colors hover:bg-gray-50"
              >
                <td className="sticky left-0 z-10 bg-white p-2 align-middle text-sm font-medium text-gray-700 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                  {fecha.slice(-2)}
                </td>
                {(estaciones ?? []).map((estacion) => {
                  const promedio =
                    porCelda.get(`${estacion.sensor_id}|${fecha}`) ?? null;
                  const colorInfo = getPM25Color(promedio);
                  return (
                    <td
                      key={estacion.sensor_id}
                      className="p-2 align-middle text-sm font-medium [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]"
                      style={colorInfo ? { color: colorInfo.text } : undefined}
                    >
                      {promedio !== null ? (
                        roundPM25(promedio)
                      ) : (
                        <span className="text-gray-300">–</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
