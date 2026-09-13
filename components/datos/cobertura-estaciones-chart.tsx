"use client";

import { useMemo, useState } from "react";
import { MONTHS_ES } from "@/lib/dias-insalubres-aggregate";

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

const COLOR_CUBIERTO = "#00a400"; // matches "saludables" green elsewhere on this page
const COLOR_INSUFICIENTE = "#e5e7eb"; // gray-200 -- a data-quality gap, not a health-severity color

// Only every other row gets a letter (L, M, V, D), matching the reference
// design -- labeling all 7 would be noisy at this cell size.
const WEEKDAY_LETTER: Record<number, string> = { 0: "L", 2: "M", 4: "V", 6: "D" };
const WEEKDAY_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const tabs = [
  {
    id: "fuente",
    label: "Datos oficiales",
    body: (
      <>
        Los datos provienen de las estaciones de monitoreo del{" "}
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
    body: (
      <>
        Un día se considera cubierto cuando la estación reportó al menos 75%
        de horas válidas (18 de 24) para PM2.5. Saltillo (estación Finanzas)
        queda fuera, ya que pertenece a otra zona metropolitana.
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
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
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
              <span className={`text-sm font-semibold ${tooltip.cubierto ? "text-green-600" : "text-gray-500"}`}>
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
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const { dates, coberturaPorEstacion } = useMemo(() => {
    const dateSet = new Set<string>();
    const porEstacion = new Map<string, Map<string, boolean>>();
    for (const row of cobertura) {
      dateSet.add(row.fecha);
      if (!porEstacion.has(row.sensor_id)) porEstacion.set(row.sensor_id, new Map());
      porEstacion.get(row.sensor_id)!.set(row.fecha, row.cubierto);
    }
    return { dates: Array.from(dateSet).sort(), coberturaPorEstacion: porEstacion };
  }, [cobertura]);

  const { cells, totalCols, monthLabelForCol } = useMemo(() => buildCalendarLayout(dates), [dates]);

  if (dates.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-12 text-center text-sm text-gray-500">
        Sin datos de cobertura por el momento.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-base font-medium text-gray-700">
          Cobertura de estaciones en la Zona Metropolitana de Monterrey
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Un día se considera cubierto cuando la estación reportó al menos 75% de horas válidas (18 de 24).
        </p>
      </div>

      <div className="space-y-4">
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

      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: COLOR_CUBIERTO }} />
          Cubierto
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: COLOR_INSUFICIENTE }} />
          Datos insuficientes
        </span>
      </div>

      <div className="mt-3">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}
              className={`rounded-xl border px-3.5 py-2.5 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 ${
                activeTab === tab.id
                  ? "border-gray-300 bg-gray-50 text-gray-800"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab && (
          <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4">
            <p className="text-sm leading-relaxed text-gray-600">{tabs.find((t) => t.id === activeTab)?.body}</p>
          </div>
        )}
      </div>
    </div>
  );
}
