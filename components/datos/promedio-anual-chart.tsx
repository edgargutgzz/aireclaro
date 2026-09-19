"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { BookOpen, HeartPulse, Scale, ShieldCheck } from "lucide-react";
import {
  COLOR_INSALUBRE,
  COLOR_INSALUBRE_FILL_OPACITY,
  COLOR_SALUDABLE,
} from "@/lib/datos-colors";
import InfoTabs, { type InfoTab } from "@/components/datos/info-tabs";
import YearToggle from "@/components/datos/year-toggle";
import ChartCard from "@/components/datos/chart-card";
import HorizontalScrollFade from "@/components/datos/horizontal-scroll-fade";
import {
  niceTicks,
  roundedRectPath,
  tooltipPositionStyle,
} from "@/components/datos/svg-chart-utils";

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

// A "falta de información" pill with a hover/focus tooltip breaking down why
// -- was shadcn's Tooltip (Radix), replaced when shadcn was dropped
// project-wide. Plain hover/focus state, same visual recipe. Opens above,
// centered -- these pills sit low in the card with room above them, so no
// edge-clamping needed the way the chart's own data-point tooltips do.
function InfoPill({ nombre, rows }: { nombre: string; rows: TrimestreRow[] }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span
        tabIndex={0}
        className="cursor-default rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-500"
      >
        {nombre}
      </span>
      {open && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 grid w-[17rem] -translate-x-1/2 gap-2 rounded-xl border border-black/[0.08] bg-white/95 px-4 py-3.5 text-gray-800 shadow-[0_6px_24px_rgba(0,0,0,0.1)] backdrop-blur-[6px]">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
            {nombre}
          </span>
          <TrimestreBreakdown rows={rows} />
        </div>
      )}
    </span>
  );
}

// ---- Hand-rolled SVG bar chart -------------------------------------------
// Built plain (no charting library) so it can match the site's own spacing,
// color, and radius tokens exactly, and so hover/tooltip/z-order are our own
// DOM/paint order rather than a library's internal layering -- see the
// dataviz skill's mark specs: <=24px thin bars with the leftover band as
// air, no border on the mark (a surface gap does the separating instead),
// solid (never dashed) recessive gridlines, dashed lines reserved for the
// two threshold references.

const CHART_HEIGHT = 380;
const PAD_TOP = 32; // headroom above the tallest bar + top reference badge
const PAD_BOTTOM = 28; // station name labels
const PAD_LEFT = 32; // y-axis tick labels
const PAD_RIGHT = 8;
const BAR_WIDTH = 24;
const BAR_RADIUS = 4;
const TOOLTIP_WIDTH = 272; // px, matches the tooltip card's own w-[17rem]

