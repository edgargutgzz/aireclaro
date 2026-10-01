"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ShieldCheck } from "lucide-react";
import type { Pollutant } from "@/lib/dias-insalubres-aggregate";
import { getLimitAnualPM10 } from "@/lib/pm25-limits";
import {
  COLOR_CUBIERTO,
  COLOR_CUBIERTO_FILL_OPACITY,
  COLOR_INSALUBRE,
  COLOR_INSALUBRE_FILL_OPACITY,
  COLOR_SALUDABLE,
  COLOR_SALUDABLE_FILL_OPACITY,
  withOpacity,
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

// A function of pollutant now (2026-09-28: was a flat constant array,
// PM2.5-only) -- "fuente" and "salud" only needed pluralizing, already
// pollutant-general in spirit. Metodología itself no longer states the
// actual limit value (that sentence was dropped 2026-09-28 -- the chart's
// own dashed reference line already shows it), so it no longer branches
// per pollutant either.
function tabs(pollutant: Pollutant): InfoTab[] {
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
      // One merged tab, not two -- días insalubres and cobertura each have
      // a single "Metodología" tab that states its rule and closes with the
      // same NOM citation sentence; chart 3 had split that same shape into
      // a separate "Norma Mexicana" (the limit value) and "Metodología"
      // (the trimester rule) tab (2026-09-28 request: match how 1 and 2
      // already word this panel, one tab).
      id: "metodologia",
      label: "Metodología",
      icon: BookOpen,
      body: (
        <>
          La estación se considera con datos suficientes para presentar su
          promedio anual si al menos tres de los cuatro trimestres son
          válidos; un trimestre es válido cuando la estación reportó
          mediciones en al menos el 75% de sus días. Todo lo anterior, con
          base en la Norma Oficial Mexicana:{" "}
          <a
            href="https://www.dof.gob.mx/nota_detalle.php?codigo=5633855&fecha=27/10/2021"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
          >
            NOM-025-SSA1-2021
          </a>
          .
        </>
      ),
    },
  ];
}

// Prefers the latest COMPLETE year as the default/fallback selection, not
// simply the latest year on record -- días insalubres/cobertura always have
// a meaningful current-year view, but this chart shows no bars at all for
// an in-progress year (NOM-025 only defines a full-calendar-year figure;
// see isCompleteYear below), so defaulting to "whatever year exists" would
// load straight into that empty placeholder every time (2026-09-28
// request: "we still don't have enough data for 2026"). Falls back to the
// latest year overall only if every year on record is somehow incomplete
// (a brand-new deploy with no closed year yet).
function latestCompleteOrLatestYear(years: number[]): number | null {
  const currentYear = new Date().getFullYear();
  const complete = years.filter((y) => y < currentYear);
  return complete[complete.length - 1] ?? years[years.length - 1] ?? null;
}

interface StationBar {
  sensorId: string;
  nombre: string;
  promedio: number;
  rows: TrimestreRow[];
}

// The T1-T4 breakdown shown in the bar's own hover tooltip -- one segmented
// bar, not four dots (2026-09-28 request): four equal-width sections, one
// per trimester, painted blue (valid) or gray (not), left to right in
// calendar order. Blue, not green -- this is a data-COMPLETENESS reading
// (validity), not a health-quality one, same reasoning as cobertura's own
// "has data" blue (see COLOR_CUBIERTO in lib/datos-colors.ts). At
// COLOR_CUBIERTO_FILL_OPACITY, not full strength -- matching the hex alone
// wasn't enough: cobertura's own "Con datos" cells render that blue at 68%
// over white, a visibly softer shade than this bar's original full-strength
// fill (2026-09-28 feedback, after checking the actual rendered colors
// side by side, not just the shared token). The header states the X/4
// count on its own now (the "mín. 75% días" rule dropped 2026-09-28 --
// already explained in the Metodología tab, redundant here), so the bar
// itself carries no text -- reads as "how much of the year cleared the
// bar," matching the bar-chart visual language the rest of the page
// already uses instead of a row of isolated dots.
// `overflow-hidden rounded-full` on the flex container (not on each
// section) rounds only the two true outer ends, per the dataviz skill's
// own "rounded only at the outer tip, square where a mark meets its
// neighbor" rule already used elsewhere in this file's real bars; the
// `gap-0.5` between sections exposes the tooltip's own white background as
// a thin surface-color seam, the same "gap instead of a border" separator
// convention as every other stacked mark on /datos.
const COLOR_CUBIERTO_FILL = withOpacity(COLOR_CUBIERTO, COLOR_CUBIERTO_FILL_OPACITY);

