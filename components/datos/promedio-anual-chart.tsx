"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Customized,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { BookOpen, HeartPulse, Scale, ShieldCheck } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  COLOR_INSALUBRE,
  COLOR_INSALUBRE_BORDER_OPACITY,
  COLOR_INSALUBRE_FILL_OPACITY,
  COLOR_SALUDABLE,
} from "@/lib/datos-colors";
import InfoTabs, { type InfoTab } from "@/components/datos/info-tabs";
import YearToggle from "@/components/datos/year-toggle";
import ChartCard from "@/components/datos/chart-card";
import HorizontalScrollFade from "@/components/datos/horizontal-scroll-fade";

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

const TRIMESTRE_MESES: Record<number, string> = {
  1: "Ene–Mar",
  2: "Abr–Jun",
  3: "Jul–Sep",
  4: "Oct–Dic",
};

// A bordered white pill for a reference line's label, floating just above
// the line at the right edge -- plain text sitting on top of the bars was
// illegible over a bar of the same muted gray tone as the line itself.
//
// Rendered via <Customized> (see ReferenceLinesOverlay below), not
// ReferenceLine's own `label` prop: Recharts paints ReferenceLine's label in
// an earlier layer than the bars, so a bar's own translucent fill painted on
// top of it tinted the white box instead of the box sitting above the bar.
// <Customized> is Recharts' dedicated top overlay layer, guaranteed to
// paint last regardless of where the bars/lines/grid land.
//
// Box width comes from getBBox() on the actual rendered <text> after mount,
// not a per-character guess -- Inter renders wider than a generic sans
// estimate assumed, which ran the text past the box's own border. The first
// paint falls back to a generous over-estimate so the box isn't zero-width
// for one frame.
function ReferenceLineBadge({
  value,
  yLine,
  rightEdge,
}: {
  value: string;
  yLine: number;
  rightEdge: number;
}) {
  const textRef = useRef<SVGTextElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (textRef.current) setMeasuredWidth(textRef.current.getBBox().width);
  }, [value]);

  const PAD_X = 8;
  const HEIGHT = 20;
  const textWidth = measuredWidth ?? value.length * 7.5;
  const boxWidth = textWidth + PAD_X * 2;
  const x = rightEdge - boxWidth - 4;
  const y = yLine - HEIGHT - 4;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={boxWidth}
        height={HEIGHT}
        rx={4}
        fill="#ffffff"
        stroke="rgb(209,213,219)"
      />
      <text
        ref={textRef}
        x={x + boxWidth / 2}
        y={y + HEIGHT / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
        fontWeight={500}
        fill="rgb(75,85,99)"
      >
        {value}
      </text>
    </g>
  );
}

// <Customized>'s render prop gets the chart's own internal state, including
// the y-axis' d3 scale (to place a badge at an exact data value in pixels)
// and `offset` (the plotting area's pixel box, for the right edge to
// right-align against).
function ReferenceLinesOverlay(props: any) {
  const yAxis = Object.values(props.yAxisMap ?? {})[0] as
    | { scale?: (v: number) => number }
    | undefined;
  if (!yAxis?.scale || !props.offset) return null;
  const rightEdge = props.offset.left + props.offset.width;

  return (
    <g>
      <ReferenceLineBadge
        value={`Norma Mexicana: ${NOM_ANUAL} µg/m³`}
        yLine={yAxis.scale(NOM_ANUAL)}
        rightEdge={rightEdge}
      />
      <ReferenceLineBadge
        value={`OMS: ${OMS_ANUAL} µg/m³`}
        yLine={yAxis.scale(OMS_ANUAL)}
        rightEdge={rightEdge}
      />
    </g>
  );
}

// "T1–T3 (Ene–Sep)" for a contiguous run starting at T1 (the common case --
// trimesters validate in order as the year progresses); a comma list for the
// rare non-contiguous case (e.g. a mid-year outage skips one trimester but a
// later one still clears 75%) rather than a misleading range.
function trimestreLabel(validos: number[]): string | null {
  if (validos.length === 0) return null;
  const sorted = [...validos].sort((a, b) => a - b);
  const contiguoDesdeT1 =
    sorted[0] === 1 && sorted.every((n, i) => n === i + 1);
  if (!contiguoDesdeT1) return sorted.map((t) => `T${t}`).join(", ");
  const last = sorted[sorted.length - 1];
  if (last === 1) return `T1 (${TRIMESTRE_MESES[1]})`;
  return `T1–T${last} (Ene–${TRIMESTRE_MESES[last].split("–")[1]})`;
}

