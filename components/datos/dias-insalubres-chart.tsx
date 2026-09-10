"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip } from "@/components/ui/chart";

export type Pollutant = "pm25" | "pm10";

export interface MonthData {
  ano: number;
  mesNumero: number;
  mes: string;
  diasInsalubres: number;
  diasTotales: number;
}

const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MONTH_FULL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// PM10 numbers don't yet reconcile with the client's own PM10 chart (23 vs
// 15 insalubre days for Aug 2026, traced to one station, NO3, that may or
// may not be in their dataset) — hide the tab until that's resolved. The
// fetch/aggregation stays in place; flip this back on once it checks out.
const SHOW_PM10_TAB = false;

const POLLUTANT_LABEL: Record<Pollutant, string> = { pm25: "PM2.5", pm10: "PM10" };
const POLLUTANT_LIMITS: Record<Pollutant, { antes: number; desde: number }> = {
  pm25: { antes: 33, desde: 25 },
  pm10: { antes: 60, desde: 50 },
};

// Reserved status pair (good/bad), not a categorical hue set: red/green is the
// universal convention for a health chart like this and stays even though the
// dataviz skill's CVD check fails any red/green pair. Compensated with
// non-hue channels instead of picking a different hue: a fixed stacking
// position (insalubre always at the base), a persistent legend, and the exact
// counts always in plain text (header stat + tooltip), never color alone.
const chartConfig = {
  insalubres: { label: "Insalubres", color: "#ff0000" },
  saludables: { label: "Saludables", color: "#00a400" },
} satisfies ChartConfig;

function InfoTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as {
    mesNumero: number;
    ano: number;
    insalubres: number;
    saludables: number;
    diasTotales: number;
  };
  const pct = row.diasTotales > 0 ? Math.round((row.insalubres / row.diasTotales) * 100) : 0;

  return (
    <div className="grid min-w-[11rem] gap-2 rounded-xl border border-black/[0.08] bg-white/95 px-4 py-3.5 shadow-[0_6px_24px_rgba(0,0,0,0.1)] backdrop-blur-[6px]">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {MONTH_FULL[row.mesNumero - 1]} {row.ano}
      </span>
      <div className="flex gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-2xl font-bold leading-none text-red-600">{row.insalubres}</span>
          <span className="text-xs text-gray-500">insalubres</span>
        </div>
        <div className="w-px bg-gray-100" />
        <div className="flex flex-col gap-0.5">
          <span className="text-2xl font-bold leading-none text-green-600">{row.saludables}</span>
          <span className="text-xs text-gray-500">saludables</span>
        </div>
      </div>
      <div className="border-t border-gray-100 pt-2 text-xs text-gray-500">
        {pct}% de días insalubres
      </div>
    </div>
  );
}

function infoTabs(pollutant: Pollutant) {
  const label = POLLUTANT_LABEL[pollutant];
  const { antes, desde } = POLLUTANT_LIMITS[pollutant];
  return [
    {
      id: "fuente",
      label: "Datos oficiales",
      body: (
        <>
          Los datos de calidad del aire ({label} µg/m³) provienen de las
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
      id: "norma",
      label: "Norma mexicana",
      body: (
        <>
          Se clasifica la calidad del aire como saludable o insalubre con base
          en el límite diario establecido por la{" "}
          <a
            href="https://www.dof.gob.mx/nota_detalle.php?codigo=5633855&fecha=27/10/2021"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
          >
            NOM-025-SSA1-2021
          </a>
          . El límite fue de {antes} µg/m³ hasta el 26 de diciembre de 2025 y
          bajó a {desde} µg/m³ a partir del 27 de diciembre de 2025.
        </>
      ),
    },
    {
      id: "metodologia",
      label: "Metodología",
      body: (
        <>
          Un día se contabiliza si al menos una estación reportó un promedio
          válido (mínimo 75% de horas con dato). Si alguna estación registra
          un valor que supera el límite del día, el día completo se clasifica
          como insalubre. Saltillo (estación Finanzas) queda fuera del
          conteo, ya que pertenece a otra zona metropolitana.
        </>
      ),
    },
    {
      id: "salud",
      label: "Impacto en salud",
      body:
        pollutant === "pm10" ? (
          <>
            Las partículas PM10 penetran las vías respiratorias superiores y
            pueden alojarse en bronquios y pulmones. La exposición frecuente
            irrita ojos, nariz y garganta, y agrava el asma, la bronquitis y
            la EPOC.
          </>
        ) : (
          <>
            Las partículas PM2.5 son tan pequeñas que penetran profundo en
            los pulmones y llegan al torrente sanguíneo. La exposición
            prolongada se asocia con enfermedades respiratorias,
            cardiovasculares y daño sistémico.
          </>
        ),
    },
  ];
}

export default function DiasInsalubresChart({ data }: { data: Record<Pollutant, MonthData[]> }) {
  const [pollutant, setPollutant] = useState<Pollutant>("pm25");
  const activeData = data[pollutant];

  const years = useMemo(() => [...new Set(activeData.map((d) => d.ano))].sort(), [activeData]);
  const [selectedYear, setSelectedYear] = useState<number | null>(years[years.length - 1] ?? null);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const year = selectedYear !== null && years.includes(selectedYear) ? selectedYear : years[years.length - 1] ?? null;

  const chartData = useMemo(() => {
    const byMonth = new Map(activeData.filter((d) => d.ano === year).map((d) => [d.mesNumero, d]));
    return Array.from({ length: 12 }, (_, i) => {
      const mesNumero = i + 1;
      const row = byMonth.get(mesNumero);
      return {
        mesNumero,
        ano: year ?? 0,
        mesLabel: MONTH_SHORT[i],
        insalubres: row?.diasInsalubres ?? 0,
        saludables: row ? row.diasTotales - row.diasInsalubres : 0,
        diasTotales: row?.diasTotales ?? 0,
        sinDatos: !row,
      };
    });
  }, [activeData, year]);

  const totalInsalubres = chartData.reduce((sum, d) => sum + d.insalubres, 0);
  const tabs = infoTabs(pollutant);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 pt-4 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-medium text-gray-700">
            Días insalubres en la zona metropolitana de Monterrey
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            <span className="font-semibold text-red-600">{totalInsalubres}</span>{" "}
            días insalubres de {POLLUTANT_LABEL[pollutant]} en {year}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {SHOW_PM10_TAB && (
            <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
              {(["pm25", "pm10"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPollutant(p)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 ${
                    pollutant === p ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {POLLUTANT_LABEL[p]}
                </button>
              ))}
            </div>
          )}
          {years.length > 1 && (
            <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
              {years.map((y) => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 ${
                    year === y ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 pb-2 pt-4">
        <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full md:h-96">
          <BarChart data={chartData} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke="rgba(229,231,235,0.6)" />
            <XAxis
              dataKey="mesLabel"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fontWeight: 500, fill: "rgb(75,85,99)" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tick={{ fontSize: 12, fontWeight: 500, fill: "rgb(75,85,99)" }}
            />
            <ChartTooltip cursor={{ fill: "rgba(229,231,235,0.3)" }} content={<InfoTooltip />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="insalubres"
              stackId="dias"
              fill={chartConfig.insalubres.color}
              fillOpacity={0.6}
              stroke="#fff"
              strokeWidth={2}
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="saludables"
              stackId="dias"
              fill={chartConfig.saludables.color}
              fillOpacity={0.5}
              stroke="#fff"
              strokeWidth={2}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
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
            <p className="text-sm leading-relaxed text-gray-600">
              {tabs.find((t) => t.id === activeTab)?.body}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
