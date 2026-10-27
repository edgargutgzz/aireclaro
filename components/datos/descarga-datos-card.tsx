"use client";

import { useState } from "react";
import { ArrowDownToLine, BookOpen } from "lucide-react";
import { track } from "@vercel/analytics";
import { MONTHS_ES_FULL } from "@/lib/dias-insalubres-aggregate";
import InfoTabs, { type InfoTab } from "@/components/datos/info-tabs";
import ChartCard from "@/components/datos/chart-card";
import SegmentedToggle from "@/components/datos/segmented-toggle";
import SelectMenu from "@/components/datos/select-menu";
import { DATA_CITATION, DATA_LICENSE } from "@/lib/metadata";

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
        Las mediciones provienen de las estaciones del SIMA y se obtienen del{" "}
        <a
          href="https://sinaica.inecc.gob.mx"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-neutral-700 underline underline-offset-2 hover:text-neutral-900"
        >
          Sistema Nacional de Información de la Calidad del Aire (SINAICA)
        </a>
        .
      </p>
      <p>Cada fila representa una medición horaria de un contaminante en una estación.</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <span className="font-medium text-neutral-700">fecha:</span> día de la medición.
        </li>
        <li>
          <span className="font-medium text-neutral-700">hora:</span> hora de la medición (0 a 23).
        </li>
        <li>
          <span className="font-medium text-neutral-700">sensor_id:</span> clave de la estación en SINAICA.
        </li>
        <li>
          <span className="font-medium text-neutral-700">estacion:</span> nombre de la estación.
        </li>
        <li>
          <span className="font-medium text-neutral-700">parametro:</span> contaminante medido, PM2.5 o PM10.
        </li>
        <li>
          <span className="font-medium text-neutral-700">valor:</span> concentración en µg/m³. Vacío si la
          estación no reportó esa hora.
        </li>
        <li>
          <span className="font-medium text-neutral-700">val:</span> indicador de validez reportado por SINAICA.
        </li>
      </ul>
      <p>
        <span className="font-medium text-neutral-700">Licencia:</span> esta compilación se publica bajo{" "}
        <a
          href={DATA_LICENSE.deedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-neutral-700 underline underline-offset-2 hover:text-neutral-900"
        >
          {DATA_LICENSE.name}
        </a>
        . Las mediciones son de SINAICA (INECC); al usarlas, cita a SINAICA como fuente original.
      </p>
      <p>
        <span className="font-medium text-neutral-700">Cómo citar:</span> {DATA_CITATION}
      </p>
    </div>
  ),
};

// The foot of /datos: the raw-data download and its Diccionario (what the
// data is, its period and the shared "learn more" tabs live in the page
// header, components/datos/datos-header.tsx). The download is a few filters that build the URL of
// app/api/datos/sima-horario and a same-origin <a download>, so the browser
// saves the streamed CSV directly (same pattern as DownloadImageMenu).
export default function DescargaDatosCard({
  estaciones,
  ultimaFecha,
}: {
  estaciones: Estacion[];
  /** Latest month the monthly sync has published (YYYY-MM). */
  ultimaFecha: string;
}) {
  const ultimoAnio = Number(ultimaFecha.slice(0, 4));
  const ultimoMes = Number(ultimaFecha.slice(5, 7));
  const years = Array.from({ length: ultimoAnio - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);
  // Same pill as the charts' YearToggle, plus "Todos" (every year, one file).
  const anioOptions: { value: string; label: string }[] = [
    ...years.map((y) => ({ value: String(y), label: String(y) })),
    { value: "todos", label: "Todos" },
  ];

  const [anio, setAnio] = useState("todos");
  const [parametro, setParametro] = useState<Parametro>("todos");
  const [estacion, setEstacion] = useState("todas");

  // v = the latest loaded date: when a sync adds days, the link changes, so
  // the CDN can't hand out an older cached file.
  const href = `/api/datos/sima-horario?${new URLSearchParams({
    anio,
    parametro,
    estacion,
    v: ultimaFecha.slice(0, 7),
  })}`;

  // Size hint: the row grid is complete (an empty hour is still a row), so
  // stations x pollutants x hours is the exact row count.
  const anioInicio = anio === "todos" ? FIRST_YEAR : Number(anio);
  const anioFin = anio === "todos" ? ultimoAnio : Number(anio);
  const mesFinal = anioFin === ultimoAnio ? ultimoMes : 12;
  const dias = (Date.UTC(anioFin, mesFinal, 1) - Date.UTC(anioInicio, 0, 1)) / 86_400_000;
  const filas =
    (estacion === "todas" ? estaciones.length : 1) * (parametro === "todos" ? 2 : 1) * dias * 24;
  const mes = (m: number) => MONTHS_ES_FULL[m - 1].toLowerCase();
  const periodo =
    anioInicio !== anioFin
      ? `${mes(1)} de ${anioInicio} a ${mes(mesFinal)} de ${anioFin}`
      : mesFinal === 12
        ? `todo ${anioFin}`
        : `${mes(1)} a ${mes(mesFinal)} de ${anioFin}`;

  return (
    <ChartCard
      title="Descargar datos"
      subtitle="Archivo CSV con una fila por estación, contaminante, fecha y hora."
    >
      <div className="flex flex-col gap-5 px-5 py-5 lg:flex-row lg:flex-wrap lg:items-end">
        <Field label="Año">
          <SegmentedToggle options={anioOptions} value={anio} onChange={setAnio} ariaLabel="Año" />
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
          <SelectMenu
            id="descarga-estacion"
            options={[
              { value: "todas", label: "Todas las estaciones" },
              ...estaciones.map((e) => ({ value: e.sensorId, label: e.nombre })),
            ]}
            value={estacion}
            onChange={setEstacion}
            className="w-64 max-w-full"
          />
        </Field>
        <div className="flex flex-col gap-2 lg:ml-auto lg:items-end">
          <a
            href={href}
            download
            onClick={() => track("descarga_csv", { anio, parametro, estacion })}
            className="flex h-10 w-fit items-center justify-center gap-1.5 rounded-xl bg-stone-800 px-4 text-sm font-medium text-white transition-colors hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
          >
            <ArrowDownToLine className="h-4 w-4" aria-hidden />
            Descargar CSV
          </a>
          <p className="text-xs text-neutral-500">
            {filas.toLocaleString("es-MX")} mediciones, {periodo}
          </p>
        </div>
      </div>
      <div className="border-t border-stone-100 px-5 pb-5 pt-4">
        <InfoTabs tabs={[INFO_TAB]} />
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
  const labelClass = "text-xs font-medium text-neutral-500";
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
