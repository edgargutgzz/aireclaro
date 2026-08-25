"use client";

import { useState } from "react";
import type { DiaInsalubre } from "@/components/data/sima-dias-insalubres";

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

export default function DiasInsalubresPager({ meses }: { meses: MesDiasInsalubres[] }) {
  // meses arrives newest-first; show tabs oldest-to-newest (reads left-to-right like a timeline)
  // but default to the most recent month, since that's what you almost always want first.
  const ordered = [...meses].reverse();
  const [index, setIndex] = useState(ordered.length - 1);
  const { year, month, dias } = ordered[index];
  const totalInsalubres = dias.filter((d) => d.estatus === "insalubre").length;

  return (
    <div className="rounded-2xl bg-gray-50 px-5 py-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-gray-800">
          Días Insalubres en la Zona Metropolitana de Monterrey
        </h1>
        <div className="flex flex-shrink-0 gap-1 rounded-full bg-gray-100 p-1">
          {ordered.map((m, i) => (
            <button
              key={`${m.year}-${m.month}`}
              onClick={() => setIndex(i)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                i === index ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {MESES_CORTOS[m.month - 1]}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        <span className="font-semibold text-red-500">{totalInsalubres}</span>{" "}
        días insalubres de PM2.5 en {MESES[month - 1]} {year}
      </p>

      <div className="mt-6 grid grid-cols-7 gap-2">
        {dias.map(({ dia, estatus }) => (
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
  );
}
