"use client";

import { useState } from "react";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const MESES_CORTOS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const CHART_HEIGHT = 220; // px

export interface MonthTotal {
  month: number;
  insalubre: number;
  saludable: number;
}

export default function DiasInsalubresYearChart({
  year,
  months,
  selectedMonth,
  onSelectMonth,
}: {
  year: number;
  months: MonthTotal[];
  selectedMonth: number;
  onSelectMonth: (month: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const maxTotal = Math.max(5, ...months.map((m) => m.insalubre + m.saludable));
  const niceMax = Math.ceil(maxTotal / 5) * 5;
  const tickCount = Math.min(8, niceMax / 5 + 1);
  const step = niceMax / (tickCount - 1);
  const ticks = Array.from({ length: tickCount }, (_, i) => Math.round(niceMax - i * step));

  return (
    <div className="flex gap-3">
      <div className="flex flex-shrink-0 flex-col justify-between text-xs text-gray-400" style={{ height: CHART_HEIGHT }}>
        {ticks.map((t) => (
          <span key={t} className="leading-none">{t}</span>
        ))}
      </div>

      <div
        className="flex min-w-0 flex-1 items-end gap-1.5 border-l border-gray-200 pl-3 sm:gap-2"
        style={{ height: CHART_HEIGHT }}
      >
        {months.map((m) => {
          const total = m.insalubre + m.saludable;
          const pct = total > 0 ? Math.round((m.insalubre / total) * 100) : 0;
          const isSelected = m.month === selectedMonth;
          const isHovered = hovered === m.month;

          return (
            <div key={m.month} className="relative flex h-full min-w-0 flex-1 flex-col items-center">
              {isHovered && (
                <div className="absolute bottom-full z-10 mb-2 w-max min-w-[9rem] rounded-xl bg-white px-4 py-3 text-xs shadow-lg ring-1 ring-black/5">
                  <p className="mb-2 font-semibold uppercase tracking-wide text-gray-400">
                    {MESES[m.month - 1]} {year}
                  </p>
                  <div className="flex gap-4">
                    <div>
                      <span className="block text-base font-bold text-red-500">{m.insalubre}</span>
                      <span className="text-gray-400">insalubres</span>
                    </div>
                    <div>
                      <span className="block text-base font-bold text-green-500">{m.saludable}</span>
                      <span className="text-gray-400">saludables</span>
                    </div>
                  </div>
                  <p className="mt-2 text-gray-500">{pct}% de días insalubres</p>
                </div>
              )}

              <button
                onClick={() => onSelectMonth(m.month)}
                onMouseEnter={() => setHovered(m.month)}
                onMouseLeave={() => setHovered(null)}
                className="flex w-full flex-1 flex-col justify-end overflow-hidden rounded-t-md"
                aria-label={`${MESES[m.month - 1]} ${year}: ${m.insalubre} días insalubres, ${m.saludable} saludables`}
              >
                <div
                  className={isSelected ? "w-full bg-green-300" : "w-full bg-green-200"}
                  style={{ height: `${(m.saludable / niceMax) * 100}%` }}
                />
                <div
                  className={isSelected ? "w-full bg-red-400" : "w-full bg-red-300"}
                  style={{ height: `${(m.insalubre / niceMax) * 100}%` }}
                />
              </button>

              <span className={`mt-2 text-xs ${isSelected ? "font-semibold text-gray-900" : "text-gray-500"}`}>
                {MESES_CORTOS[m.month - 1]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
