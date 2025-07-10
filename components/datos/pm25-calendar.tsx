"use client";
import { useEffect, useState } from "react";
import { Download, Info, X } from "lucide-react";

interface SensorCalendarData {
  sensor_id: string;
  sensor_nombre: string;
  day: number;
  valid_measurements: number;
  total_possible: number;
  percentage: number;
  valid: boolean;
}

const DAYS_IN_JUNE = 30;

export default function PM25Calendar() {
  const [data, setData] = useState<SensorCalendarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInfoPopup, setShowInfoPopup] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/pm25_promedio_dia.csv");
        const csvText = await response.text();

        const lines = csvText.trim().split("\n");

        const parsedData = lines.slice(1).map((line) => {
          const values = line.split(",");
          return {
            sensor_id: values[0]?.trim(),
            sensor_nombre: values[1]?.trim(),
            day: parseInt(values[2]?.trim()),
            valid_measurements: parseInt(values[3]?.trim()),
            total_possible: parseInt(values[4]?.trim()),
            percentage: parseFloat(values[5]?.trim()),
            valid: values[6]?.trim().toLowerCase() === "yes",
          };
        });

        setData(parsedData);
        setLoading(false);
      } catch {
        setError("Error al cargar los datos del calendario");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get all unique sensors and order them by completion rate
  const allSensors = (() => {
    const uniqueSensors = Array.from(
      new Set(data.map((item) => item.sensor_nombre)), // Use sensor_nombre
    );

    // Calculate completion rate for each sensor
    const sensorCompletionRates = uniqueSensors.map((sensor) => {
      const sensorData = data.filter((item) => item.sensor_nombre === sensor); // Use sensor_nombre
      const totalDays = sensorData.length;
      const completeDays = sensorData.filter(
        (item) => item.percentage === 100,
      ).length;
      const averagePercentage =
        sensorData.reduce((sum, item) => sum + item.percentage, 0) / totalDays;

      return {
        sensor,
        completionRate: averagePercentage,
        completeDays,
        totalDays,
      };
    });

    // Sort by completion rate (descending) and return just the sensor names
    return sensorCompletionRates
      .sort((a, b) => b.completionRate - a.completionRate)
      .map((item) => item.sensor);
  })();

  // Function to shorten location names (similar to pm25-chart)
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

  // Get color based on data validity (Yes/No) with balanced colors
  const getColorClass = (isValid: boolean) => {
    return isValid ? "bg-green-400" : "bg-red-400";
  };

  // Get text color for contrast
  const getTextColor = (isValid: boolean) => {
    return isValid ? "text-white" : "text-white";
  };

  // Get data for specific sensor and day
  const getDataForSensorDay = (sensor: string, day: number) => {
    return data.find(
      (item) => item.sensor_nombre === sensor && item.day === day,
    ); // Use sensor_nombre
  };

  // Info Popup Component
  const InfoPopup = () => {
    if (!showInfoPopup) return null;

    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={() => setShowInfoPopup(false)}
        />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg rounded-xl bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Disponibilidad de datos por estación - Junio 2025
              </h3>
              <button
                onClick={() => setShowInfoPopup(false)}
                className="text-gray-400 transition-colors hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <h4 className="mb-2 font-medium text-gray-900">
                  Cómo leer la visualización
                </h4>
                <p className="text-sm text-gray-600">
                  Esta matriz muestra la disponibilidad de datos para cada
                  estación de monitoreo durante el mes de junio de 2025. Cada
                  fila representa una estación y cada columna representa un día
                  del mes.
                </p>
              </div>
              <div>
                <h4 className="mb-2 font-medium text-gray-900">
                  Código de colores
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-green-400"></div>
                    <span className="text-sm text-gray-600">
                      Verde: Datos suficientes para el día (≥75% de mediciones
                      horarias válidas, equivalente a 18 o más horas con datos)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-red-400"></div>
                    <span className="text-sm text-gray-600">
                      Rojo: Datos insuficientes para el día (&lt;75% de
                      mediciones horarias válidas, menos de 18 horas con datos)
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="mb-2 font-medium text-gray-900">Ordenamiento</h4>
                <p className="text-sm text-gray-600">
                  Las estaciones están ordenadas de mayor a menor disponibilidad
                  de datos, con las estaciones más confiables en la parte
                  superior.
                </p>
              </div>
              <div>
                <h4 className="mb-2 font-medium text-gray-900">
                  Sistema Integral de Monitoreo Ambiental (SIMA)
                </h4>
                <p className="text-sm text-gray-600">
                  Datos de disponibilidad del Sistema Integral de Monitoreo
                  Ambiental (SIMA) del Área Metropolitana de Monterrey.
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
      <InfoPopup />

      {/* Card Header */}
      <div className="mb-4 flex flex-col items-start justify-between gap-3 border-b border-gray-200 pb-4 md:flex-row md:items-center md:gap-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInfoPopup(true)}
            className="text-blue-500 transition-colors hover:text-blue-700"
            title="Información sobre los datos"
          >
            <Info size={22} />
          </button>
          <h3 className="text-xl font-semibold text-gray-900">
            Disponibilidad de datos por estación - Junio 2025
          </h3>
        </div>
      </div>

      {/* Heatmap */}
      <div className="mb-4 overflow-x-auto">
        <div className="min-w-max">
          {/* Header with days */}
          <div className="flex">
            {/* Empty corner cell */}
            <div className="w-36 border-b border-gray-200 p-2"></div>
            {/* Day headers */}
            {Array.from({ length: DAYS_IN_JUNE }, (_, i) => i + 1).map(
              (day) => (
                <div
                  key={day}
                  className="w-12 border-b border-gray-200 p-2 text-center text-sm font-medium text-gray-700"
                >
                  {day}
                </div>
              ),
            )}
          </div>

          {/* Data rows */}
          {allSensors.map((sensor) => (
            <div key={sensor} className="flex">
              {/* Sensor label */}
              <div className="w-36 border-r border-gray-200 p-2 text-center text-sm font-medium text-gray-700">
                {shortenName(sensor)}
              </div>
              {/* Data cells */}
              {Array.from({ length: DAYS_IN_JUNE }, (_, i) => i + 1).map(
                (day) => {
                  const dayData = getDataForSensorDay(sensor, day);
                  return (
                    <div
                      key={`${sensor}-${day}`}
                      className="w-12 border-r border-gray-200 p-1"
                    >
                      {dayData ? (
                        <div
                          className={`h-8 w-full rounded ${getColorClass(dayData.valid)} ${getTextColor(dayData.valid)} flex cursor-pointer items-center justify-center`}
                          title={`${shortenName(sensor)} - Día ${day}: ${dayData.valid_measurements}/${dayData.total_possible} mediciones (${dayData.percentage.toFixed(1)}%)`}
                        >
                          {/* Remove the percentage display */}
                        </div>
                      ) : (
                        <div className="flex h-8 w-full items-center justify-center rounded bg-gray-100">
                          <span className="text-xs text-gray-400">-</span>
                        </div>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 pt-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Legend */}
          <div className="md:pr-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-800">
              Leyenda de colores
            </h4>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-green-400"></div>
                <span className="text-gray-600">Datos suficientes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-red-400"></div>
                <span className="text-gray-600">Datos insuficientes</span>
              </div>
            </div>
          </div>

          {/* Download section */}
          <div className="md:pl-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-800">
              Exportar datos
            </h4>
            <a
              href="/pm25_promedio_dia.csv"
              download="pm25_promedio_dia.csv"
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
