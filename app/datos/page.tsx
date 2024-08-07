"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { SquareArrowOutUpRight } from "lucide-react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import * as React from "react";

const chartData: {
  date: string;
  desktop: number;
  mobile: number;
  humedad: number;
}[] = [];

const startDate = new Date("2024-02-02T00:00:00Z"); // Start from February 2, 2024
const endDate = new Date("2024-08-01T23:59:59Z"); // End at August 1, 2024
let currentDate = new Date(startDate);

while (currentDate <= endDate) {
  chartData.push({
    date: currentDate.toISOString().split("T")[0],
    desktop: Math.floor(Math.random() * 500) + 50, // Random data for desktop
    mobile: Math.floor(Math.random() * 500) + 50, // Random data for mobile
    humedad: Math.floor(Math.random() * 100) + 1, // Random data for humedad (1-100)
  });
  currentDate.setUTCDate(currentDate.getUTCDate() + 2); // Change step to every 2 days
}

const chartConfig = {
  visitors: {
    label: "Visitors",
  },
  desktop: {
    label: "Temper.",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "PM2.5",
    color: "hsl(var(--chart-2))",
  },
  humedad: {
    label: "Humedad",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

export default function Datos() {
  const [timeRange] = React.useState("90d");

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date);
    const now = new Date();
    let daysToSubtract = 90;
    if (timeRange === "30d") {
      daysToSubtract = 30;
    } else if (timeRange === "7d") {
      daysToSubtract = 7;
    }
    now.setDate(now.getDate() - daysToSubtract);
    const minDate = new Date("2024-02-02");
    const maxDate = new Date("2024-08-01");
    return date >= minDate && date <= maxDate;
  });

  return (
    <div className="mx-4 flex min-h-screen flex-col pb-20 pt-4 md:mx-16 md:pb-28 md:pt-8 lg:mx-36 lg:pb-8 lg:pt-6">
      {/* Datos */}
      <div className="flex flex-col">
        {/* Header */}
        <h1 className="pt-4 text-3xl font-bold md:pt-7">Calidad del Aire</h1>
        {/* Descripción */}
        <div className="flex flex-col pt-6 text-justify text-base">
          <p>
            Publicamos el historial de datos sobre la calidad del aire que
            respiramos para impulsar la toma de decisiones por parte de
            gobierno, universidades, sociedad civil y la ciudadanía en general.
          </p>
        </div>
        {/*Indicadores*/}
        <div className="flex flex-col gap-8 pt-12 text-center md:flex-row md:gap-12 md:pt-12">
          <Card className="w-full">
            <CardHeader className="gap-1">
              <CardTitle className="text-3xl md:text-4xl">550,000</CardTitle>
              <CardDescription>mediciones</CardDescription>
            </CardHeader>
          </Card>
          <Card className="w-full">
            <CardHeader className="gap-1">
              <CardTitle className="text-3xl md:text-4xl">100</CardTitle>
              <CardDescription>sensores</CardDescription>
            </CardHeader>
          </Card>
          <Card className="w-full">
            <CardHeader className="gap-1">
              <CardTitle className="text-3xl md:text-4xl">19</CardTitle>
              <CardDescription>municipios</CardDescription>
            </CardHeader>
          </Card>
        </div>
        {/*Chart*/}
        {/* <Card>
          <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
            <div className="grid flex-1 gap-1 text-center sm:text-left">
              <CardTitle>Calidad del Aire</CardTitle>
              <CardDescription>
                Mediciones de los últimos 6 meses
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="chart-container px-2 pt-4 sm:px-6 sm:pt-6">
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[250px] w-full"
            >
              <AreaChart data={filteredData}>
                <defs>
                  <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-1))"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-1))"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-2))"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-2))"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient id="fillHumedad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-3))"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-3))"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("es-ES", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });
                  }}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => {
                        return new Date(value).toLocaleDateString("es-ES", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        });
                      }}
                      indicator="dot"
                    />
                  }
                />
                <Area
                  dataKey="mobile"
                  type="natural"
                  fill="url(#fillMobile)"
                  stroke="hsl(var(--chart-2))"
                  stackId="a"
                />
                <Area
                  dataKey="desktop"
                  type="natural"
                  fill="url(#fillDesktop)"
                  stroke="hsl(var(--chart-1))"
                  stackId="a"
                />
                <Area
                  dataKey="humedad"
                  type="natural"
                  fill="url(#fillHumedad)"
                  stroke="hsl(var(--chart-3))"
                  stackId="a"
                />
                <ChartLegend content={<ChartLegendContent />} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card> */}
        {/* Descargar Datos*/}
        <div className="flex justify-end pt-16 md:pt-16">
          <Link
            target="_blank"
            href="https://drive.google.com/drive/folders/14zDh5Eaa3twZmCJTQZDNkyDwEjoQajff"
          >
            <Button
              onClick={() => {
                track("Ir a Google Drive clicked");
              }}
            >
              Descargar datos <SquareArrowOutUpRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
