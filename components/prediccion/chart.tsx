"use client";

import { Bar, BarChart } from "recharts";

import { ChartConfig, ChartContainer } from "@/components/ui/chart";

const chartData = [
  { hour: "00:00", pm25: 10 },
  { hour: "01:00", pm25: 15 },
  { hour: "02:00", pm25: 8 },
  { hour: "03:00", pm25: 5 },
  { hour: "04:00", pm25: 6 },
  { hour: "05:00", pm25: 7 },
  { hour: "06:00", pm25: 12 },
  { hour: "07:00", pm25: 20 },
  { hour: "08:00", pm25: 25 },
  { hour: "09:00", pm25: 30 },
  { hour: "10:00", pm25: 35 },
  { hour: "11:00", pm25: 40 },
  { hour: "12:00", pm25: 45 },
  { hour: "13:00", pm25: 50 },
  { hour: "14:00", pm25: 55 },
  { hour: "15:00", pm25: 60 },
  { hour: "16:00", pm25: 65 },
  { hour: "17:00", pm25: 70 },
  { hour: "18:00", pm25: 75 },
  { hour: "19:00", pm25: 80 },
  { hour: "20:00", pm25: 85 },
  { hour: "21:00", pm25: 90 },
  { hour: "22:00", pm25: 95 },
  { hour: "23:00", pm25: 100 },
];

const chartConfig = {
  pm25: {
    label: "PM2.5",
    color: "#2563eb",
  },
} satisfies ChartConfig;

export function Chart() {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <BarChart accessibilityLayer data={chartData}>
        <Bar dataKey="pm25" fill="var(--color-desktop)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
