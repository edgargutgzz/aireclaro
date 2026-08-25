"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DiaInsalubre } from "@/components/data/sima-dias-insalubres";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export interface MesDiasInsalubres {
  year: number;
  month: number;
  dias: DiaInsalubre[];
}

export default function DiasInsalubresPager({ meses }: { meses: MesDiasInsalubres[] }) {
  const [index, setIndex] = useState(0);
  const { year, month, dias } = meses[index];
  const totalInsalubres = dias.filter((d) => d.estatus === "insalubre").length;

  return (
    <div className="rounded-2xl bg-gray-50 px-5 py-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">
          Días Insalubres en la Zona Metropolitana de Monterrey
        </h1>
        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            onClick={() => setIndex((i) => Math.min(i + 1, meses.length - 1))}
            disabled={index >= meses.length - 1}
            className="rounded-full p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:hover:text-gray-400"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="w-8 text-center text-xs text-gray-400">
            {index + 1}/{meses.length}
          </span>
          <button
            onClick={() => setIndex((i) => Math.max(i - 1, 0))}
            disabled={index <= 0}
            className="rounded-full p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:hover:text-gray-400"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
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
