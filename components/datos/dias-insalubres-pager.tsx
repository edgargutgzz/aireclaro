"use client";

import { useMemo, useState } from "react";
import type { DiaInsalubre } from "@/components/data/sima-dias-insalubres";
import DiasInsalubresYearChart from "@/components/datos/dias-insalubres-year-chart";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const MESES_CORTOS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export interface MesDiasInsalubres {
  year: number;
  month: number;
  dias: DiaInsalubre[];
}

function pillClass(selected: boolean) {
  return `rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
    selected ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
  }`;
}

export default function DiasInsalubresPager({ meses }: { meses: MesDiasInsalubres[] }) {
  const sorted = useMemo(
    () => [...meses].sort((a, b) => a.year - b.year || a.month - b.month),
    [meses],
  );
  const years = useMemo(() => Array.from(new Set(sorted.map((m) => m.year))), [sorted]);
  const latest = sorted[sorted.length - 1];

  const [year, setYear] = useState(latest.year);
  const [month, setMonth] = useState(latest.month);

  const monthsInYear = sorted.filter((m) => m.year === year);
  const current = monthsInYear.find((m) => m.month === month) ?? monthsInYear[monthsInYear.length - 1];

  function selectYear(y: number) {
    const monthsForYear = sorted.filter((m) => m.year === y);
    setYear(y);
    setMonth(monthsForYear[monthsForYear.length - 1].month);
  }

  const monthTotals = useMemo(
    () =>
      monthsInYear.map((m) => ({
        month: m.month,
        insalubre: m.dias.filter((d) => d.estatus === "insalubre").length,
        saludable: m.dias.filter((d) => d.estatus === "saludable").length,
      })),
    [monthsInYear],
  );

  const yearTotalInsalubres = monthTotals.reduce((sum, m) => sum + m.insalubre, 0);
  const currentMonthInsalubres = current.dias.filter((d) => d.estatus === "insalubre").length;

  return (
    <div className="rounded-2xl bg-gray-50 px-5 py-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-gray-800">
          Días Insalubres en la Zona Metropolitana de Monterrey
        </h1>
        {years.length > 1 && (
          <div className="flex flex-shrink-0 gap-1 rounded-full bg-gray-100 p-1">
            {years.map((y) => (
              <button key={y} onClick={() => selectYear(y)} className={pillClass(y === year)}>
                {y}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="mt-1 text-sm text-gray-500">
        <span className="font-semibold text-red-500">{yearTotalInsalubres}</span>{" "}
        días insalubres de PM2.5 en {year}
      </p>

      <div className="mt-6">
        <DiasInsalubresYearChart year={year} months={monthTotals} selectedMonth={current.month} onSelectMonth={setMonth} />
      </div>

      <div className="mt-6 border-t border-gray-200 pt-5">
        <div className="flex flex-wrap gap-1 self-start rounded-xl bg-gray-100 p-1">
          {monthsInYear.map((m) => (
            <button key={m.month} onClick={() => setMonth(m.month)} className={pillClass(m.month === current.month)}>
              {MESES_CORTOS[m.month - 1]}
            </button>
          ))}
        </div>

        <p className="mt-4 text-sm text-gray-500">
          <span className="font-semibold text-red-500">{currentMonthInsalubres}</span>{" "}
          días insalubres de PM2.5 en {MESES[current.month - 1]} {current.year}
        </p>

        <div className="mt-6 grid grid-cols-7 gap-2">
          {current.dias.map(({ dia, estatus }) => (
            <div
              key={dia}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg text-sm font-medium ${
                estatus === "insalubre"
                  ? "bg-red-100 text-red-700"
                  : estatus === "saludable"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {dia}
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" /> Insalubre
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" /> Saludable
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-gray-300" /> Sin datos
          </div>
        </div>
      </div>
    </div>
  );
}
