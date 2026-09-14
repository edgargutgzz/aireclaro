"use client";

import { useMemo, useState } from "react";
import { BookOpen, HeartPulse, ShieldCheck } from "lucide-react";
import { MONTHS_ES } from "@/lib/dias-insalubres-aggregate";
import { COLOR_SALUDABLE } from "@/lib/datos-colors";
import InfoTabs, { type InfoTab } from "@/components/datos/info-tabs";
import YearToggle from "@/components/datos/year-toggle";
import ChartCard from "@/components/datos/chart-card";

interface Estacion {
  sensorId: string;
  nombre: string;
}

interface CoberturaDia {
  sensor_id: string;
  fecha: string;
  cubierto: boolean;
}

const CELL = 11; // px, square size including its own edge
const GAP = 3;
const WEEKDAY_COL_WIDTH = 16; // px
const MONTH_ROW_HEIGHT = 18; // px

// Solid, like the días insalubres bars -- a tint would read weaker than
// COLOR_INSUFICIENTE at this 11px cell size, and this grid is a binary
// covered/not-covered status, not a magnitude that would call for a wash.
const COLOR_CUBIERTO = COLOR_SALUDABLE;
const COLOR_INSUFICIENTE = "#e5e7eb"; // gray-200 -- a data-quality gap, not a health-severity color

// Only every other row gets a letter (L, M, V, D), matching the reference
// design -- labeling all 7 would be noisy at this cell size.
const WEEKDAY_LETTER: Record<number, string> = { 0: "L", 2: "M", 4: "V", 6: "D" };
const WEEKDAY_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

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
        . Un día se contabiliza como &ldquo;con datos&rdquo; cuando al menos
        el 75% de las horas del día contaron con una medición válida de
        PM2.5, por lo que algunos días pueden no aparecer aunque la estación
        haya operado parcialmente. Saltillo (estación Finanzas) queda fuera,
        ya que pertenece a otra zona metropolitana.
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

interface Cell {
  fecha: string;
  row: number;
  col: number;
}

// Monday-first GitHub-style week grid: row 0-6 = Lunes..Domingo, col = week
// index since the first date. Built once from the shared date axis (not per
// station) so all 16 station calendars stay aligned and the layout math
// only runs once.
function buildCalendarLayout(dates: string[]) {
  if (dates.length === 0) return { cells: [] as Cell[], totalCols: 0, monthLabelForCol: new Map<number, string>() };

  const first = new Date(`${dates[0]}T00:00:00Z`);
  const mondayOffset = (first.getUTCDay() + 6) % 7; // 0 = Monday

  const cells: Cell[] = dates.map((fecha) => {
    const d = new Date(`${fecha}T00:00:00Z`);
    const diffDays = Math.round((d.getTime() - first.getTime()) / 86_400_000);
    const absolute = mondayOffset + diffDays;
    return { fecha, row: absolute % 7, col: Math.floor(absolute / 7) };
  });

  const totalCols = cells[cells.length - 1].col + 1;

  const monthLabelForCol = new Map<number, string>();
  let lastMonth = "";
  for (const c of cells) {
    const monthKey = c.fecha.slice(0, 7);
    if (monthKey !== lastMonth && !monthLabelForCol.has(c.col)) {
      monthLabelForCol.set(c.col, MONTHS_ES[Number(c.fecha.slice(5, 7)) - 1]);
    }
    lastMonth = monthKey;
  }

  return { cells, totalCols, monthLabelForCol };
}

function formatTooltipDate(fecha: string, row: number) {
  const [year, month, day] = fecha.split("-").map(Number);
  return `${WEEKDAY_FULL[row]}, ${day} de ${MONTHS_ES[month - 1].toLowerCase()} de ${year}`;
}

interface Tooltip {
  fecha: string;
  row: number;
  cubierto: boolean | undefined;
  x: number;
  y: number;
}

