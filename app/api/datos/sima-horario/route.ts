import { NextRequest } from "next/server";
import { createPublicClient } from "@/utils/supabase/public";

// Bulk CSV download of sima_mediciones_finales: the raw hourly readings every
// /datos chart is computed from, exactly as SINAICA publishes them (no
// validation or rounding applied here). One tidy row per
// station/pollutant/date/hour. Filters: ?anio=2025|todos&parametro=PM2.5|PM10|todos
// &estacion=<sensor_id>|todas.
//
// Streamed, not buffered: a full year of every station and both pollutants is
// ~280k rows (~12 MB), well past PostgREST's 1000-row page cap, so it's read
// month by month (pages within a month in parallel) and written out as each
// month arrives. The browser starts the download on the first bytes.

export const maxDuration = 300;

const PAGE_SIZE = 1000; // PostgREST's max-rows on this project
const PARAMETROS = ["PM2.5", "PM10"] as const;
const FIRST_YEAR = 2025; // the table starts 2025-01-01

// The table's own column names, plus the station's name (a bare sensor_id
// means nothing outside the project). Left out: id and created_at (internal
// bookkeeping), sinaica_id (a second station code), and banda_o (a SINAICA
// flag with no public definition that none of our calculations use).
const HEADER = "fecha,hora,sensor_id,estacion,parametro,valor,val\n";

function badRequest(message: string) {
  return new Response(message, { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

// RFC 4180: quote only when the field needs it.
function csvField(value: string | number | null | undefined) {
  if (value == null) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const supabase = createPublicClient();

  const anioParam = params.get("anio") ?? "";
  const anio = anioParam === "todos" ? null : Number(anioParam);
  const parametro = params.get("parametro") ?? "todos";
  const estacion = params.get("estacion") ?? "todas";

  const currentYear = new Date().getUTCFullYear();
  if (anio !== null && (!Number.isInteger(anio) || anio < FIRST_YEAR || anio > currentYear)) {
    return badRequest(`anio debe ser todos o estar entre ${FIRST_YEAR} y ${currentYear}`);
  }
  if (parametro !== "todos" && !(PARAMETROS as readonly string[]).includes(parametro)) {
    return badRequest("parametro debe ser PM2.5, PM10 o todos");
  }

  // FIN is Saltillo, outside the Monterrey metro network every /datos chart
  // covers, so it's left out here too.
  const { data: sensores, error: sensoresError } = await supabase
    .from("sima_sensores")
    .select("sensor_id, nombre_display")
    .neq("sensor_id", "FIN");
  if (sensoresError) return new Response("Error al leer las estaciones", { status: 502 });

  const nombres = new Map((sensores ?? []).map((s) => [s.sensor_id as string, s.nombre_display as string]));
  if (estacion !== "todas" && !nombres.has(estacion)) {
    return badRequest("estacion no reconocida");
  }

  // Months to read: the chosen year (or every year), stopping at the latest
  // loaded date, so months with no data yet cost no queries.
  const { data: ultima, error: ultimaError } = await supabase
    .from("sima_mediciones_finales")
    .select("fecha")
    .order("fecha", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (ultimaError) return new Response("Error al leer las mediciones", { status: 502 });
  const ultimoMes = ultima ? Number(ultima.fecha.slice(0, 4)) * 12 + Number(ultima.fecha.slice(5, 7)) - 1 : -1;
  const months: { year: number; month: number }[] = [];
  for (let y = anio ?? FIRST_YEAR; y <= (anio ?? currentYear); y++) {
    for (let m = 1; m <= 12 && y * 12 + m - 1 <= ultimoMes; m++) months.push({ year: y, month: m });
  }

  const stationIds = estacion === "todas" ? [...nombres.keys()] : [estacion];
  const parametros = parametro === "todos" ? [...PARAMETROS] : [parametro];

  type Row = {
    fecha: string;
    hora: number;
    sensor_id: string;
    parametro: string;
    valor: number | null;
    val: number | null;
  };

  const fetchPage = async (desde: string, hasta: string, page: number) => {
    const { data, error } = await supabase
      .from("sima_mediciones_finales")
      .select("fecha, hora, sensor_id, parametro, valor, val")
      .gte("fecha", desde)
      .lt("fecha", hasta)
      .in("sensor_id", stationIds)
      .in("parametro", parametros)
      // The table's unique key, in its index order: offset paging stays
      // deterministic and the DB never has to sort. Re-sorted by time below.
      .order("sensor_id")
      .order("parametro")
      .order("fecha")
      .order("hora")
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    return (data ?? []) as Row[];
  };

  // One month of rows, in order. The row grid is complete (a null valor is
  // still a row), so the page count is known up front and fetched in
  // parallel; the loop only continues if that estimate ever falls short.
  const fetchMonth = async (year: number, month: number) => {
    const desde = `${year}-${pad2(month)}-01`;
    const hasta = month === 12 ? `${year + 1}-01-01` : `${year}-${pad2(month + 1)}-01`;
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const expected = Math.ceil((stationIds.length * parametros.length * days * 24) / PAGE_SIZE);
    const pages = await Promise.all(Array.from({ length: expected }, (_, i) => fetchPage(desde, hasta, i)));
    for (let next = expected; pages[pages.length - 1].length === PAGE_SIZE; next++) {
      pages.push(await fetchPage(desde, hasta, next));
    }
    return pages
      .flat()
      .sort(
        (a, b) =>
          a.fecha.localeCompare(b.fecha) ||
          a.hora - b.hora ||
          a.sensor_id.localeCompare(b.sensor_id) ||
          a.parametro.localeCompare(b.parametro),
      );
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // BOM so Excel opens the UTF-8 station names (accents) correctly.
        controller.enqueue(encoder.encode("﻿" + HEADER));
        for (const { year, month } of months) {
          const rows = await fetchMonth(year, month);
          if (rows.length === 0) continue;
          const lines = rows.map((r) =>
            [r.fecha, r.hora, r.sensor_id, nombres.get(r.sensor_id), r.parametro, r.valor, r.val]
              .map(csvField)
              .join(","),
          );
          controller.enqueue(encoder.encode(lines.join("\n") + "\n"));
        }
        controller.close();
      } catch (err) {
        // Headers are already sent, so the status can't change: erroring the
        // stream aborts the download instead of saving a silently cut file.
        controller.error(err);
      }
    },
  });

  const slug = [
    "sima-horario",
    anio ?? "todos",
    parametro === "todos" ? "pm25-pm10" : parametro.replace(".", "").toLowerCase(),
    estacion === "todas" ? "todas" : estacion.toLowerCase(),
  ].join("-");

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.csv"`,
      // The table only changes once a month (the sync cron, on the 6th). The
      // /datos card adds &v=<latest month> to its link, so a new month is a
      // new URL (a fresh file right away); a day at the CDN spares repeat
      // downloads the DB reads.
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
