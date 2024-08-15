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
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { SquareArrowOutUpRight } from "lucide-react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceLine,
  Label,
} from "recharts";
import * as React from "react";

// Line graph data
const pm25Data = [
  { fecha: "2024-07-01", pm25: 12 },
  { fecha: "2024-07-02", pm25: 14 },
  { fecha: "2024-07-03", pm25: 17 },
  { fecha: "2024-07-04", pm25: 24 },
  { fecha: "2024-07-05", pm25: 32 },
  { fecha: "2024-07-06", pm25: 22 },
  { fecha: "2024-07-07", pm25: 12 },
  { fecha: "2024-07-08", pm25: 13 },
  { fecha: "2024-07-09", pm25: 14 },
  { fecha: "2024-07-10", pm25: 15 },
  { fecha: "2024-07-11", pm25: 9 },
  { fecha: "2024-07-12", pm25: 12 },
  { fecha: "2024-07-13", pm25: 14 },
  { fecha: "2024-07-14", pm25: 17 },
  { fecha: "2024-07-15", pm25: 21 },
  { fecha: "2024-07-16", pm25: 26 },
  { fecha: "2024-07-17", pm25: 26 },
  { fecha: "2024-07-18", pm25: 29 },
  { fecha: "2024-07-19", pm25: 23 },
  { fecha: "2024-07-20", pm25: 19 },
  { fecha: "2024-07-21", pm25: 19 },
  { fecha: "2024-07-22", pm25: 16 },
  { fecha: "2024-07-23", pm25: 14 },
  { fecha: "2024-07-24", pm25: 12 },
  { fecha: "2024-07-25", pm25: 17 },
  { fecha: "2024-07-26", pm25: 24 },
  { fecha: "2024-07-27", pm25: 24 },
  { fecha: "2024-07-28", pm25: 20 },
  { fecha: "2024-07-29", pm25: 22 },
  { fecha: "2024-07-30", pm25: 18 },
  { fecha: "2024-07-31", pm25: 26 },
];

const chartData = pm25Data.map((item) => ({
  date: item.fecha,
  pm25: item.pm25,
}));

const chartConfig = {
  pm25: {
    label: "pm25",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function Datos() {
  return (
    <div className="mx-4 flex min-h-screen flex-col pb-20 pt-4 md:mx-16 md:pb-28 md:pt-8 lg:mx-36 lg:pb-20 lg:pt-6">
      {/* Datos */}
      <div className="flex flex-col">
        {/* Header */}
        <h1 className="pt-4 text-3xl font-bold md:pt-7">
          Datos de Calidad del Aire
        </h1>
        {/* Descripción y Descargar datos */}
        <div className="flex flex-col items-center pt-6 md:flex-row md:items-center">
          <p className="w-full text-justify md:w-2/3 md:pr-4">
            Descarga el historial de datos, desde julio 2023 a julio 2024, sobre
            la calidad del aire que respiramos en la Zona Metropolitana de
            Monterrey y Saltillo.
          </p>
          <div className="flex w-full justify-start pt-8 md:w-1/3 md:justify-end md:pt-0">
            <Link
              target="_blank"
              href="https://drive.google.com/drive/folders/14zDh5Eaa3twZmCJTQZDNkyDwEjoQajff"
            >
              <Button
                onClick={() => {
                  track("Ir a Google Drive clicked");
                }}
              >
                Descargar datos
                <SquareArrowOutUpRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/*Indicadores*/}
        <div className="flex flex-col gap-8 pt-12 text-center md:flex-row md:gap-12 md:pt-12">
          <Card className="w-full">
            <CardHeader className="gap-1">
              <CardTitle className="text-3xl md:text-3xl">600,000</CardTitle>
              <CardDescription>⏱️ mediciones</CardDescription>
            </CardHeader>
          </Card>
          <Card className="w-full">
            <CardHeader className="gap-1">
              <CardTitle className="text-3xl md:text-3xl">100</CardTitle>
              <CardDescription>📡 sensores</CardDescription>
            </CardHeader>
          </Card>
          <Card className="w-full">
            <CardHeader className="gap-1">
              <CardTitle className="text-3xl md:text-3xl">19</CardTitle>
              <CardDescription>📍 municipios</CardDescription>
            </CardHeader>
          </Card>
        </div>
        {/*Chart*/}
        <div className="pt-12">
          <Card>
            <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
              <div className="grid flex-1 gap-1 text-center sm:text-left">
                <CardTitle>Mediciones</CardTitle>
                <CardDescription>
                  Concentración de PM2.5 en Nuevo León
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="chart-container px-2 pt-4 sm:px-6 sm:pt-6">
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[300px] w-full"
              >
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="fillpm25" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-pm25)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-pm25)"
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
                  <YAxis tickLine={false} axisLine={false} />
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
                    dataKey="pm25"
                    type="natural"
                    fill="url(#fillpm25)"
                    stroke="var(--color-pm25)"
                    stackId="a"
                  />
                  <ReferenceLine
                    y={25}
                    stroke="hsl(12 76% 61%)"
                    style={{ stroke: "hsl(12 76% 61%)" }}
                    strokeDasharray="3 3"
                  >
                    <Label
                      value="Límite diario (Norma Mexicana de Salud)"
                      position="top"
                      fill="hsl(12 76% 61%)"
                      style={{ textAnchor: "middle" }}
                    />
                  </ReferenceLine>
                  <ReferenceLine
                    y={15}
                    stroke="hsl(221.2 83.2% 53.3%)"
                    style={{ stroke: "hsl(221.2 83.2% 53.3%)" }}
                    strokeDasharray="3 3"
                  >
                    <Label
                      value="Límite diario (Organización Mundial de Salud)"
                      position="top"
                      fill="hsl(221.2 83.2% 53.3%)"
                      style={{ textAnchor: "middle" }}
                    />
                  </ReferenceLine>
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