function EstacionCalendario({
  estacion,
  cells,
  totalCols,
  monthLabelForCol,
  coberturaPorFecha,
}: {
  estacion: Estacion;
  cells: Cell[];
  totalCols: number;
  monthLabelForCol: Map<number, string>;
  coberturaPorFecha: Map<string, boolean>;
}) {
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  const diasSinDatos = useMemo(
    () => cells.filter((c) => coberturaPorFecha.get(c.fecha) !== true).length,
    [cells, coberturaPorFecha],
  );

  const gridWidth = WEEKDAY_COL_WIDTH + totalCols * (CELL + GAP);

  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800">{estacion.nombre}</h4>
        {diasSinDatos > 0 && (
          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
            {diasSinDatos} días sin datos
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <div
          className="relative"
          style={{ width: gridWidth }}
          onMouseLeave={() => setTooltip(null)}
          onMouseMove={(e) => {
            const target = (e.target as HTMLElement).closest("[data-fecha]") as HTMLElement | null;
            if (!target) {
              setTooltip(null);
              return;
            }
            const fecha = target.dataset.fecha!;
            const row = Number(target.dataset.row);
            const cubiertoAttr = target.dataset.cubierto;
            setTooltip({
              fecha,
              row,
              cubierto: cubiertoAttr === "true" ? true : cubiertoAttr === "false" ? false : undefined,
              x: e.clientX,
              y: e.clientY,
            });
          }}
        >
          <div style={{ height: MONTH_ROW_HEIGHT, marginLeft: WEEKDAY_COL_WIDTH, position: "relative" }}>
            {Array.from(monthLabelForCol.entries()).map(([col, label]) => (
              <span
                key={col}
                className="absolute text-[10px] font-medium text-gray-400"
                style={{ left: col * (CELL + GAP) }}
              >
                {label}
              </span>
            ))}
          </div>

          <div className="flex">
            <div style={{ width: WEEKDAY_COL_WIDTH }}>
              {Array.from({ length: 7 }, (_, row) => (
                <div
                  key={row}
                  className="text-[10px] font-medium leading-none text-gray-400"
                  style={{ height: CELL + GAP }}
                >
                  {WEEKDAY_LETTER[row] ?? ""}
                </div>
              ))}
            </div>
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${totalCols}, ${CELL}px)`,
                gridTemplateRows: `repeat(7, ${CELL}px)`,
                gap: GAP,
              }}
            >
              {cells.map((c) => {
                const cubierto = coberturaPorFecha.get(c.fecha);
                return (
                  <div
                    key={c.fecha}
                    data-fecha={c.fecha}
                    data-row={c.row}
                    data-cubierto={cubierto === undefined ? "" : String(cubierto)}
                    className="rounded-[2px]"
                    style={{
                      gridColumn: c.col + 1,
                      gridRow: c.row + 1,
                      backgroundColor: cubierto === undefined ? "transparent" : cubierto ? COLOR_CUBIERTO : COLOR_INSUFICIENTE,
                    }}
                  />
                );
              })}
            </div>
          </div>

          {tooltip && (
            <div
              className="pointer-events-none fixed z-20 grid gap-1 rounded-xl border border-black/[0.06] bg-white/95 px-4 py-3 shadow-[0_6px_24px_rgba(0,0,0,0.12)] backdrop-blur-[6px]"
              style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-30%, -115%)" }}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                {formatTooltipDate(tooltip.fecha, tooltip.row)}
              </span>
              <span
                className="text-sm font-semibold"
                style={{ color: tooltip.cubierto ? COLOR_SALUDABLE : "rgb(107,114,128)" }}
              >
                {tooltip.cubierto ? "Con datos" : "Sin datos"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CoberturaEstacionesChart({
  estaciones,
  cobertura,
}: {
  estaciones: Estacion[];
  cobertura: CoberturaDia[];
}) {
  const { dates: allDates, coberturaPorEstacion } = useMemo(() => {
    const dateSet = new Set<string>();
    const porEstacion = new Map<string, Map<string, boolean>>();
    for (const row of cobertura) {
      dateSet.add(row.fecha);
      if (!porEstacion.has(row.sensor_id)) porEstacion.set(row.sensor_id, new Map());
      porEstacion.get(row.sensor_id)!.set(row.fecha, row.cubierto);
    }
    return { dates: Array.from(dateSet).sort(), coberturaPorEstacion: porEstacion };
  }, [cobertura]);

  const years = useMemo(() => [...new Set(allDates.map((d) => Number(d.slice(0, 4))))].sort(), [allDates]);
  const [selectedYear, setSelectedYear] = useState<number | null>(years[years.length - 1] ?? null);
  const year = selectedYear !== null && years.includes(selectedYear) ? selectedYear : years[years.length - 1] ?? null;

  const dates = useMemo(() => allDates.filter((d) => d.startsWith(String(year))), [allDates, year]);
  const { cells, totalCols, monthLabelForCol } = useMemo(() => buildCalendarLayout(dates), [dates]);

  const pctCobertura = useMemo(() => {
    if (cells.length === 0 || estaciones.length === 0) return 0;
    let cubierto = 0;
    for (const estacion of estaciones) {
      const porFecha = coberturaPorEstacion.get(estacion.sensorId);
      for (const c of cells) {
        if (porFecha?.get(c.fecha) === true) cubierto += 1;
      }
    }
    return Math.round((cubierto / (cells.length * estaciones.length)) * 100);
  }, [cells, estaciones, coberturaPorEstacion]);

  if (allDates.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-12 text-center text-sm text-gray-500">
        Sin datos de cobertura por el momento.
      </div>
    );
  }

  return (
    <ChartCard
      title="Cobertura de estaciones en la Zona Metropolitana de Monterrey"
      subtitle={
        <>
          <span className="font-semibold" style={{ color: COLOR_SALUDABLE }}>
            {pctCobertura}%
          </span>{" "}
          de cobertura de PM2.5 en {year}
        </>
      }
      headerRight={<YearToggle years={years} year={year} onChange={setSelectedYear} />}
    >
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 px-5 pt-4 lg:grid-cols-2">
        {estaciones.map((estacion) => (
          <EstacionCalendario
            key={estacion.sensorId}
            estacion={estacion}
            cells={cells}
            totalCols={totalCols}
            monthLabelForCol={monthLabelForCol}
            coberturaPorFecha={coberturaPorEstacion.get(estacion.sensorId) ?? new Map()}
          />
        ))}
      </div>

      <div className="flex items-center gap-4 px-5 pb-4 pt-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-[2px]" style={{ backgroundColor: COLOR_CUBIERTO }} />
          Cubierto
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-[2px]" style={{ backgroundColor: COLOR_INSUFICIENTE }} />
          Datos insuficientes
        </span>
      </div>

      <div className="px-5 pb-5 pt-4">
        <InfoTabs tabs={tabs} />
      </div>
    </ChartCard>
  );
}
