import ChartCard from "@/components/datos/chart-card";

// Card shell only for now -- no data wired up yet. Follows the same
// ChartCard shape as dias-insalubres-chart.tsx / cobertura-estaciones-chart.tsx
// so it drops into the same visual rhythm once the real chart lands.
export default function PromedioAnualEstacion() {
  return (
    <ChartCard
      title="Promedio anual por estación en la Zona Metropolitana de Monterrey"
      subtitle="Próximamente"
    >
      <div className="flex h-80 items-center justify-center px-5 pb-6 pt-6 text-sm text-gray-400 md:h-[32rem]">
        Gráfico en construcción.
      </div>
    </ChartCard>
  );
}
