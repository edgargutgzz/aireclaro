"use client";

import { useState } from "react";
import { ArrowDownToLine, BookOpen, ChevronDown } from "lucide-react";
import { MONTHS_ES_FULL } from "@/lib/dias-insalubres-aggregate";
import type { InfoTab } from "@/components/datos/info-tabs";
import ChartCard from "@/components/datos/chart-card";
import SegmentedToggle from "@/components/datos/segmented-toggle";
import YearToggle from "@/components/datos/year-toggle";

interface Estacion {
  sensorId: string;
  nombre: string;
}

type Parametro = "todos" | "PM2.5" | "PM10";

const FIRST_YEAR = 2025; // sima_mediciones_finales starts 2025-01-01

const PARAMETRO_OPTIONS: { value: Parametro; label: string }[] = [
  { value: "todos", label: "Ambos" },
  { value: "PM2.5", label: "PM2.5" },
  { value: "PM10", label: "PM10" },
];

const INFO_TAB: InfoTab = {
  id: "diccionario",
  label: "Diccionario",
  icon: BookOpen,
  body: (
    <div className="space-y-3">
      <p>
        Mediciones horarias tal como las publica SINAICA, sin ajustes. Son la base de todas las gráficas
        de esta página. Se actualizan cada mes, cuando SINAICA cierra el mes anterior.
      </p>
      <p>Cada fila es una hora de una estación y un contaminante. Columnas:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <span className="font-medium text-gray-700">fecha, hora:</span> día y hora (0 a 23) de la medición,
          como los reporta SINAICA.
        </li>
        <li>
          <span className="font-medium text-gray-700">estacion_id, estacion:</span> clave de SINAICA y nombre
          de la estación.
        </li>
        <li>
          <span className="font-medium text-gray-700">valor_ug_m3:</span> concentración en µg/m³. Vacío si la
          estación no reportó esa hora.
        </li>
        <li>
          <span className="font-medium text-gray-700">valido:</span> indicador de validez de SINAICA. Las
          gráficas solo usan horas con valido = 1 y valor no negativo.
        </li>
        <li>
          <span className="font-medium text-gray-700">bandera:</span> código de bandera de SINAICA, sin
          modificar.
        </li>
      </ul>
    </div>
  ),
};

// The raw-data download: a few filters that build the URL of
// app/api/datos/sima-horario, and a same-origin <a download>, so the browser
// saves the streamed CSV directly (same pattern as DownloadImageMenu).
export default function DescargaDatosCard({
  estaciones,
  ultimaFecha,
}: {
  estaciones: Estacion[];
  /** Latest date loaded in sima_mediciones_finales (YYYY-MM-DD). */
  ultimaFecha: string;
}) {
  const ultimoAnio = Number(ultimaFecha.slice(0, 4));
  const ultimoMes = Number(ultimaFecha.slice(5, 7));
  const years = Array.from({ length: ultimoAnio - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);

  const [anio, setAnio] = useState(ultimoAnio);
  const [parametro, setParametro] = useState<Parametro>("todos");
  const [estacion, setEstacion] = useState("todas");

  const href = `/api/datos/sima-horario?${new URLSearchParams({
    anio: String(anio),
    parametro,
    estacion,
  })}`;

  // Size hint: the row grid is complete (an empty hour is still a row), so
  // stations x pollutants x hours is the exact row count.
  const mesFinal = anio === ultimoAnio ? ultimoMes : 12;
  const dias = (Date.UTC(anio, mesFinal, 1) - Date.UTC(anio, 0, 1)) / 86_400_000;
  const filas =
    (estacion === "todas" ? estaciones.length : 1) * (parametro === "todos" ? 2 : 1) * dias * 24;
  const periodo =
    mesFinal === 12
      ? `todo ${anio}`
      : `${MONTHS_ES_FULL[0].toLowerCase()} a ${MONTHS_ES_FULL[mesFinal - 1].toLowerCase()} de ${anio}`;

  return (
    <ChartCard
      title="Descarga de datos horarios"
      subtitle={`Mediciones horarias de PM2.5 y PM10 de las ${estaciones.length} estaciones del SIMA en la Zona Metropolitana de Monterrey.`}
      infoTab={INFO_TAB}
    >
      <div className="flex flex-col gap-5 px-5 py-5 lg:flex-row lg:flex-wrap lg:items-end">
        <Field label="Año">
          <YearToggle years={years} year={anio} onChange={setAnio} />
        </Field>
        <Field label="Contaminante">
          <SegmentedToggle
            options={PARAMETRO_OPTIONS}
            value={parametro}
            onChange={setParametro}
            ariaLabel="Contaminante"
          />
        </Field>
        <Field label="Estación" htmlFor="descarga-estacion">
          <div className="relative">
            <select
              id="descarga-estacion"
              value={estacion}
              onChange={(e) => setEstacion(e.target.value)}
              className="w-full appearance-none rounded-xl bg-gray-100 py-2.5 pl-3 pr-9 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 lg:w-64"
            >
              <option value="todas">Todas las estaciones</option>
              {estaciones.map((e) => (
                <option key={e.sensorId} value={e.sensorId}>
                  {e.nombre}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden
            />
          </div>
        </Field>
        <div className="flex flex-col gap-2 lg:ml-auto lg:items-end">
          <a
            href={href}
            download
            className="flex h-10 w-fit items-center justify-center gap-1.5 rounded-xl bg-gray-800 px-4 text-sm font-medium text-white transition-colors hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
          >
            <ArrowDownToLine className="h-4 w-4" aria-hidden />
            Descargar CSV
          </a>
          <p className="text-xs text-gray-500">
            {filas.toLocaleString("es-MX")} filas, {periodo}
          </p>
        </div>
      </div>
    </ChartCard>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  /** Set for a native control (a real <label>); toggle groups carry their
   *  own aria-label instead. */
  htmlFor?: string;
  children: React.ReactNode;
}) {
  const labelClass = "text-xs font-medium text-gray-500";
  return (
    <div className="flex flex-col gap-1.5">
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClass}>
          {label}
        </label>
      ) : (
        <span className={labelClass}>{label}</span>
      )}
      <div className="w-fit max-w-full">{children}</div>
    </div>
  );
}
