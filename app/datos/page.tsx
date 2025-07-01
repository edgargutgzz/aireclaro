"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SquareArrowOutUpRight } from "lucide-react";
import Link from "next/link";
import { track } from "@vercel/analytics";

export default function Datos() {
  return (
    <div className="mx-4 flex min-h-screen flex-col pb-32 pt-4 md:mx-16 md:pb-28 md:pt-32 lg:mx-52 lg:pb-20">
      {/* Datos */}
      <div className="flex flex-col">
        {/* Header */}
        <h1 className="pt-4 text-3xl font-bold md:pt-7">Datos</h1>
        {/* Descripción y Descargar datos */}
        <div className="flex flex-col items-center pt-6 md:flex-row md:items-center">
          <p className="w-full text-justify md:w-2/3">
            Descarga el historial de datos de calidad del aire, desde julio 2023
            a febrero 2025, sobre la calidad del aire que respiramos en la Zona
            Metropolitana de Monterrey y Saltillo.
          </p>
          <div className="flex w-full justify-start pt-8 md:w-1/3 md:justify-end md:pt-0">
            <Link
              target="_blank"
              href="https://datamx.io/dataset/calidad-del-aire-en-nuevo-leon"
            >
              <Button
                onClick={() => {
                  track("Descargar datos");
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
              <CardTitle className="text-3xl md:text-3xl">1,250,000</CardTitle>
              <CardDescription>⏱️ mediciones</CardDescription>
            </CardHeader>
          </Card>
          <Card className="w-full">
            <CardHeader className="gap-1">
              <CardTitle className="text-3xl md:text-3xl">85</CardTitle>
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
      </div>
    </div>
  );
}
