"use client";
import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { Chart } from "react-chartjs-2";
import { Download, Info, X } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
  annotationPlugin,
);

interface SensorData {
  sensor_id: string;
  sensor_nombre: string;
  monthly_avg_pm25: number;
  mes: string;
  ano: number;
}

// Move monthOrder outside the component since it's a constant
const monthOrder = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export default function PM25Chart() {
  const [data, setData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [showInfoPopup, setShowInfoPopup] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/pm25_promedio.csv");
        const csvText = await response.text();

        const lines = csvText.trim().split("\n");

        const parsedData = lines.slice(1).map((line) => {
          const values = line.split(",");
          return {
            sensor_id: values[0]?.trim(),
            sensor_nombre: values[1]?.trim(),
            monthly_avg_pm25: parseFloat(values[2]?.trim()),
            mes: values[3]?.trim(),
            ano: parseInt(values[4]?.trim()),
          };
        });

        setData(parsedData);
        setLoading(false);
      } catch {
        setError("Error al cargar los datos del CSV");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get available years from data
  const availableYears = Array.from(new Set(data.map((item) => item.ano))).sort(
    (a, b) => a - b,
  ); // Sort ascending (oldest first)

  // Get available months for the selected year
  const getAvailableMonthsForYear = (year: number | null) => {
    if (!year) return [];
    return Array.from(
      new Set(data.filter((item) => item.ano === year).map((item) => item.mes)),
    );
  };

  const availableMonths = getAvailableMonthsForYear(selectedYear);

  // Get all unique sensors
  const allUniqueSensors = Array.from(
    new Set(data.map((item) => item.sensor_nombre)),
  ).sort();

  // Calculate max PM2.5 value for fixed scale
  const maxPM25Value = Math.max(
    ...data
      .filter(
        (item) =>
          item.monthly_avg_pm25 !== null &&
          item.monthly_avg_pm25 !== undefined &&
          !isNaN(item.monthly_avg_pm25),
      )
      .map((item) => item.monthly_avg_pm25),
  );

  const yAxisMax = Math.ceil(maxPM25Value / 5) * 5;

  // Group data by month and year
  const groupedByMonthAndYear = data.reduce(
    (acc, row) => {
      const key = `${row.mes}-${row.ano}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(row);
      return acc;
    },
    {} as { [monthYear: string]: SensorData[] },
  );

  // Set defaults when data is loaded
  useEffect(() => {
    if (availableYears.length > 0 && selectedYear === null) {
      setSelectedYear(availableYears[0]); // Set to most recent year
    }
  }, [availableYears, selectedYear]);

  useEffect(() => {
    // When year changes or on initial load, set the first available month for that year
    if (selectedYear && availableMonths.length > 0) {
      // Find the first month in monthOrder that's available for the selected year
      const firstAvailableMonth = monthOrder.find((month) =>
        availableMonths.includes(month),
      );
      if (firstAvailableMonth && selectedMonth !== firstAvailableMonth) {
        setSelectedMonth(firstAvailableMonth);
      }
    }
  }, [selectedYear, availableMonths.length]);

  // Create chart data for selected month and year
  const createChartData = (monthData: SensorData[]) => {
    const validData = monthData.filter(
      (item) =>
        item.monthly_avg_pm25 !== null &&
        item.monthly_avg_pm25 !== undefined &&
        !isNaN(item.monthly_avg_pm25),
    );

    const sortedData = validData.sort(
      (a, b) => b.monthly_avg_pm25 - a.monthly_avg_pm25,
    );

    // Function to shorten location names
    const shortenName = (name: string) => {
      return name
        .replace("Monterrey - Centro", "Mty - Centro")
        .replace("Monterrey - ", "Mty - ")
        .replace("San Nicolás - ", "S.N. - ")
        .replace("San Nicolás", "S.N.")
        .replace("Guadalupe", "Gdpe.")
        .replace("Escobedo", "Escobedo")
        .replace("Cadereyta", "Cadereyta");
    };

    return {
      labels: sortedData.map((item) => shortenName(item.sensor_nombre)),
      datasets: [
        {
          label: "",
          data: sortedData.map((item) => Math.round(item.monthly_avg_pm25)),
          backgroundColor: sortedData.map((item) =>
            Math.round(item.monthly_avg_pm25) > 25
              ? "rgba(239, 68, 68, 0.8)"
              : "rgba(59, 130, 246, 0.8)",
          ),
          borderColor: sortedData.map((item) =>
            Math.round(item.monthly_avg_pm25) > 25
              ? "rgba(239, 68, 68, 1)"
              : "rgba(59, 130, 246, 1)",
          ),
          borderWidth: 1,
          borderRadius: 4,
          originalNames: sortedData.map((item) => item.sensor_nombre),
        },
      ],
    };
  };

  const getSensorsWithNoData = (monthData: SensorData[]) => {
    const sensorsWithData = monthData
      .filter(
        (item) =>
          item.monthly_avg_pm25 !== null &&
          item.monthly_avg_pm25 !== undefined &&
          !isNaN(item.monthly_avg_pm25),
      )
      .map((item) => item.sensor_nombre);

    return allUniqueSensors.filter(
      (sensor) => !sensorsWithData.includes(sensor),
    );
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        titleColor: "rgb(55, 65, 81)",
        bodyColor: "rgb(17, 24, 39)",
        borderColor: "rgba(229, 231, 235, 1)",
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        titleFont: {
          size: 12,
          weight: "normal",
        },
        bodyFont: {
          size: 18,
          weight: "bold",
        },
        padding: {
          top: 12,
          bottom: 12,
          left: 16,
          right: 16,
        },
        titleAlign: "right",
        bodyAlign: "left",
        shadowOffsetX: 0,
        shadowOffsetY: 2,
        shadowBlur: 8,
        shadowColor: "rgba(0, 0, 0, 0.1)",
        callbacks: {
          title: function (context: any) {
            const dataIndex = context[0].dataIndex;
            return context[0].dataset.originalNames[dataIndex];
          },
          label: function (context: any) {
            return `${context.parsed.y} μg/m³`;
          },
        },
      },
      annotation: {
        annotations: {
          mexicanLimit: {
            type: "line",
            yMin: 25,
            yMax: 25,
            borderColor: "rgba(239, 68, 68, 0.8)",
            borderWidth: 1,
            borderDash: [4, 4],
            label: {
              content: "Límite diario (Norma Mexicana): 25 μg/m³",
              enabled: true,
              position: "start",
              backgroundColor: "rgba(239, 68, 68, 0.9)",
              color: "white",
              font: { size: 12 },
              padding: 8,
              cornerRadius: 4,
              display: function (ctx: any) {
                return ctx.hovered;
              },
            },
          },
          mexicanAnnualLimit: {
            type: "line",
            yMin: 10,
            yMax: 10,
            borderColor: "rgba(75, 85, 99, 0.8)",
            borderWidth: 1,
            borderDash: [4, 4],
            label: {
              content: "Límite anual (Norma Mexicana): 10 μg/m³",
              enabled: true,
              position: "start",
              backgroundColor: "rgba(75, 85, 99, 0.9)",
              color: "white",
              font: { size: 12 },
              padding: 8,
              cornerRadius: 4,
              display: function (ctx: any) {
                return ctx.hovered;
              },
            },
          },
          whoLimit: {
            type: "line",
            yMin: 15,
            yMax: 15,
            borderColor: "rgba(75, 85, 99, 0.8)",
            borderWidth: 1,
            borderDash: [4, 4],
            label: {
              content: "Límite diario (OMS): 15 μg/m³",
              enabled: true,
              position: "start",
              backgroundColor: "rgba(75, 85, 99, 0.9)",
              color: "white",
              font: { size: 12 },
              padding: 8,
              cornerRadius: 4,
              display: function (ctx: any) {
                return ctx.hovered;
              },
            },
          },
          whoAnnualLimit: {
            type: "line",
            yMin: 5,
            yMax: 5,
            borderColor: "rgba(75, 85, 99, 0.8)",
            borderWidth: 1,
            borderDash: [4, 4],
            label: {
              content: "Límite anual (OMS): 5 μg/m³",
              enabled: true,
              position: "start",
              backgroundColor: "rgba(75, 85, 99, 0.9)",
              color: "white",
              font: { size: 12 },
              padding: 8,
              cornerRadius: 4,
              display: function (ctx: any) {
                return ctx.hovered;
              },
            },
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: { display: false },
        ticks: {
          font: {
            family: "ui-sans-serif, system-ui, sans-serif",
            size: 12,
            weight: 500,
          },
          color: "rgb(75, 85, 99)",
          maxRotation: 45,
          minRotation: 0,
        },
      },
      y: {
        display: true,
        grid: { display: false },
        title: { display: false },
        min: 0,
        max: 50,
        ticks: {
          font: {
            family: "ui-sans-serif, system-ui, sans-serif",
            size: 12,
            weight: 500,
          },
          color: "rgb(75, 85, 99)",
          stepSize: 5,
        },
      },
    },
  };

  // Get current data based on selected month and year
  const currentKey = `${selectedMonth}-${selectedYear}`;
  const currentMonthData = groupedByMonthAndYear[currentKey] || [];
  const sensorsWithNoData = getSensorsWithNoData(currentMonthData);

  // Info Popup Component
  const InfoPopup = () => {
    if (!showInfoPopup) return null;

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={() => setShowInfoPopup(false)}
        />

        {/* Popup */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg rounded-xl bg-white shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Acerca de la visualización
              </h3>
              <button
                onClick={() => setShowInfoPopup(false)}
                className="text-gray-400 transition-colors hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4 p-6">
              <div>
                <h4 className="mb-2 font-medium text-gray-900">
                  Sistema Integral de Monitoreo Ambiental (SIMA)
                </h4>
                <p className="text-sm text-gray-600">
                  Los datos de PM2.5 provienen de las estaciones de monitoreo
                  del Sistema Integral de Monitoreo Ambiental (SIMA)
                  distribuidas en el Área Metropolitana de Monterrey.
                </p>
              </div>

              <div>
                <h4 className="mb-2 font-medium text-gray-900">
                  Procesamiento de datos
                </h4>
                <p className="text-sm text-gray-600">
                  Los datos de PM2.5 se procesan mediante una agregación en dos
                  etapas: primero se calculan promedios diarios y posteriormente
                  se obtienen los promedios mensuales mostrados, medidos en
                  microgramos por metro cúbico (μg/m³).
                </p>
              </div>

              <div>
                <h4 className="mb-2 font-medium text-gray-900">
                  Límites de referencia
                </h4>
                <p className="text-sm text-gray-600">
                  Se incluyen los límites establecidos por la Norma Oficial
                  Mexicana (NOM-025-SSA1-2021) y las recomendaciones de la
                  Organización Mundial de la Salud (OMS) para PM2.5.
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex h-64 items-center justify-center">
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-center text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Info Popup */}
      <InfoPopup />

      {/* Card Header */}
      <div className="mb-4 flex flex-col gap-3 border-b border-gray-200 pb-4 md:flex-row md:gap-4">
        <div className="flex items-center gap-3 md:w-1/2">
          <button
            onClick={() => setShowInfoPopup(true)}
            className="text-blue-500 transition-colors hover:text-blue-700"
            title="Información sobre los datos"
          >
            <Info size={22} />
          </button>
          <h3 className="text-xl font-semibold text-gray-900">
            Concentraciones de PM2.5 (μg/m³)
          </h3>
        </div>

        {/* Year and Month filters */}
        <div className="flex flex-col gap-2 md:w-1/2 md:flex-row md:gap-6">
          {/* Year selector */}
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1 py-2 md:flex-shrink-0">
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  selectedYear === year
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {year}
              </button>
            ))}
          </div>

          {/* Month selector */}
          <div className="overflow-x-auto rounded-lg bg-gray-100 p-1 py-2 md:flex-1">
            <div className="flex gap-1">
              {monthOrder.map((month) => {
                // Create abbreviated versions for mobile
                const shortMonth = month.substring(0, 3);
                const isAvailable = availableMonths.includes(month);
                const isSelected = selectedMonth === month;

                return (
                  <button
                    key={month}
                    onClick={() => isAvailable && setSelectedMonth(month)}
                    disabled={!isAvailable}
                    className={`flex-shrink-0 rounded-md px-2 py-1 text-sm font-medium capitalize transition-colors md:px-3 md:text-sm ${
                      isSelected && isAvailable
                        ? "bg-white text-gray-900 shadow-sm"
                        : isAvailable
                          ? "text-gray-600 hover:text-gray-900"
                          : "cursor-not-allowed text-gray-400 opacity-50"
                    }`}
                  >
                    <span className="md:hidden">{shortMonth}</span>
                    <span className="hidden md:inline">{month}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Chart container with download button */}
      <div className="mb-4 h-96 w-full md:h-[500px]">
        <Chart
          type="bar"
          data={createChartData(currentMonthData)}
          options={chartOptions}
        />
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 pt-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Reference lines */}
          <div className="md:pr-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-800">
              Límites de referencia
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-0 w-6 border-t-2 border-dashed border-red-400"></div>
                <span className="text-gray-600">
                  Norma Mexicana diario (25 μg/m³)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-0 w-6 border-t-2 border-dashed border-gray-600"></div>
                <span className="text-gray-600">
                  Norma Mexicana anual (10 μg/m³)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-0 w-6 border-t-2 border-dashed border-gray-600"></div>
                <span className="text-gray-600">OMS diario (15 μg/m³)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-0 w-6 border-t-2 border-dashed border-gray-600"></div>
                <span className="text-gray-600">OMS anual (5 μg/m³)</span>
              </div>
            </div>
          </div>

          {/* Sensors without data */}
          <div className="md:px-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-800">
              Estaciones sin datos disponibles
            </h4>
            <div className="flex flex-wrap gap-2">
              {sensorsWithNoData.length > 0 ? (
                sensorsWithNoData.map((sensor, index) => (
                  <span
                    key={index}
                    className="inline-block rounded-md bg-gray-100 px-3 py-1 text-xs text-gray-600"
                  >
                    {sensor}
                  </span>
                ))
              ) : (
                <span className="text-xs italic text-gray-500">
                  Todos los sensores activos
                </span>
              )}
            </div>
          </div>

          {/* Download section */}
          <div className="md:pl-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-800">
              Exportar datos
            </h4>
            <a
              href="/pm25_promedio.csv"
              download="pm25_promedio.csv"
              className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-xs text-gray-700 transition-colors hover:bg-gray-200"
            >
              <Download size={14} />
              Descargar CSV
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
