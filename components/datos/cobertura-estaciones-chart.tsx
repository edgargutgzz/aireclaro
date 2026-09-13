"use client";

import { Fragment, useMemo, useState } from "react";
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
const LABEL_WIDTH = 168; // px, sticky station-name column

const COLOR_CUBIERTO = "#00a400"; // matches "saludables" green elsewhere on this page
const COLOR_INSUFICIENTE = "#e5e7eb"; // gray-200 -- a data-quality gap, not a health-severity color

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

export default function CoberturaEstacionesChart({
  estaciones,
  cobertura,
}: {
  estaciones: Estacion[];
  cobertura: CoberturaDia[];
}) {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const { dates, bySensorAndDate } = useMemo(() => {
    const dateSet = new Set<string>();
    const map = new Map<string, boolean>();
    for (const row of cobertura) {
      dateSet.add(row.fecha);
      map.set(`${row.sensor_id}|${row.fecha}`, row.cubierto);
    }
    return { dates: Array.from(dateSet).sort(), bySensorAndDate: map };
  }, [cobertura]);

  const monthLabelAt = useMemo(() => {
    const labels = new Map<number, string>();
    let lastMonth = "";
    dates.forEach((fecha, i) => {
      const monthKey = fecha.slice(0, 7);
      if (monthKey !== lastMonth) {
        labels.set(i, MONTHS_ES[Number(fecha.slice(5, 7)) - 1]);
        lastMonth = monthKey;
      }
    });
    return labels;
  }, [dates]);

  if (dates.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 py-12 text-center text-sm text-gray-500">
        Sin datos de cobertura por el momento.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 pt-4 pb-3">
        <h3 className="text-base font-medium text-gray-700">
          Cobertura de estaciones en la Zona Metropolitana de Monterrey
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Un día se considera cubierto cuando la estación reportó al menos 75% de horas válidas (18 de 24).
        </p>
      </div>

      <div className="overflow-x-auto px-5 py-4">
        <div
          className="grid w-max gap-[3px]"
          style={{ gridTemplateColumns: `${LABEL_WIDTH}px repeat(${dates.length}, ${CELL}px)` }}
        >
          <div className="sticky left-0 z-10 bg-white" />
          {dates.map((fecha, i) => (
            <div key={fecha} className="h-4 text-[10px] font-medium leading-4 text-gray-400">
              {monthLabelAt.get(i) ?? ""}
            </div>
          ))}

          {estaciones.map((estacion) => (
            <Fragment key={estacion.sensorId}>
              <div
                className="sticky left-0 z-10 flex items-center truncate bg-white pr-2 text-xs font-medium text-gray-600"
                style={{ height: CELL }}
                title={estacion.nombre}
              >
                {estacion.nombre}
              </div>
              {dates.map((fecha) => {
                const cubierto = bySensorAndDate.get(`${estacion.sensorId}|${fecha}`);
                return (
                  <div
                    key={`${estacion.sensorId}-${fecha}`}
                    className="rounded-[2px]"
                    style={{
                      width: CELL - 3,
                      height: CELL - 3,
                      backgroundColor: cubierto === undefined ? "transparent" : cubierto ? COLOR_CUBIERTO : COLOR_INSUFICIENTE,
                    }}
                    title={`${estacion.nombre} — ${fecha}: ${
                      cubierto === undefined ? "sin datos" : cubierto ? "cubierto" : "datos insuficientes"
                    }`}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 px-5 pb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: COLOR_CUBIERTO }} />
          Cubierto
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: COLOR_INSUFICIENTE }} />
          Datos insuficientes
        </span>
      </div>

      <div className="px-5 pb-5 pt-1">
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