// A dashed threshold line with a measured-width white badge floating just
// above it -- getBBox() on the actual rendered <text> after mount, not a
// per-character guess (a guess ran text past the box's own border before).
// Rendered as the LAST children of the chart's <svg> (see BarsChart), so it
// paints on top of the bars simply by being later in the document -- no
// library z-order workaround needed once you own the paint order yourself.
function ReferenceLine({
  value,
  y,
  left,
  right,
}: {
  value: string;
  y: number;
  left: number;
  right: number;
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
  const boxX = right - boxWidth - 4;
  const boxY = y - HEIGHT - 4;

  return (
    <g>
      <line
        x1={left}
        x2={right}
        y1={y}
        y2={y}
        stroke="rgb(156,163,175)"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <rect
        x={boxX}
        y={boxY}
        width={boxWidth}
        height={HEIGHT}
        rx={4}
        fill="#ffffff"
        stroke="rgb(209,213,219)"
      />
      <text
        ref={textRef}
        x={boxX + boxWidth / 2}
        y={boxY + HEIGHT / 2 + 1}
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

function TooltipCard({
  bar,
  year,
  isCompleteYear,
  totalWidth,
  barCenterX,
  barTopY,
}: {
  bar: StationBar;
  year: number | null;
  isCompleteYear: boolean;
  totalWidth: number;
  barCenterX: number;
  barTopY: number;
}) {
  // A complete year's bar already cleared the >=3-of-4 "datos suficientes"
  // bar, so it reads as a genuine annual figure, not a partial range --
  // "Promedio anual 2025", not "Promedio T1-T3 (Ene-Sep) 2025".
  const label = isCompleteYear
    ? "anual"
    : trimestreLabel(bar.trimestresValidos);

  const positionStyle = tooltipPositionStyle(
    barCenterX,
    barTopY,
    totalWidth,
    CHART_HEIGHT,
    TOOLTIP_WIDTH,
  );

  return (
    <div
      className="pointer-events-none absolute z-10 grid w-[17rem] gap-2 rounded-xl border border-black/[0.08] bg-white/95 px-4 py-3.5 shadow-[0_6px_24px_rgba(0,0,0,0.1)] backdrop-blur-[6px]"
      style={positionStyle}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {bar.nombre}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span
          className="text-2xl font-bold leading-none"
          style={{ color: COLOR_INSALUBRE }}
        >
          {Math.round(bar.promedio)}
        </span>
        <span className="text-sm font-medium text-gray-400">µg/m³</span>
      </div>
      <span className="text-xs text-gray-500">
        Promedio {label} {year}
      </span>
      <div className="border-t border-gray-100 pt-2">
        <TrimestreBreakdown rows={bar.rows} />
      </div>
    </div>
  );
}

function BarsChart({
  bars,
  year,
  isCompleteYear,
}: {
  bars: StationBar[];
  year: number | null;
  isCompleteYear: boolean;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const totalWidth = STATION_COL_WIDTH * bars.length;
  const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const plotRight = totalWidth - PAD_RIGHT;

  const rawMax = Math.max(
    NOM_ANUAL,
    OMS_ANUAL,
    ...bars.map((b) => b.promedio),
    1,
  );
  const ticks = useMemo(() => niceTicks(rawMax * 1.08), [rawMax]);
  const niceMax = ticks[ticks.length - 1];

  const valueToY = (v: number) =>
    PAD_TOP + plotHeight - (v / niceMax) * plotHeight;
  const bandX = (i: number) => PAD_LEFT + i * STATION_COL_WIDTH;

  const hovered = hoveredIdx !== null ? bars[hoveredIdx] : null;

  const clearHover = (i: number) =>
    setHoveredIdx((cur) => (cur === i ? null : cur));

  return (
    <div
      className="relative"
      style={{ width: totalWidth, height: CHART_HEIGHT }}
    >
      <svg
        width={totalWidth}
        height={CHART_HEIGHT}
        role="img"
        aria-label="Promedio anual de PM2.5 por estación"
      >
        {ticks.map((t) => {
          const y = valueToY(t);
          return (
            <g key={t}>
              <line
                x1={PAD_LEFT}
                x2={plotRight}
                y1={y}
                y2={y}
                stroke="rgb(243,244,246)"
                strokeWidth={1}
              />
              <text
                x={PAD_LEFT - 8}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={12}
                fontWeight={500}
                fill="rgb(107,114,128)"
              >
                {t}
              </text>
            </g>
          );
        })}

        {bars.map((b, i) => {
          const x = bandX(i) + (STATION_COL_WIDTH - BAR_WIDTH) / 2;
          const yTop = valueToY(b.promedio);
          const h = PAD_TOP + plotHeight - yTop;
          const isHovered = hoveredIdx === i;
          return (
            <g key={b.sensorId}>
              <path
                d={roundedRectPath(x, yTop, BAR_WIDTH, h, {
                  tl: BAR_RADIUS,
                  tr: BAR_RADIUS,
                })}
                fill={COLOR_INSALUBRE}
                fillOpacity={isHovered ? 0.85 : COLOR_INSALUBRE_FILL_OPACITY}
                style={{ transition: "fill-opacity 120ms ease" }}
              />
              <text
                x={bandX(i) + STATION_COL_WIDTH / 2}
                y={CHART_HEIGHT - PAD_BOTTOM + 16}
                textAnchor="middle"
                fontSize={11}
                fontWeight={500}
                fill="rgb(75,85,99)"
              >
                {b.nombre}
              </text>
              {/* The hit target: the whole band, taller than the mark
                  itself, per the skill's "hit target bigger than the mark." */}
              <rect
                x={bandX(i)}
                y={PAD_TOP}
                width={STATION_COL_WIDTH}
                height={plotHeight}
                fill="transparent"
                tabIndex={0}
                aria-label={`${b.nombre}: ${Math.round(b.promedio)} microgramos por metro cúbico`}
                style={{ cursor: "pointer", outline: "none" }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => clearHover(i)}
                onFocus={() => setHoveredIdx(i)}
                onBlur={() => clearHover(i)}
              />
            </g>
          );
        })}

        <ReferenceLine
          value={`Norma Mexicana: ${NOM_ANUAL} µg/m³`}
          y={valueToY(NOM_ANUAL)}
          left={PAD_LEFT}
          right={plotRight}
        />
        <ReferenceLine
          value={`OMS: ${OMS_ANUAL} µg/m³`}
          y={valueToY(OMS_ANUAL)}
          left={PAD_LEFT}
          right={plotRight}
        />
      </svg>

      {/* Screen-reader equivalent of the bars -- the field's own hover/focus
          affordance covers sighted keyboard users, but a plain list is the
          reliable baseline for assistive tech either way. */}
      <ul className="sr-only">
        {bars.map((b) => (
          <li key={b.sensorId}>
            {b.nombre}: {Math.round(b.promedio)} µg/m³
          </li>
        ))}
      </ul>

      {hovered && hoveredIdx !== null && (
        <TooltipCard
          bar={hovered}
          year={year}
          isCompleteYear={isCompleteYear}
          totalWidth={totalWidth}
          barCenterX={bandX(hoveredIdx) + STATION_COL_WIDTH / 2}
          barTopY={valueToY(hovered.promedio)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

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
        {bars.length > 0 ? (
          <HorizontalScrollFade minWidth={STATION_COL_WIDTH * bars.length}>
            <BarsChart
              bars={bars}
              year={year}
              isCompleteYear={isCompleteYear}
            />
          </HorizontalScrollFade>
        ) : (
          <div
            className="flex items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400"
            style={{ height: CHART_HEIGHT }}
          >
            Sin datos suficientes todavía
          </div>
        )}

        {sinDatos.length > 0 && (
          <div className="mt-5 grid gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
              Estaciones con falta de información
            </span>
            <div className="flex flex-wrap gap-2">
              {sinDatos.map((est) => (
                <InfoPill
                  key={est.sensorId}
                  nombre={est.nombre}
                  rows={est.rows}
                />
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
