"use client";

import { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type TooltipModel,
  type ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { ShieldCheck, Scale, BookOpen, HeartPulse } from "lucide-react";
import type { DiaInsalubre } from "@/components/data/sima-dias-insalubres";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export interface MesDiasInsalubres {
  year: number;
  month: number;
  dias: DiaInsalubre[];
}

const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MONTH_FULL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

type InfoTab = "fuente" | "norma" | "metodologia" | "salud";

// Matches observatoriodelaire.com's own Días Insalubres chart design
// (components/datos/pm25-dias-excedidos.tsx there) as closely as possible,
// so Aire Claro's Datos section reads as the same product.
export default function DiasInsalubresChart({ meses }: { meses: MesDiasInsalubres[] }) {
  const [activeInfoTab, setActiveInfoTab] = useState<InfoTab | null>(null);

  const sorted = useMemo(() => [...meses].sort((a, b) => a.year - b.year || a.month - b.month), [meses]);
  const years = useMemo(() => Array.from(new Set(sorted.map((m) => m.year))), [sorted]);
  const [selectedYear, setSelectedYear] = useState(years[years.length - 1]);

  const { labels, diasExcedidos, diasTotales, diasSaludables } = useMemo(() => {
    const yearData = sorted.filter((m) => m.year === selectedYear);
    const byMonth: Record<number, MesDiasInsalubres> = Object.fromEntries(yearData.map((m) => [m.month, m]));
    const labels: string[] = [];
    const diasExcedidos: (number | null)[] = [];
    const diasTotales: (number | null)[] = [];
    const diasSaludables: (number | null)[] = [];

    for (let m = 1; m <= 12; m++) {
      labels.push(MONTH_SHORT[m - 1]);
      const row = byMonth[m];
      if (row) {
        const insalubre = row.dias.filter((d) => d.estatus === "insalubre").length;
        const saludable = row.dias.filter((d) => d.estatus === "saludable").length;
        diasExcedidos.push(insalubre);
        diasTotales.push(insalubre + saludable);
        diasSaludables.push(saludable);
      } else {
        diasExcedidos.push(null);
        diasTotales.push(null);
        diasSaludables.push(null);
      }
    }
    return { labels, diasExcedidos, diasTotales, diasSaludables };
  }, [sorted, selectedYear]);

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "Días sobre la norma",
          data: diasExcedidos,
          backgroundColor: "rgba(239,68,68,0.55)",
          borderColor: "rgba(239,68,68,0.9)",
          borderWidth: 1.5,
          borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 8, bottomRight: 8 },
          borderSkipped: "top" as const,
          stack: "days",
        },
        {
          label: "Días saludables",
          data: diasSaludables,
          backgroundColor: "rgba(34,197,94,0.45)",
          borderColor: "rgba(34,197,94,0.8)",
          borderWidth: 1.5,
          borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 0, bottomRight: 0 },
          borderSkipped: "bottom" as const,
          stack: "days",
        },
      ],
    }),
    [labels, diasExcedidos, diasSaludables],
  );

  const chartOptions: ChartOptions<"bar"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      resizeDelay: 200,
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false,
          external: (context: { chart: ChartJS; tooltip: TooltipModel<"bar"> }) => {
            const id = "dias-insalubres-tooltip";
            let el = document.getElementById(id);
            if (!el) {
              el = document.createElement("div");
              el.id = id;
              el.style.position = "fixed";
              el.style.pointerEvents = "none";
              el.style.zIndex = "50";
              el.style.transition = "opacity 0.2s ease";
              // A data readout, not a glass panel: the numbers have to stay
              // crisp, so this is near-solid white with a light hairline doing
              // the separating, and only a trace of blur left behind it.
              el.style.backdropFilter = "blur(6px)";
              (el.style as unknown as { webkitBackdropFilter: string }).webkitBackdropFilter = "blur(6px)";
              el.style.background = "rgba(255,255,255,0.95)";
              el.style.border = "1px solid rgba(0,0,0,0.08)";
              el.style.borderRadius = "12px";
              el.style.boxShadow = "0 6px 24px rgba(0,0,0,0.10)";
              el.style.padding = "16px 22px";
              el.style.fontFamily = "ui-sans-serif, system-ui, sans-serif";
              document.body.appendChild(el);
              context.chart.canvas.addEventListener("mouseleave", () => {
                el!.style.opacity = "0";
              });
              document.addEventListener("touchstart", (e: Event) => {
                if (!(e.target as Element).closest("canvas")) el!.style.opacity = "0";
              });
            }

            const tooltip = context.tooltip;
            if (tooltip.opacity === 0) {
              el.style.opacity = "0";
              return;
            }

            const idx = tooltip.dataPoints?.[0]?.dataIndex ?? 0;
            const excedidos = diasExcedidos[idx];
            const totales = diasTotales[idx];
            const mesLabel = MONTH_FULL[idx];

            if (totales === null || excedidos === null) {
              el.style.opacity = "0";
              return;
            }

            const sanos = totales - excedidos;
            const pct = totales > 0 ? Math.round((excedidos / totales) * 100) : 0;

            el.innerHTML = `
              <div style="display:flex;flex-direction:column;gap:6px;min-width:170px;">
                <span style="color:rgb(156,163,175);font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:0.06em;">${mesLabel} ${selectedYear}</span>
                <div style="display:flex;gap:16px;margin-top:4px;">
                  <div style="display:flex;flex-direction:column;gap:2px;">
                    <span style="font-size:28px;font-weight:700;line-height:1;color:rgba(239,68,68,1);">${excedidos}</span>
                    <span style="font-size:11px;color:rgb(156,163,175);">insalubres</span>
                  </div>
                  <div style="width:1px;background:rgba(0,0,0,0.08);"></div>
                  <div style="display:flex;flex-direction:column;gap:2px;">
                    <span style="font-size:28px;font-weight:700;line-height:1;color:rgba(34,197,94,1);">${sanos}</span>
                    <span style="font-size:11px;color:rgb(156,163,175);">saludables</span>
                  </div>
                </div>
                <div style="height:1px;background:rgba(0,0,0,0.06);margin:2px 0;"></div>
                <span style="font-size:12px;color:rgb(107,114,128);">${pct}% de días insalubres</span>
              </div>
            `;

            const rect = context.chart.canvas.getBoundingClientRect();
            el.style.opacity = "1";
            el.style.top = rect.top + tooltip.caretY + "px";
            el.style.transform = "translateY(-50%)";
            if (tooltip.caretX > rect.width / 2) {
              el.style.left = rect.left + tooltip.caretX - 16 + "px";
              el.style.transform = "translateY(-50%) translateX(-100%)";
            } else {
              el.style.left = rect.left + tooltip.caretX + 16 + "px";
              el.style.transform = "translateY(-50%)";
            }
          },
        },
      },
      scales: {
        x: {
          display: true,
          stacked: true,
          grid: { display: false },
          ticks: {
            font: { family: "ui-sans-serif, system-ui, sans-serif", size: 12, weight: 500 },
            color: "rgb(75,85,99)",
          },
        },
        y: {
          display: true,
          stacked: true,
          min: 0,
          grid: { display: true, color: "rgba(229,231,235,0.5)" },
          ticks: {
            font: { family: "ui-sans-serif, system-ui, sans-serif", size: 12, weight: 500 },
            color: "rgb(75,85,99)",
            stepSize: 5,
            precision: 0,
          },
        },
      },
      interaction: { intersect: false, mode: "index" },
    }),
    [diasExcedidos, diasTotales, selectedYear],
  );

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:border-white/60 md:bg-white/70 md:shadow-xl md:backdrop-blur-xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 border-b border-gray-200/50 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-800">
            Días Insalubres en la Zona Metropolitana de Monterrey
          </h3>
          <p className="mt-1 text-sm text-gray-400">
            <span className="font-semibold text-red-500">
              {diasExcedidos.reduce((sum: number, v) => sum + (v ?? 0), 0)}
            </span>{" "}
            días insalubres de PM2.5 en {selectedYear}
          </p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-2xl bg-gray-100 p-1">
          {years.map((y) => {
            const isActive = selectedYear === y;
            return (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`rounded-xl px-5 py-2 text-sm font-semibold transition-colors ${
                  isActive ? "bg-white text-stone-800 shadow-sm" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {y}
              </button>
            );
          })}
        </div>
      </div>

      {/* Y axis label */}
      <span className="mb-3 block text-xs text-gray-400">Días del mes</span>

      {/* Chart */}
      <div className="h-96 w-full md:h-[500px]">
        <Bar data={chartData} options={chartOptions} />
      </div>

      {/* Info tabs */}
      <div className="mt-8">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
          <button
            onClick={() => setActiveInfoTab(activeInfoTab === "fuente" ? null : "fuente")}
            className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left transition-colors ${
              activeInfoTab === "fuente" ? "border-green-200 bg-green-50" : "border-gray-200 bg-white hover:border-green-200 hover:bg-green-50"
            }`}
          >
            <ShieldCheck size={16} className="flex-shrink-0 text-green-500" />
            <p className="text-[11px] font-medium leading-tight text-gray-600">Datos oficiales</p>
          </button>

          <button
            onClick={() => setActiveInfoTab(activeInfoTab === "norma" ? null : "norma")}
            className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left transition-colors ${
              activeInfoTab === "norma" ? "border-red-200 bg-red-50" : "border-gray-200 bg-white hover:border-red-200 hover:bg-red-50"
            }`}
          >
            <Scale size={16} className="flex-shrink-0 text-red-400" />
            <p className="text-[11px] font-medium leading-tight text-gray-600">Norma Mexicana</p>
          </button>

          <button
            onClick={() => setActiveInfoTab(activeInfoTab === "metodologia" ? null : "metodologia")}
            className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left transition-colors ${
              activeInfoTab === "metodologia" ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50"
            }`}
          >
            <BookOpen size={16} className="flex-shrink-0 text-blue-400" />
            <p className="text-[11px] font-medium leading-tight text-gray-600">Metodología</p>
          </button>

          <button
            onClick={() => setActiveInfoTab(activeInfoTab === "salud" ? null : "salud")}
            className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left transition-colors ${
              activeInfoTab === "salud" ? "border-violet-200 bg-violet-50" : "border-gray-200 bg-white hover:border-violet-200 hover:bg-violet-50"
            }`}
          >
            <HeartPulse size={16} className="flex-shrink-0 text-violet-400" />
            <p className="text-[11px] font-medium leading-tight text-gray-600">Impacto en salud</p>
          </button>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            activeInfoTab ? "mt-3 max-h-[300px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="rounded-2xl border border-gray-200/60 bg-gray-50/60 px-6 py-5 backdrop-blur-sm">
            {activeInfoTab === "fuente" && (
              <p className="text-sm text-gray-600">
                Los datos de calidad del aire (PM2.5 μg/m³) provienen de las estaciones de monitoreo del{" "}
                <a href="http://aire.nl.gob.mx" target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                  Sistema Integral de Monitoreo Ambiental (SIMA)
                </a>{" "}
                de Nuevo León.
              </p>
            )}
            {activeInfoTab === "norma" && (
              <p className="text-sm text-gray-600">
                Se clasifica la calidad del aire como saludable o insalubre con base en el límite diario establecido por la{" "}
                <a
                  href="https://www.dof.gob.mx/nota_detalle.php?codigo=5633855&fecha=27/10/2021"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline"
                >
                  NOM-025-SSA1-2021
                </a>
                . El límite fue de 33 μg/m³ hasta el 26 de diciembre de 2025 y bajó a 25 μg/m³ a partir del 27 de diciembre de 2025.
              </p>
            )}
            {activeInfoTab === "metodologia" && (
              <p className="text-sm text-gray-600">
                Para garantizar mayor certeza en la información, los datos se analizan siguiendo los criterios establecidos por la{" "}
                <a
                  href="https://www.dof.gob.mx/nota_detalle.php?codigo=5633855&fecha=27/10/2021"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline"
                >
                  NOM-025-SSA1-2021
                </a>
                . Un día se contabiliza si al menos una estación reportó mediciones, por lo que algunos meses pueden mostrar menos días de los que corresponden. Si alguna estación registra un valor que supera el límite, el día se clasifica como insalubre.
              </p>
            )}
            {activeInfoTab === "salud" && (
              <p className="text-sm text-gray-600">
                Las partículas PM2.5 son tan pequeñas que penetran profundo en los pulmones y llegan al torrente sanguíneo. La exposición prolongada se asocia con enfermedades respiratorias, cardiovasculares y daño sistémico.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