const chartConfig = {
  promedio: { label: "PM2.5", color: COLOR_INSALUBRE },
} satisfies ChartConfig;

const tabs: InfoTab[] = [
  {
    id: "fuente",
    label: "Datos oficiales",
    icon: ShieldCheck,
    body: (
      <>
        Los datos de calidad del aire (PM2.5 µg/m³) provienen de las estaciones
        de monitoreo del{" "}
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
        Se clasifica la calidad del aire como saludable o insalubre con base en
        el límite diario establecido por la{" "}
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
        Para garantizar mayor certeza en la información, los datos se analizan
        siguiendo los criterios establecidos por la{" "}
        <a
          href="https://www.dof.gob.mx/nota_detalle.php?codigo=5633855&fecha=27/10/2021"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
        >
          NOM-025-SSA1-2021
        </a>
        . La estación se considera con datos suficientes si al menos 3 de los 4
        trimestres tienen cobertura. Un trimestre es válido cuando la estación
        reportó mediciones en al menos el 75% de los días del trimestre.
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
        sistémico. Si quieres entender mejor cómo nos afecta, te compartimos la
        siguiente{" "}
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

interface SinDatosEntry {
  sensorId: string;
  nombre: string;
  rows: TrimestreRow[];
}

// The T1-T4 breakdown -- shared by the bar's own tooltip and the "falta de
// información" pills' tooltip, so a rim/spacing tweak lands on both instead
// of drifting between two hand-copies.
function TrimestreBreakdown({ rows }: { rows: TrimestreRow[] }) {
  const rowsByT = new Map(rows.map((r) => [r.trimestre, r]));
  const validCount = rows.filter((r) => r.valido).length;

  return (
    <div className="grid gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
        Trimestres ({validCount}/4 válidos · mín. 75% días)
      </span>
      {[1, 2, 3, 4].map((t) => {
        const r = rowsByT.get(t);
        return (
          <div
            key={t}
            className="flex items-center justify-between gap-3 text-xs"
          >
            <span className="flex items-center gap-1.5 text-gray-600">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: r?.valido ? COLOR_SALUDABLE : "#d1d5db",
                }}
              />
              T{t} ({TRIMESTRE_MESES[t]})
            </span>
            {r ? (
              <span className="flex items-baseline gap-2">
                {r.valido && (
                  <span className="font-semibold text-gray-800">
                    {Math.round(r.promedio!)} µg/m³
                  </span>
                )}
                <span className="text-[11px] text-gray-400">
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
  );
}

function InfoTooltip({
  active,
  payload,
  year,
  isCompleteYear,
}: {
  active?: boolean;
  payload?: any[];
  year: number | null;
  isCompleteYear: boolean;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as StationBar;
  // A complete year's bar already cleared the >=3-of-4 "datos suficientes"
  // bar, so it reads as a genuine annual figure, not a partial range --
  // "Promedio anual 2025", not "Promedio T1-T3 (Ene-Sep) 2025".
  const label = isCompleteYear
    ? "anual"
    : trimestreLabel(row.trimestresValidos);

  return (
    // Recharts anchors its tooltip wrapper at the cursor's own point and
    // grows the content rightward from there by default -- fine for most
    // bars, but a bar near the right edge of the (horizontally-scrolled)
    // chart pushed the tooltip past the visible area. Shifting the content
    // fully to the left of that anchor point (a plain CSS transform, not
    // fighting Recharts' own positioning math) keeps it over already-visible
    // chart area instead of growing into space that may not be in view.
    <div
      className="grid min-w-[17rem] gap-2 rounded-xl border border-black/[0.08] bg-white/95 px-4 py-3.5 shadow-[0_6px_24px_rgba(0,0,0,0.1)] backdrop-blur-[6px]"
      style={{ transform: "translateX(calc(-100% - 12px))" }}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {row.nombre}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span
          className="text-2xl font-bold leading-none"
          style={{ color: COLOR_INSALUBRE }}
        >
          {Math.round(row.promedio)}
        </span>
        <span className="text-sm font-medium text-gray-400">µg/m³</span>
      </div>
      <span className="text-xs text-gray-500">
        Promedio {label} {year}
      </span>
      <div className="border-t border-gray-100 pt-2">
        <TrimestreBreakdown rows={row.rows} />
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
  const years = useMemo(
    () => [...new Set(trimestres.map((t) => t.ano))].sort(),
    [trimestres],
  );
  const [selectedYear, setSelectedYear] = useState<number | null>(
    years[years.length - 1] ?? null,
  );
  const year =
    selectedYear !== null && years.includes(selectedYear)
      ? selectedYear
      : years[years.length - 1] ?? null;

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
    const sinDatos: SinDatosEntry[] = [];
    // >=3 of 4 trimestres is the Metodología tab's own "datos suficientes"
    // bar for a finished year -- not a stricter 4/4.
    const minTrimestresRequeridos = isCompleteYear ? 3 : 1;

    for (const est of estaciones) {
      const rows = rowsByStation.get(est.sensorId) ?? [];
      const validRows = rows.filter((r) => r.valido);

      if (validRows.length < minTrimestresRequeridos) {
        sinDatos.push({ sensorId: est.sensorId, nombre: est.nombre, rows });
        continue;
      }

      validRows.forEach((r) => validTrimestresGlobal.add(r.trimestre));
      const promedio =
        validRows.reduce((sum, r) => sum + (r.promedio ?? 0), 0) /
        validRows.length;
      bars.push({
        sensorId: est.sensorId,
        nombre: est.nombre,
        promedio,
        trimestresValidos: validRows.map((r) => r.trimestre),
        rows,
      });
    }

    bars.sort((a, b) => b.promedio - a.promedio);
    sinDatos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    return {
      bars,
      sinDatos,
      rangeLabel: trimestreLabel([...validTrimestresGlobal]),
    };
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
            {sobreLimite === 1 ? "estación" : "estaciones"} sobre el límite
            anual
          </>
        )
      }
      headerRight={
        <YearToggle years={years} year={year} onChange={setSelectedYear} />
      }
    >
      <div className="px-5 pb-6 pt-6">
        <span className="mb-3 block text-xs text-gray-400">PM2.5 (µg/m³)</span>
        <HorizontalScrollFade
          minWidth={STATION_COL_WIDTH * Math.max(bars.length, 1)}
        >
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-80 w-full md:h-[32rem]"
          >
            <BarChart
              data={bars}
              barCategoryGap="25%"
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
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
              <ChartTooltip
                cursor={{ fill: "rgba(229,231,235,0.3)" }}
                content={
                  <InfoTooltip year={year} isCompleteYear={isCompleteYear} />
                }
              />
              <ReferenceLine
                y={NOM_ANUAL}
                stroke="rgb(156,163,175)"
                strokeDasharray="4 4"
              />
              <ReferenceLine
                y={OMS_ANUAL}
                stroke="rgb(156,163,175)"
                strokeDasharray="4 4"
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
              {/* Last child so it paints on top of the bars -- see
                    ReferenceLinesOverlay's comment. */}
              <Customized component={ReferenceLinesOverlay} />
            </BarChart>
          </ChartContainer>
        </HorizontalScrollFade>

        {sinDatos.length > 0 && (
          <div className="mt-5 grid gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
              Estaciones con falta de información
            </span>
            <TooltipProvider delayDuration={150}>
              <div className="flex flex-wrap gap-2">
                {sinDatos.map((est) => (
                  <Tooltip key={est.sensorId}>
                    <TooltipTrigger asChild>
                      <span className="cursor-default rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-500">
                        {est.nombre}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="w-[17rem] rounded-xl border border-black/[0.08] bg-white/95 px-4 py-3.5 text-gray-800 shadow-[0_6px_24px_rgba(0,0,0,0.1)] backdrop-blur-[6px]">
                      <div className="grid gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                          {est.nombre}
                        </span>
                        <TrimestreBreakdown rows={est.rows} />
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 px-5 pb-5 pt-4">
        <InfoTabs tabs={tabs} />
      </div>
    </ChartCard>
  );
}
