"use client";

import { Bar, BarChart, Cell, XAxis, Tooltip, CartesianGrid } from "recharts";

import { ChartConfig, ChartContainer } from "@/components/ui/chart";

const chartData = [
  { hour: "00:00", pm25: 10 },
  { hour: "01:00", pm25: 12 },
  { hour: "02:00", pm25: 15 },
  { hour: "03:00", pm25: 18 },
  { hour: "04:00", pm25: 22 },
  { hour: "05:00", pm25: 30 },
  { hour: "06:00", pm25: 40 },
  { hour: "07:00", pm25: 50 },
  { hour: "08:00", pm25: 60 },
  { hour: "09:00", pm25: 70 },
  { hour: "10:00", pm25: 80 },
  { hour: "11:00", pm25: 90 },
  { hour: "12:00", pm25: 100 },
  { hour: "13:00", pm25: 110 },
  { hour: "14:00", pm25: 120 },
  { hour: "15:00", pm25: 130 },
  { hour: "16:00", pm25: 140 },
  { hour: "17:00", pm25: 130 },
  { hour: "18:00", pm25: 120 },
  { hour: "19:00", pm25: 110 },
  { hour: "20:00", pm25: 100 },
  { hour: "21:00", pm25: 90 },
  { hour: "22:00", pm25: 80 },
  { hour: "23:00", pm25: 70 },
];

const getColorForPm25 = (pm25: number) => {
  if (pm25 === null || pm25 < 0) {
    return "#9CA3AF"; // Tailwind CSS bg-gray-400
  } else if (pm25 >= 0 && pm25 <= 15) {
    return "#34D399"; // Tailwind CSS bg-green-400
  } else if (pm25 > 15 && pm25 <= 25) {
    return "#FBBF24"; // Tailwind CSS bg-yellow-400
  } else if (pm25 > 25 && pm25 <= 79) {
    return "#FB923C"; // Tailwind CSS bg-orange-400
  } else if (pm25 > 79 && pm25 <= 130) {
    return "#EF4444"; // Tailwind CSS bg-red-400
  } else if (pm25 > 130) {
    return "#A855F7"; // Tailwind CSS bg-purple-400
  }
};

const getQualityText = (pm25: number) => {
  if (pm25 === null || pm25 < 0) return "No Disponible";
  if (pm25 >= 0 && pm25 <= 15) return "Buena";
  if (pm25 > 15 && pm25 <= 25) return "Aceptable";
  if (pm25 > 25 && pm25 <= 79) return "Mala";
  if (pm25 > 79 && pm25 <= 130) return "Muy Mala";
  if (pm25 > 130) return "Extremadamente Mala";
  return "No Disponible";
};

const chartConfig = {
  pm25: {
    label: "PM2.5",
  },
} satisfies ChartConfig;

export function Chart() {
  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      <BarChart width={600} height={300} data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="hour" ticks={["00:00", "06:00", "12:00", "18:00"]} />
        <Tooltip
          formatter={(value, name, props) => [
            getQualityText(Number(value)),
            "Calidad del Aire",
          ]}
        />
        <Bar dataKey="pm25" radius={4}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getColorForPm25(entry.pm25)} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
