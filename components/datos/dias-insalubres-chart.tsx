"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { BookOpen, HeartPulse, Scale, ShieldCheck } from "lucide-react";
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip } from "@/components/ui/chart";
import type { MonthData, Pollutant } from "@/lib/dias-insalubres-aggregate";
import { COLOR_INSALUBRE, COLOR_INSALUBRE_OPACITY, COLOR_SALUDABLE, COLOR_SALUDABLE_OPACITY } from "@/lib/datos-colors";
import InfoTabs, { type InfoTab } from "@/components/datos/info-tabs";
import YearToggle from "@/components/datos/year-toggle";
import ChartCard from "@/components/datos/chart-card";

export type { MonthData, Pollutant };

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

// Reserved status pair (good/bad), not a categorical hue set. See
// lib/datos-colors.ts for why saludable is blue, not green: every
// red/green option here failed the dataviz skill's colorblind check, and
// blue/red is the skill's own prescribed diverging fix. Still backed by
// non-hue channels regardless: a fixed stacking position (insalubre always
// at the base), a persistent legend, and the exact counts always in plain
// text (header stat + tooltip), never color alone.
const chartConfig = {
  insalubres: { label: "Insalubres", color: COLOR_INSALUBRE },
  saludables: { label: "Saludables", color: COLOR_SALUDABLE },
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
          <span className="text-2xl font-bold leading-none" style={{ color: COLOR_INSALUBRE }}>
            {row.insalubres}
          </span>
          <span className="text-xs text-gray-500">insalubres</span>
        </div>
        <div className="w-px bg-gray-100" />
        <div className="flex flex-col gap-0.5">
          <span className="text-2xl font-bold leading-none" style={{ color: COLOR_SALUDABLE }}>
            {row.saludables}
          </span>
          <span className="text-xs text-gray-500">saludables</span>
        </div>
      </div>
      <div className="border-t border-gray-100 pt-2 text-xs text-gray-500">
        {pct}% de días insalubres
      </div>
    </div>
  );
}

function infoTabs(pollutant: Pollutant): InfoTab[] {
  const label = POLLUTANT_LABEL[pollutant];
  const { antes, desde } = POLLUTANT_LIMITS[pollutant];
  return [
    {
      id: "fuente",
      label: "Datos oficiales",
      icon: ShieldCheck,
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
      icon: Scale,
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
      icon: BookOpen,
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
      icon: HeartPulse,
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
    <ChartCard
      title="Días insalubres en la Zona Metropolitana de Monterrey"
      subtitle={
        <>
          <span className="font-semibold" style={{ color: COLOR_INSALUBRE }}>
            {totalInsalubres}
          </span>{" "}
          días insalubres de {POLLUTANT_LABEL[pollutant]} en {year}
        </>
      }
      headerRight={
        <>
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
          <YearToggle years={years} year={year} onChange={setSelectedYear} />
        </>
      }
    >
      <div className="px-5 pb-2 pt-4">
        <ChartContainer config={chartConfig} className="aspect-auto h-80 w-full md:h-[28rem]">
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
            <ChartLegend content={<ChartLegendContent className="text-gray-500" />} />
            {/* Square at the baseline, rounded only at the data-end (the top of
                the whole stack) -- a colored border around a mark adds ink that
                isn't data; the white stroke instead carves the 2px surface gap
                that separates the two segments. */}
            <Bar
              dataKey="insalubres"
              stackId="dias"
              fill={chartConfig.insalubres.color}
              fillOpacity={COLOR_INSALUBRE_OPACITY}
              stroke="#fff"
              strokeWidth={2}
              radius={[0, 0, 0, 0]}
              maxBarSize={24}
            />
            <Bar
              dataKey="saludables"
              stackId="dias"
              fill={chartConfig.saludables.color}
              fillOpacity={COLOR_SALUDABLE_OPACITY}
              stroke="#fff"
              strokeWidth={2}
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
          </BarChart>
        </ChartContainer>
      </div>

      <div className="px-5 pb-5 pt-4">
        <InfoTabs tabs={tabs} />
      </div>
    </ChartCard>
  );
}
