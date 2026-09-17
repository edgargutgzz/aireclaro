"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { BookOpen, HeartPulse, Scale, ShieldCheck } from "lucide-react";
import { ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { COLOR_INSALUBRE, COLOR_INSALUBRE_BORDER_OPACITY, COLOR_INSALUBRE_FILL_OPACITY, COLOR_SALUDABLE } from "@/lib/datos-colors";
import InfoTabs, { type InfoTab } from "@/components/datos/info-tabs";
import YearToggle from "@/components/datos/year-toggle";
import ChartCard from "@/components/datos/chart-card";

interface Estacion {
  sensorId: string;
  nombre: string;
}

interface TrimestreRow {
  sensor_id: string;
  ano: number;
  trimestre: number;
  dias_validos: number;
  dias_totales: number;
  valido: boolean;
  promedio: number | null;
}

// NOM-025-SSA1-2021's annual PM2.5 limit and the WHO annual guideline --
// both flat constants, not derived from lib/pm25-limits.ts, which only holds
// the (different) daily limits días insalubres uses.
const NOM_ANUAL = 10;
const OMS_ANUAL = 5;

const STATION_COL_WIDTH = 130; // px, same horizontal-scroll pattern as MONTH_COL_WIDTH

const TRIMESTRE_MESES: Record<number, string> = { 1: "Ene–Mar", 2: "Abr–Jun", 3: "Jul–Sep", 4: "Oct–Dic" };

// "T1–T3 (Ene–Sep)" for a contiguous run starting at T1 (the common case --
// trimesters validate in order as the year progresses); a comma list for the
// rare non-contiguous case (e.g. a mid-year outage skips one trimester but a
// later one still clears 75%) rather than a misleading range.
function trimestreLabel(validos: number[]): string | null {
  if (validos.length === 0) return null;
  const sorted = [...validos].sort((a, b) => a - b);
  const contiguoDesdeT1 = sorted[0] === 1 && sorted.every((n, i) => n === i + 1);
  if (!contiguoDesdeT1) return sorted.map((t) => `T${t}`).join(", ");
  const last = sorted[sorted.length - 1];
  if (last === 1) return `T1 (${TRIMESTRE_MESES[1]})`;
  return `T1–T${last} (Ene–${TRIMESTRE_MESES[last].split("–")[1]})`;
}

const chartConfig = { promedio: { label: "PM2.5", color: COLOR_INSALUBRE } } satisfies ChartConfig;

const tabs: InfoTab[] = [
  {
    id: "fuente",
    label: "Datos oficiales",
    icon: ShieldCheck,
    body: (
      <>
        Los datos de calidad del aire (PM2.5 µg/m³) provienen de las
        estaciones de monitoreo del{" "}
        <a
          href="http://aire.nl.gob.mx"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
        >
          Sistema Integral de Monitoreo Ambiental (SIMA)
        </a>{" "}
        de Nuevo León.
      </>
    ),
  },
  {
    id: "norma",
    label: "Norma Mexicana",
    icon: Scale,
    body: (
      <>
        Se clasifica la calidad del aire como saludable o insalubre con base
        en el límite diario establecido por la{" "}
        <a
          href="https://www.dof.gob.mx/nota_detalle.php?codigo=5633855&fecha=27/10/2021"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
        >
          NOM-025-SSA1-2021
        </a>
        . El límite anual de PM2.5 es de {NOM_ANUAL} µg/m³.
      </>
    ),
  },
  {
    id: "metodologia",
    label: "Metodología",
    icon: BookOpen,
    body: (
      <>
        Para garantizar mayor certeza en la información, los datos se
        analizan siguiendo los criterios establecidos por la{" "}
        <a
          href="https://www.dof.gob.mx/nota_detalle.php?codigo=5633855&fecha=27/10/2021"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
        >
          NOM-025-SSA1-2021
        </a>
        . La estación se considera con datos suficientes si al menos 3 de los
        4 trimestres tienen cobertura. Un trimestre es válido cuando la
        estación reportó mediciones en al menos el 75% de los días del
        trimestre.
      </>
    ),
  },
  {
    id: "salud",
    label: "Impacto en salud",
    icon: HeartPulse,
    body: (
      <>
        Las partículas PM2.5 son tan pequeñas que penetran profundo en los
        pulmones y llegan al torrente sanguíneo. La exposición prolongada se
        asocia con enfermedades respiratorias, cardiovasculares y daño
        sistémico. Si quieres entender mejor cómo nos afecta, te compartimos
        la siguiente{" "}
        <a
          href="https://www.observatoriodelaire.com/infografias/infografia_salud.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
        >
          infografía
        </a>
        .
      </>
    ),
  },
];

interface StationBar {
  sensorId: string;
  nombre: string;
  promedio: number;
  trimestresValidos: number[];
  rows: TrimestreRow[];
}

function InfoTooltip({ active, payload, year }: { active?: boolean; payload?: any[]; year: number | null }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as StationBar;
  const rowsByT = new Map(row.rows.map((r) => [r.trimestre, r]));
  // All 4 valid reads as a genuine annual figure, not a partial range --
  // "Promedio anual 2025", not "Promedio T1-T4 (Ene-Dic) 2025".
  const label = row.trimestresValidos.length === 4 ? "anual" : trimestreLabel(row.trimestresValidos);

  return (
    <div className="grid min-w-[15rem] gap-2 rounded-xl border border-black/[0.08] bg-white/95 px-4 py-3.5 shadow-[0_6px_24px_rgba(0,0,0,0.1)] backdrop-blur-[6px]">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{row.nombre}</span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold leading-none" style={{ color: COLOR_INSALUBRE }}>
          {Math.round(row.promedio)}
        </span>
        <span className="text-sm font-medium text-gray-400">µg/m³</span>
      </div>
      <span className="text-xs text-gray-500">Promedio {label} {year}</span>
      <div className="grid gap-1.5 border-t border-gray-100 pt-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
          Trimestres ({row.trimestresValidos.length}/4 válidos · mín. 75% días)
        </span>
        {[1, 2, 3, 4].map((t) => {
          const r = rowsByT.get(t);
          return (
            <div key={t} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-gray-600">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: r?.valido ? COLOR_SALUDABLE : "#d1d5db" }}
                />
                T{t} ({TRIMESTRE_MESES[t]})
              </span>
              {r ? (
                <span className="text-right">
                  {r.valido && (
                    <span className="font-semibold text-gray-800">{Math.round(r.promedio!)} µg/m³</span>
                  )}
                  <span className={`block text-[11px] ${r.valido ? "text-gray-400" : "text-gray-400"}`}>
                    {r.dias_validos}/{r.dias_totales} días
                  </span>
                </span>
              ) : (
                <span className="text-gray-400">Sin datos</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PromedioAnualChart({
  estaciones,
  trimestres,
}: {
  estaciones: Estacion[];
  trimestres: TrimestreRow[];
}) {
  const years = useMemo(() => [...new Set(trimestres.map((t) => t.ano))].sort(), [trimestres]);
  const [selectedYear, setSelectedYear] = useState<number | null>(years[years.length - 1] ?? null);
  const year = selectedYear !== null && years.includes(selectedYear) ? selectedYear : years[years.length - 1] ?? null;

  // A year still in progress shows whatever trimesters have validated so far
  // (labeled "T1-T2 (Ene-Jun)", etc.) -- but once a year is fully in the
  // past, showing a station on 1-3 valid trimesters would present a partial
  // figure as if it were the whole year's. A complete year only shows
  // stations with all 4 valid; everything else drops to "falta de
  // información" for that year, same as a station with zero data.
  const isCompleteYear = year !== null && year < new Date().getFullYear();

  const { bars, sinDatos, rangeLabel } = useMemo(() => {
    const rowsByStation = new Map<string, TrimestreRow[]>();
    for (const t of trimestres) {
      if (t.ano !== year) continue;
      const lista = rowsByStation.get(t.sensor_id) ?? [];
      lista.push(t);
      rowsByStation.set(t.sensor_id, lista);
    }

    const validTrimestresGlobal = new Set<number>();
    const bars: StationBar[] = [];
    const sinDatos: string[] = [];
    const minTrimestresRequeridos = isCompleteYear ? 4 : 1;

    for (const est of estaciones) {
      const rows = rowsByStation.get(est.sensorId) ?? [];
      const validRows = rows.filter((r) => r.valido);

      if (validRows.length < minTrimestresRequeridos) {
        sinDatos.push(est.nombre);
        continue;
      }

      validRows.forEach((r) => validTrimestresGlobal.add(r.trimestre));
      const promedio = validRows.reduce((sum, r) => sum + (r.promedio ?? 0), 0) / validRows.length;
      bars.push({
        sensorId: est.sensorId,
        nombre: est.nombre,
        promedio,
        trimestresValidos: validRows.map((r) => r.trimestre),
        rows,
      });
    }

    bars.sort((a, b) => b.promedio - a.promedio);
    sinDatos.sort((a, b) => a.localeCompare(b, "es"));

    return { bars, sinDatos, rangeLabel: trimestreLabel([...validTrimestresGlobal]) };
  }, [estaciones, trimestres, year, isCompleteYear]);

  const sobreLimite = bars.filter((b) => b.promedio > NOM_ANUAL).length;

  return (
    <ChartCard
      title="Promedio anual por estación en la Zona Metropolitana de Monterrey"
      subtitle={
        bars.length === 0 ? (
          "PM2.5 · Sin datos suficientes todavía"
        ) : (
          <>
            PM2.5{!isCompleteYear && rangeLabel ? ` · ${rangeLabel}` : ""} ·{" "}
            <span className="font-semibold" style={{ color: COLOR_INSALUBRE }}>
              {sobreLimite}
            </span>{" "}
            {sobreLimite === 1 ? "estación" : "estaciones"} sobre el límite anual
          </>
        )
      }
      headerRight={<YearToggle years={years} year={year} onChange={setSelectedYear} />}
    >
      <div className="px-5 pb-6 pt-6">
        <span className="mb-3 block text-xs text-gray-400">PM2.5 (µg/m³)</span>
        <div className="overflow-x-auto">
          <div style={{ minWidth: STATION_COL_WIDTH * Math.max(bars.length, 1) }}>
            <ChartContainer config={chartConfig} className="aspect-auto h-80 w-full md:h-[32rem]">
              <BarChart data={bars} barCategoryGap="25%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(229,231,235,0.6)" />
                <XAxis
                  dataKey="nombre"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fontWeight: 500, fill: "rgb(75,85,99)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tick={{ fontSize: 12, fontWeight: 500, fill: "rgb(75,85,99)" }}
                />
                <ChartTooltip cursor={{ fill: "rgba(229,231,235,0.3)" }} content={<InfoTooltip year={year} />} />
                <ReferenceLine
                  y={NOM_ANUAL}
                  stroke="rgb(156,163,175)"
                  strokeDasharray="4 4"
                  label={{
                    value: `Norma Mexicana: ${NOM_ANUAL} µg/m³`,
                    position: "insideTopRight",
                    fill: "rgb(107,114,128)",
                    fontSize: 11,
                  }}
                />
                <ReferenceLine
                  y={OMS_ANUAL}
                  stroke="rgb(156,163,175)"
                  strokeDasharray="4 4"
                  label={{
                    value: `OMS: ${OMS_ANUAL} µg/m³`,
                    position: "insideBottomRight",
                    fill: "rgb(107,114,128)",
                    fontSize: 11,
                  }}
                />
                <Bar
                  dataKey="promedio"
                  fill={COLOR_INSALUBRE}
                  fillOpacity={COLOR_INSALUBRE_FILL_OPACITY}
                  stroke={COLOR_INSALUBRE}
                  strokeOpacity={COLOR_INSALUBRE_BORDER_OPACITY}
                  strokeWidth={1.5}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </div>
        </div>

        {sinDatos.length > 0 && (
          <div className="mt-5 grid gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
              Estaciones con falta de información
            </span>
            <div className="flex flex-wrap gap-2">
              {sinDatos.map((nombre) => (
                <span
                  key={nombre}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-500"
                >
                  {nombre}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 px-5 pb-5 pt-4">
        <InfoTabs tabs={tabs} />
      </div>
    </ChartCard>
  );
}