function TrimestreBreakdown({ rows }: { rows: TrimestreRow[] }) {
  const rowsByT = new Map(rows.map((r) => [r.trimestre, r]));
  const validCount = rows.filter((r) => r.valido).length;

  return (
    <div className="grid gap-2.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
        Trimestres ({validCount}/4 válidos)
      </span>
      <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
        {[1, 2, 3, 4].map((t) => {
          const r = rowsByT.get(t);
          return (
            <div
              key={t}
              className="flex-1"
              style={{
                backgroundColor: r?.valido ? COLOR_CUBIERTO_FILL : "#d1d5db",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ---- Hand-rolled SVG bar chart -------------------------------------------
// Built plain (no charting library) so it can match the site's own spacing,
// color, and radius tokens exactly, and so hover/tooltip/z-order are our own
// DOM/paint order rather than a library's internal layering -- see the
// dataviz skill's mark specs: no border on the mark (a surface gap does the
// separating instead), solid (never dashed) recessive gridlines, dashed
// lines reserved for the two threshold references.

// Días insalubres' own chart is 460px desktop / 320px mobile (added
// 2026-09-22 for that chart specifically); this chart never got that same
// pass and stayed at a flat 380 from before the responsive split existed
// anywhere on /datos -- its bars read shorter than días insalubres' own
// bars as a result, not from any width/gutter difference (2026-09-28
// feedback: "it's about the height of the chart compared to chart 1").
// Matching those exact two values now, same breakpoint.
const CHART_HEIGHT_DESKTOP = 460;
const CHART_HEIGHT_MOBILE = 320;
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
// Generous estimate (header/number+pollutant caption/one-row trimester
// dot strip). Dropped from 280 -- the "Sobre/Dentro del límite" caption
// line was removed again same day, and the trimester breakdown collapsed
// from 4 rows to a single row of dots (2026-09-28), a real reduction this
// time, not offset by anything added elsewhere.
const TOOLTIP_HEIGHT = 180;

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
  pollutant,
  nomAnual,
  totalWidth,
  chartHeight,
  barCenterX,
  barTopY,
}: {
  bar: StationBar;
  pollutant: Pollutant;
  nomAnual: number;
  totalWidth: number;
  chartHeight: number;
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
    chartHeight,
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
      {/* Number + its own caption, gap-1.5 (not the tighter gap-0.5 tried
          earlier the same day) -- read as too crowded against the number
          above it (2026-09-28 feedback). Pollutant moved onto the number's
          own line instead of the caption below it -- was missing entirely
          there, and this data gets forwarded as a standalone screenshot (a
          board deck, not necessarily the live page with the toggle
          visible), so the number itself needs to say which pollutant on
          its own, not just the chart's own axis label above it. */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold leading-none" style={{ color }}>
            {Math.round(bar.promedio)}
          </span>
          <span className="text-sm font-medium text-gray-400">
            {POLLUTANT_LABEL[pollutant]} µg/m³
          </span>
        </div>
        <span className="text-xs text-gray-500">Promedio anual</span>
      </div>
      <div className="border-t border-gray-100 pt-2">
        <TrimestreBreakdown rows={bar.rows} />
      </div>
    </div>
  );
}

// Truncates the station-name label to whatever fits its own column, not a
// flat character count -- a year where every station qualifies (2025 PM10:
// all 15) pushes stationColWidth down toward STATION_COL_WIDTH_MIN (130px),
// and the longest real names ("Garcia: Valle de Lincoln," 24 chars)
// visually crowd into neighboring columns there, even though those same
// names fit without truncating once a spottier year gives each bar a wider
// column (2026-09-28 feedback: "I don't know if there's a better way" for
// the 15-bar case). AVG_CHAR_WIDTH is a rough estimate for this label's own
// fontSize/weight (12px, 500) -- good enough for a truncation decision,
// not pixel-exact; the untruncated name is always still in the tooltip,
// aria-label, and sr-only list, so nothing is actually lost, just not
// shown twice at the axis.
const AVG_CHAR_WIDTH = 7; // px
function truncateStationLabel(name: string, columnWidth: number): string {
  const maxChars = Math.floor(columnWidth / AVG_CHAR_WIDTH);
  if (name.length <= maxChars) return name;
  return `${name.slice(0, Math.max(1, maxChars - 1))}…`;
}

function BarsChart({
  bars,
  pollutant,
  nomAnual,
  omsAnual,
  stationColWidth,
  chartHeight,
}: {
  bars: StationBar[];
  pollutant: Pollutant;
  nomAnual: number;
  omsAnual: number;
  stationColWidth: number;
  chartHeight: number;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  useDismissTooltip(hoveredIdx !== null, () => setHoveredIdx(null));

  // +PAD_LEFT/+PAD_RIGHT: bandX below offsets every column by PAD_LEFT, so
  // the declared width has to reserve that same room or the last column's
  // right edge runs past totalWidth and gets clipped by the SVG's own
  // boundary -- días insalubres' own "last bar crowds the card edge" fix,
  // missing here until 2026-09-28.
  const totalWidth = PAD_LEFT + stationColWidth * bars.length + PAD_RIGHT;
  const plotHeight = chartHeight - PAD_TOP - PAD_BOTTOM;
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
      style={{ width: totalWidth, height: chartHeight }}
    >
      <svg
        width={totalWidth}
        height={chartHeight}
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
              {/* fontSize 12, matching días insalubres' own month labels --
                  was 11 with no stated reason (2026-09-28 audit). Truncated
                  to fit stationColWidth (see truncateStationLabel) -- the
                  full name is still in the tooltip, aria-label, and
                  sr-only list below. */}
              <text
                x={bandX(i) + stationColWidth / 2}
                y={chartHeight - PAD_BOTTOM + 16}
                textAnchor="middle"
                fontSize={12}
                fontWeight={500}
                fill="rgb(75,85,99)"
              >
                {truncateStationLabel(b.nombre, stationColWidth)}
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
          pollutant={pollutant}
          nomAnual={nomAnual}
          totalWidth={totalWidth}
          chartHeight={chartHeight}
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
    latestCompleteOrLatestYear(years),
  );
  const year =
    selectedYear !== null && years.includes(selectedYear)
      ? selectedYear
      : latestCompleteOrLatestYear(years);

  // NOM-025-SSA1-2021's own "valor anual" is only ever a full calendar year
  // (§3.11: "concentración... calculada en un año calendario") -- it has no
  // concept of a partial-year figure at all. A year still in progress used
  // to show whatever trimesters had validated so far as a "T1-T2 (Ene-Jun)"
  // partial bar, but that isn't a figure the norm defines, and reads as more
  // authoritative than it is. Now an in-progress year shows nothing (see the
  // body render below) rather than a number that isn't really the norm's
  // "annual" value (2026-09-28 feedback).
  const isCompleteYear = year !== null && year < new Date().getFullYear();

  const { bars, sinDatosCount } = useMemo(() => {
    // Nothing to compute for an in-progress year -- see isCompleteYear above.
    if (!isCompleteYear) return { bars: [] as StationBar[], sinDatosCount: 0 };

    const rowsByStation = new Map<string, TrimestreRow[]>();
    for (const t of trimestresPollutant) {
      if (t.ano !== year) continue;
      const lista = rowsByStation.get(t.sensor_id) ?? [];
      lista.push(t);
      rowsByStation.set(t.sensor_id, lista);
    }

    const bars: StationBar[] = [];
    // Just a count now -- the per-station "falta de información" pill list
    // (name + hover breakdown) was simplified away (2026-09-28 request): a
    // second subtitle line stating how many stations lack it replaces the
    // detail those pills used to carry.
    let sinDatosCount = 0;
    // NOM-025's own "datos suficientes" bar for a finished year -- not a
    // stricter 4/4.
    const MIN_TRIMESTRES_REQUERIDOS = 3;

    for (const est of estaciones) {
      const rows = rowsByStation.get(est.sensorId) ?? [];
      const validRows = rows.filter((r) => r.valido);

      if (validRows.length < MIN_TRIMESTRES_REQUERIDOS) {
        sinDatosCount += 1;
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

    return { bars, sinDatosCount };
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

  // Shorter plot on mobile -- same values/breakpoint as días insalubres'
  // own chartHeight (matches Tailwind's md: breakpoint so this switches at
  // the same width every other responsive rule on the page does).
  const [chartHeight, setChartHeight] = useState(CHART_HEIGHT_DESKTOP);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const update = () =>
      setChartHeight(mql.matches ? CHART_HEIGHT_DESKTOP : CHART_HEIGHT_MOBILE);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  // Same guard cobertura already has for a genuinely empty table (a brand-
  // new deploy, or local dev against an empty database) -- without it,
  // `year` is null here and every "en {year}" sentence below would print
  // the literal word "null" (2026-09-28 audit: not a live issue today,
  // since real data exists).
  if (years.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-12 text-center text-sm text-gray-500">
        Sin datos de promedio anual por el momento.
      </div>
    );
  }

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
          // Same two-line subtitle shell días insalubres/cobertura use for
          // their own secondary stat (md:flex md:items-center md:gap-3, a
          // divider that only shows once both lines share a row, `contents`
          // + `invisible` rather than unmounting so the header doesn't jump
          // height switching between a pollutant/year with excluded
          // stations and one without). Second line replaces the old
          // per-station "falta de información" pill row (2026-09-28
          // request: simplify to a plain count).
          <div className="md:flex md:items-center md:gap-3">
            <div>
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
            </div>
            <div className={`contents ${sinDatosCount > 0 ? "" : "invisible"}`}>
              <div className="hidden h-4 w-px bg-gray-200 md:block" />
              <p className="mt-2 text-xs md:mt-0 md:text-sm">
                <span>{sinDatosCount}</span>{" "}
                {sinDatosCount === 1 ? "estación" : "estaciones"} sin datos
                suficientes
              </p>
            </div>
          </div>
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
        {/* Always rendered now, regardless of isCompleteYear/bars.length --
            same shell días insalubres uses for its own axis-label + legend
            row (mb-4 flex items-center justify-between md:mb-6, h-2 w-2
            rounded-[2px] swatches). Previously only shown alongside real
            bars, so switching to/from an in-progress year (or a complete
            year with zero qualifying stations) also removed this whole
            row -- on top of the chart-area itself already matching height
            via chartHeight in every branch, losing this row's own height
            was the rest of the "feels less fluid switching years" gap
            (2026-09-28 feedback). */}
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
        {!isCompleteYear ? (
          // No partial-year figure -- see isCompleteYear's own comment
          // above. A single centered message instead of the chart itself,
          // same chartHeight as the real bars so the card's total height
          // doesn't change switching to/from a year that has data.
          <div
            className="flex items-center justify-center rounded-lg bg-gray-50 text-center text-sm text-gray-400"
            style={{ height: chartHeight }}
          >
            El promedio anual de {year} estará disponible cuando termine el año.
          </div>
        ) : bars.length > 0 ? (
          <div ref={setMeasureNode} className="w-full">
            <HorizontalScrollFade
              minWidth={PAD_LEFT + stationColWidth * bars.length + PAD_RIGHT}
            >
              <BarsChart
                bars={bars}
                pollutant={pollutant}
                nomAnual={nomAnual}
                omsAnual={omsAnual}
                stationColWidth={stationColWidth}
                chartHeight={chartHeight}
              />
            </HorizontalScrollFade>
          </div>
        ) : (
          <div
            className="flex items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400"
            style={{ height: chartHeight }}
          >
            Sin datos suficientes todavía
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 px-5 pb-5 pt-4">
        <InfoTabs tabs={tabs(pollutant)} />
      </div>
    </ChartCard>
  );
}
