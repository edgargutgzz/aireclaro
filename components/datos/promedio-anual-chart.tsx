"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BookOpen, HeartPulse, Scale, ShieldCheck, Wind } from "lucide-react";
import type { Pollutant } from "@/lib/dias-insalubres-aggregate";
import { getLimitAnualPM10 } from "@/lib/pm25-limits";
import {
  COLOR_INSALUBRE,
  COLOR_INSALUBRE_FILL_OPACITY,
  COLOR_SALUDABLE,
  COLOR_SALUDABLE_FILL_OPACITY,
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
import { useDismissTooltip } from "@/components/datos/use-dismiss-tooltip";

interface Estacion {
  sensorId: string;
  nombre: string;
}

interface TrimestreRow {
  sensor_id: string;
  ano: number;
  trimestre: number;
  parametro: "PM2.5" | "PM10";
  dias_validos: number;
  dias_totales: number;
  valido: boolean;
  promedio: number | null;
}

const POLLUTANT_LABEL: Record<Pollutant, string> = {
  pm25: "PM2.5",
  pm10: "PM10",
};

// NOM-025-SSA1-2021's annual limits and the WHO annual guidelines.
// PM2.5's own annual limit is flat at 10 µg/m³ across every "Año 1/3/5"
// phase-in bracket (Tabla 1), so it's a plain constant here same as before.
// PM10's isn't flat (36 -> 28 -> 20) -- see lib/pm25-limits.ts's
// getLimitAnualPM10 for that phase-in, applied per the selected year.
const NOM_ANUAL_PM25 = 10;
const OMS_ANUAL_PM25 = 5;
const OMS_ANUAL_PM10 = 15; // WHO 2021 guidelines (down from 20 in 2005)

// Measured/clamped the same way días insalubres sizes its month columns
// (2026-09-28 feedback: chart 3's bars read as "thin" and out of place next
// to chart 1's) -- but station names are long and variable ("Garcia: Valle
// de Lincoln", 24 chars) unlike días insalubres' fixed 3-letter month
// abbreviations, so the floor stays at today's fixed width instead of days
// insalubres' much lower 30px: shrinking further would start overlapping
// labels for a dataset this can't safely compress the way short month
// labels can. MAX only ever matters when few stations qualify as bars (a
// spotty year) -- it lets those columns spread out to fill the card instead
// of leaving a blank margin. First tried días insalubres' own 220 (2026-09-28)
// but that chart almost always has close to its full 12 months showing, so
// 220 is rarely even reached there; this chart's realistic bar count is
// often low (today: 4 of 15 stations clear the >=3-valid-trimesters gate
// for 2025), so 220 left most of the card empty -- the exact "does not
// expand to full width" bug reported (2026-09-28 follow-up, real
// screenshot). 300 actually fills a handful of qualifying stations across
// the card's real width instead of stopping short.
const STATION_COL_WIDTH_MIN = 130;
const STATION_COL_WIDTH_MAX = 300;

const TRIMESTRE_MESES: Record<number, string> = {
  1: "Ene–Mar",
  2: "Abr–Jun",
  3: "Jul–Sep",
  4: "Oct–Dic",
};

// A function of pollutant now (2026-09-28: was a flat constant array,
// PM2.5-only) -- "fuente" and "salud" only needed pluralizing since they
// were already pollutant-general in spirit, but "norma" genuinely differs:
// PM10's annual limit isn't a single number, it phases in (see
// getLimitAnualPM10), so its own sentence has to say that explicitly rather
// than plugging a number into the same PM2.5 template.
function tabs(pollutant: Pollutant, nomAnual: number): InfoTab[] {
  return [
    {
      id: "fuente",
      label: "Datos oficiales",
      icon: ShieldCheck,
      body: (
        <>
          Los datos de calidad del aire provienen de las estaciones de
          monitoreo del{" "}
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
      body:
        pollutant === "pm25" ? (
          <>
            Se determina si una estación cumple con el límite anual
            establecido por la{" "}
            <a
              href="https://www.dof.gob.mx/nota_detalle.php?codigo=5633855&fecha=27/10/2021"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
            >
              NOM-025-SSA1-2021
            </a>
            . El límite anual de PM2.5 es de {nomAnual} µg/m³.
          </>
        ) : (
          <>
            Se determina si una estación cumple con el límite anual
            establecido por la{" "}
            <a
              href="https://www.dof.gob.mx/nota_detalle.php?codigo=5633855&fecha=27/10/2021"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
            >
              NOM-025-SSA1-2021
            </a>
            . El límite anual de PM10 bajó de 28 µg/m³ en 2025 a 20 µg/m³ en
            2026.
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
          . La estación se considera con datos suficientes si al menos 3 de
          los 4 trimestres tienen cobertura. Un trimestre es válido cuando la
          estación reportó mediciones en al menos el 75% de los días del
          trimestre.
        </>
      ),
    },
    {
      id: "contaminante",
      label: "Contaminantes",
      icon: Wind,
      body: (
        <>
          PM2.5 y PM10 son partículas en suspensión en el aire, de hasta 2.5
          y 10 micrómetros de diámetro respectivamente (las PM2.5, unas 30
          veces más delgadas que un cabello humano).
        </>
      ),
    },
    {
      id: "salud",
      label: "Impacto en salud",
      icon: HeartPulse,
      body: (
        <>
          Las partículas PM2.5 y PM10 son tan pequeñas que penetran profundo
          en los pulmones y llegan al torrente sanguíneo. La exposición
          prolongada se asocia con enfermedades respiratorias,
          cardiovasculares y daño sistémico. Si quieres entender mejor cómo
          nos afecta, te compartimos la siguiente{" "}
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
}

interface StationBar {
  sensorId: string;
  nombre: string;
  promedio: number;
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
  useDismissTooltip(open, () => setOpen(false));
  const validCount = rows.filter((r) => r.valido).length;

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {/* The X/4 count sits on the pill itself now, not just inside the
          hover tooltip -- with a whole year of stations sometimes mostly
          falling into this row (2025 PM2.5: 11 of 15), the headline "how
          close did this station get" fact shouldn't require hovering each
          one individually to learn (2026-09-28 feedback). The tooltip
          still carries the full per-trimester breakdown for anyone who
          wants it. */}
      <span
        tabIndex={0}
        className="cursor-help rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-500"
      >
        {nombre} · {validCount}/4
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
// dataviz skill's mark specs: no border on the mark (a surface gap does the
// separating instead), solid (never dashed) recessive gridlines, dashed
// lines reserved for the two threshold references.

const CHART_HEIGHT = 380;
const PAD_TOP = 32; // headroom above the tallest bar + top reference badge
const PAD_BOTTOM = 28; // station name labels
const PAD_LEFT = 32; // y-axis tick labels
const PAD_RIGHT = 8;
// The dataviz skill's own mark spec caps this at 24px -- días insalubres'
// bars already run to 60px (that chart is the validated, already-shipped
// reference point), and a bare 24px bar next to that chart's own bars read
// as too thin/out of place (2026-09-28 feedback). Matching chart 1 wins
// here over the general spec, by explicit call.
const BAR_WIDTH = 60;
const BAR_RADIUS = 4;
const TOOLTIP_WIDTH = 272; // px, matches the tooltip card's own w-[17rem]
const TOOLTIP_HEIGHT = 260; // px, generous estimate (header/number/label + the 4-row trimester breakdown)

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
  nomAnual,
  totalWidth,
  barCenterX,
  barTopY,
}: {
  bar: StationBar;
  year: number | null;
  nomAnual: number;
  totalWidth: number;
  barCenterX: number;
  barTopY: number;
}) {
  // Same red/green split as the bar itself -- previously always red
  // regardless of whether this station cleared the limit (2026-09-28
  // feedback: the chart didn't visually distinguish "over" from "under" at
  // all, only the subtitle's count and the dashed line's position did).
  const sobreLimite = bar.promedio > nomAnual;
  const color = sobreLimite ? COLOR_INSALUBRE : COLOR_SALUDABLE;

  const positionStyle = tooltipPositionStyle(
    barCenterX,
    barTopY,
    totalWidth,
    CHART_HEIGHT,
    TOOLTIP_WIDTH,
    TOOLTIP_HEIGHT,
    10,
    BAR_WIDTH / 2,
  );

  return (
    <div
      className="pointer-events-none absolute z-10 grid w-[17rem] gap-2 rounded-xl border border-black/[0.08] bg-white/95 px-4 py-3.5 shadow-[0_6px_24px_rgba(0,0,0,0.1)] backdrop-blur-[6px]"
      style={positionStyle}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {bar.nombre}
      </span>
      {/* Number + its own caption in one tight flex-col (gap-0.5), same
          coupling as días insalubres' number+label pairs -- previously a
          loose sibling at the outer gap-2, which read as a new line rather
          than a caption for the number above it (2026-09-28 feedback). */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold leading-none" style={{ color }}>
            {Math.round(bar.promedio)}
          </span>
          <span className="text-sm font-medium text-gray-400">µg/m³</span>
        </div>
        <span className="text-xs text-gray-500">Promedio anual {year}</span>
      </div>
      <div className="border-t border-gray-100 pt-2">
        <TrimestreBreakdown rows={bar.rows} />
      </div>
    </div>
  );
}

function BarsChart({
  bars,
  year,
  pollutant,
  nomAnual,
  omsAnual,
  stationColWidth,
}: {
  bars: StationBar[];
  year: number | null;
  pollutant: Pollutant;
  nomAnual: number;
  omsAnual: number;
  stationColWidth: number;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  useDismissTooltip(hoveredIdx !== null, () => setHoveredIdx(null));

  // +PAD_LEFT/+PAD_RIGHT: bandX below offsets every column by PAD_LEFT, so
  // the declared width has to reserve that same room or the last column's
  // right edge runs past totalWidth and gets clipped by the SVG's own
  // boundary -- días insalubres' own "last bar crowds the card edge" fix,
  // missing here until 2026-09-28.
  const totalWidth = PAD_LEFT + stationColWidth * bars.length + PAD_RIGHT;
  const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const plotRight = totalWidth - PAD_RIGHT;

  const rawMax = Math.max(
    nomAnual,
    omsAnual,
    ...bars.map((b) => b.promedio),
    1,
  );
  // No headroom multiplier -- niceTicks already rounds up to the next clean
  // step above the data, which is its own bit of breathing room (e.g. a 56
  // max bar rounds up to a 60 top tick). A flat *1.08 on top of that pushed
  // values just past one rounding boundary into the NEXT one entirely (56 *
  // 1.08 = 60.5, which rounds up to 80 instead of 60) -- a much bigger, more
  // visible gap than intended, reported as "reduce the size of the y axis"
  // (2026-09-28, real screenshot: PM10 bars topping out around 56 against an
  // 80 axis).
  const ticks = useMemo(() => niceTicks(rawMax), [rawMax]);
  const niceMax = ticks[ticks.length - 1];

  const valueToY = (v: number) =>
    PAD_TOP + plotHeight - (v / niceMax) * plotHeight;
  const bandX = (i: number) => PAD_LEFT + i * stationColWidth;

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
        aria-label={`Promedio anual de ${POLLUTANT_LABEL[pollutant]} por estación`}
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
          const x = bandX(i) + (stationColWidth - BAR_WIDTH) / 2;
          const yTop = valueToY(b.promedio);
          const h = PAD_TOP + plotHeight - yTop;
          const isHovered = hoveredIdx === i;
          // Red/green by whether this station's own figure clears the
          // limit -- reuses días insalubres' own health-outcome colors
          // rather than a flat red for every bar (2026-09-28 feedback: a
          // uniformly red chart couldn't visually show which stations were
          // actually over the limit, only the subtitle's count and the
          // dashed line's position could).
          const sobreLimite = b.promedio > nomAnual;
          const barColor = sobreLimite ? COLOR_INSALUBRE : COLOR_SALUDABLE;
          const barOpacity = sobreLimite
            ? COLOR_INSALUBRE_FILL_OPACITY
            : COLOR_SALUDABLE_FILL_OPACITY;
          return (
            <g key={b.sensorId}>
              <path
                d={roundedRectPath(x, yTop, BAR_WIDTH, h, {
                  tl: BAR_RADIUS,
                  tr: BAR_RADIUS,
                })}
                fill={barColor}
                fillOpacity={isHovered ? 0.85 : barOpacity}
                style={{ transition: "fill-opacity 120ms ease" }}
              />
              <text
                x={bandX(i) + stationColWidth / 2}
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
                width={stationColWidth}
                height={plotHeight}
                fill="transparent"
                tabIndex={0}
                aria-label={`${b.nombre}: ${Math.round(b.promedio)} microgramos por metro cúbico, ${sobreLimite ? "sobre" : "dentro de"} el límite anual`}
                // Hover tooltip only, no click action here (2026-09-27
                // feedback -- a pointer cursor should only ever mean a
                // click does something).
                style={{ cursor: "default", outline: "none" }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => clearHover(i)}
                onFocus={() => setHoveredIdx(i)}
                onBlur={() => clearHover(i)}
              />
            </g>
          );
        })}

        <ReferenceLine
          value={`Norma Mexicana: ${nomAnual} µg/m³`}
          y={valueToY(nomAnual)}
          left={PAD_LEFT}
          right={plotRight}
        />
        <ReferenceLine
          value={`OMS: ${omsAnual} µg/m³`}
          y={valueToY(omsAnual)}
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
            {b.nombre}: {Math.round(b.promedio)} µg/m³ (
            {b.promedio > nomAnual ? "sobre" : "dentro de"} el límite anual)
          </li>
        ))}
      </ul>

      {hovered && hoveredIdx !== null && (
        <TooltipCard
          bar={hovered}
          year={year}
          nomAnual={nomAnual}
          totalWidth={totalWidth}
          barCenterX={bandX(hoveredIdx) + stationColWidth / 2}
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
  const [pollutant, setPollutant] = useState<Pollutant>("pm25");
  const parametro = pollutant === "pm25" ? "PM2.5" : "PM10";

  // Filtered by pollutant first, same as días insalubres/cobertura -- data
  // coverage can genuinely differ between PM2.5 and PM10 at a given station,
  // so the year list (and everything downstream) is scoped to whichever
  // pollutant is selected, not the union of both.
  const trimestresPollutant = useMemo(
    () => trimestres.filter((t) => t.parametro === parametro),
    [trimestres, parametro],
  );

  const years = useMemo(
    () => [...new Set(trimestresPollutant.map((t) => t.ano))].sort(),
    [trimestresPollutant],
  );
  const [selectedYear, setSelectedYear] = useState<number | null>(
    years[years.length - 1] ?? null,
  );
  const year =
    selectedYear !== null && years.includes(selectedYear)
      ? selectedYear
      : years[years.length - 1] ?? null;

  // NOM-025-SSA1-2021's own "valor anual" is only ever a full calendar year
  // (§3.11: "concentración... calculada en un año calendario") -- it has no
  // concept of a partial-year figure at all. A year still in progress used
  // to show whatever trimesters had validated so far as a "T1-T2 (Ene-Jun)"
  // partial bar, but that isn't a figure the norm defines, and reads as more
  // authoritative than it is. Now an in-progress year shows nothing (see the
  // body render below) rather than a number that isn't really the norm's
  // "annual" value (2026-09-28 feedback).
  const isCompleteYear = year !== null && year < new Date().getFullYear();

  const { bars, sinDatos } = useMemo(() => {
    // Nothing to compute for an in-progress year -- see isCompleteYear above.
    if (!isCompleteYear) return { bars: [] as StationBar[], sinDatos: [] as SinDatosEntry[] };

    const rowsByStation = new Map<string, TrimestreRow[]>();
    for (const t of trimestresPollutant) {
      if (t.ano !== year) continue;
      const lista = rowsByStation.get(t.sensor_id) ?? [];
      lista.push(t);
      rowsByStation.set(t.sensor_id, lista);
    }

    const bars: StationBar[] = [];
    const sinDatos: SinDatosEntry[] = [];
    // NOM-025's own "datos suficientes" bar for a finished year -- not a
    // stricter 4/4.
    const MIN_TRIMESTRES_REQUERIDOS = 3;

    for (const est of estaciones) {
      const rows = rowsByStation.get(est.sensorId) ?? [];
      const validRows = rows.filter((r) => r.valido);

      if (validRows.length < MIN_TRIMESTRES_REQUERIDOS) {
        sinDatos.push({ sensorId: est.sensorId, nombre: est.nombre, rows });
        continue;
      }

      // Pooled day-level mean over the WHOLE year's valid records, not an
      // average of trimester averages, and not restricted to only the
      // individually-valid trimesters -- NOM-025-SSA1-2021 §4.2.2: once the
      // year clears its >=3-of-4 valid-trimesters gate, "el cálculo
      // incluirá a todos los registros del año." Weighting by each
      // trimester's own dias_validos (rather than a flat mean across the 4
      // rows) reproduces that single pooled mean exactly, since each row's
      // own `promedio` is already a pooled mean over just that trimester's
      // valid days (see lib/promedio-anual-aggregate.ts) -- multiplying back
      // by dias_validos recovers each trimester's sum, and summing those
      // sums before dividing is the same arithmetic as pooling every valid
      // day directly. 2026-09-28: replaces the old "mean of monthly means,
      // then mean of valid trimesters" chain, which didn't match the norm's
      // text and wasn't specified anywhere in it.
      const diasValidosTotal = rows.reduce((sum, r) => sum + r.dias_validos, 0);
      const promedio =
        rows.reduce((sum, r) => sum + (r.promedio ?? 0) * r.dias_validos, 0) /
        diasValidosTotal;
      bars.push({
        sensorId: est.sensorId,
        nombre: est.nombre,
        promedio,
        rows,
      });
    }

    bars.sort((a, b) => b.promedio - a.promedio);
    // Closest-to-qualifying first (most valid trimesters), alphabetical as
    // the tiebreak -- surfaces the stations nearest the 3/4 bar before the
    // ones with essentially no data at all (2026-09-28 feedback).
    const validCount = (est: SinDatosEntry) =>
      est.rows.filter((r) => r.valido).length;
    sinDatos.sort(
      (a, b) =>
        validCount(b) - validCount(a) || a.nombre.localeCompare(b.nombre, "es"),
    );

    return { bars, sinDatos };
  }, [estaciones, trimestresPollutant, year, isCompleteYear]);

  const nomAnual =
    pollutant === "pm25" ? NOM_ANUAL_PM25 : getLimitAnualPM10(year ?? new Date().getFullYear());
  const omsAnual = pollutant === "pm25" ? OMS_ANUAL_PM25 : OMS_ANUAL_PM10;
  const sobreLimite = bars.filter((b) => b.promedio > nomAnual).length;

  // Measures the card's own content width so a spotty year (few stations
  // qualifying as bars) spreads them out to fill the card instead of leaving
  // a blank margin -- same pattern días insalubres uses for its month
  // columns, clamped to a much higher floor here (see STATION_COL_WIDTH_MIN)
  // since these labels are full station names, not 3-letter abbreviations.
  const [measureNode, setMeasureNode] = useState<HTMLDivElement | null>(null);
  const [stationColWidth, setStationColWidth] = useState(STATION_COL_WIDTH_MIN);
  useEffect(() => {
    if (!measureNode || bars.length === 0) return;
    const update = () => {
      const available = measureNode.clientWidth - PAD_LEFT - PAD_RIGHT;
      setStationColWidth(
        Math.min(
          STATION_COL_WIDTH_MAX,
          Math.max(STATION_COL_WIDTH_MIN, available / bars.length),
        ),
      );
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(measureNode);
    return () => ro.disconnect();
  }, [measureNode, bars.length]);

  return (
    <ChartCard
      title="Promedio anual por estación en la Zona Metropolitana de Monterrey"
      // Leads with the headline number, plain (no bold/color) -- matches
      // días insalubres ("{totalInsalubres} días de aire insalubre por
      // PM2.5 en 2026") and cobertura ("{pctCobertura}% de cobertura de
      // PM2.5 en 2026"): number first, pollutant + year folded into the
      // trailing clause, not a leading "PM2.5 ·" label (2026-09-28
      // feedback). Color is reserved for the bars/tooltip's own
      // over/under-limit distinction now, not this headline count.
      subtitle={
        !isCompleteYear ? (
          `Datos de ${POLLUTANT_LABEL[pollutant]} disponibles al finalizar ${year}`
        ) : bars.length === 0 ? (
          `Sin datos suficientes de ${POLLUTANT_LABEL[pollutant]} todavía`
        ) : (
          <>
            {/* "de {bars.length}", not "de 15" -- the other stations
                aren't "sin datos" the way días insalubres' calendar cells
                can mean; they're excluded from `bars` for lacking a valid
                annual figure at all (>=3/4 trimesters), which is a
                different fact than "within the limit." Denominating
                against all 15 would silently claim those excluded
                stations comply, which the data doesn't actually say
                (2026-09-28 feedback/decision). */}
            <span>{sobreLimite}</span> de {bars.length}{" "}
            {bars.length === 1 ? "estación" : "estaciones"} sobre el límite
            anual de {POLLUTANT_LABEL[pollutant]} en {year}
          </>
        )
      }
      headerRight={
        <>
          <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
            {(["pm25", "pm10"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPollutant(p)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 ${
                  pollutant === p
                    ? "bg-white text-gray-800 shadow-sm hover:shadow"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {POLLUTANT_LABEL[p]}
              </button>
            ))}
          </div>
          {/* Separates the pollutant toggle from the year toggle -- two
              independent choices, not one flat row (same recipe días
              insalubres/cobertura already use). */}
          <div className="h-5 w-px bg-gray-200" />
          <YearToggle years={years} year={year} onChange={setSelectedYear} />
        </>
      }
    >
      <div className="px-5 pb-6 pt-5 md:pt-6">
        {!isCompleteYear ? (
          // No partial-year figure -- see isCompleteYear's own comment
          // above. A single centered message instead of the axis label +
          // chart + falta-de-información pills this card shows once the
          // year is actually over.
          <div
            className="flex items-center justify-center rounded-lg bg-gray-50 text-center text-sm text-gray-400"
            style={{ height: CHART_HEIGHT }}
          >
            El promedio anual de {year} estará disponible cuando termine el año.
          </div>
        ) : (
          <>
            {/* Same shell días insalubres uses for its own axis-label +
                legend row (mb-4 flex items-center justify-between md:mb-6,
                h-2 w-2 rounded-[2px] swatches) -- this chart had no legend
                at all until 2026-09-28, despite already using color to mean
                something (previously a flat red on every bar, which didn't
                actually distinguish over/under the limit; see the bar
                color logic in BarsChart). */}
            <div className="mb-4 flex items-center justify-between md:mb-6">
              <span className="text-xs text-gray-400">
                {POLLUTANT_LABEL[pollutant]} (µg/m³)
              </span>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-[2px]"
                    style={{ backgroundColor: COLOR_SALUDABLE }}
                  />
                  Dentro del límite
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-[2px]"
                    style={{ backgroundColor: COLOR_INSALUBRE }}
                  />
                  Sobre el límite
                </span>
              </div>
            </div>
            {bars.length > 0 ? (
              <div ref={setMeasureNode} className="w-full">
                <HorizontalScrollFade
                  minWidth={PAD_LEFT + stationColWidth * bars.length + PAD_RIGHT}
                >
                  <BarsChart
                    bars={bars}
                    year={year}
                    pollutant={pollutant}
                    nomAnual={nomAnual}
                    omsAnual={omsAnual}
                    stationColWidth={stationColWidth}
                  />
                </HorizontalScrollFade>
              </div>
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
          </>
        )}
      </div>

      <div className="border-t border-gray-100 px-5 pb-5 pt-4">
        <InfoTabs tabs={tabs(pollutant, nomAnual)} />
      </div>
    </ChartCard>
  );
}
