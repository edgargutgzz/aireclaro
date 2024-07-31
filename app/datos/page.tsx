"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { track } from "@vercel/analytics";

export default function Datos() {
  return (
    <div className="mx-4 flex min-h-screen flex-col pb-20 pt-4 md:mx-16 md:pb-28 md:pt-8 lg:mx-36 lg:pb-8 lg:pt-6">
      {/* Datos */}
      <div className="mb-10 flex flex-col md:mb-16 lg:mb-20">
        {/* Header */}
        <h1 className="py-4 text-2xl font-bold md:text-3xl lg:py-6">
          Apertura de Información
        </h1>
        {/* Content */}
        <div className="flex flex-col space-y-4 pr-2 pt-3 text-justify text-sm md:pr-0 md:text-base">
          <p>
            Aire Claro es un proyecto sin fines de lucro que brinda información
            sobre la calidad del aire que respiramos.
          </p>
          <p>
            Adicionalmente, buscamos impulsar la transparencia, la investigación
            y la participación ciudadana en la toma de decisiones para reducir
            la contaminación del aire. Por ello, ponemos a tu dispoción de forma
            gratuita el historial de nuestros datos.
          </p>
        </div>
        {/*Card*/}
        <div className="flex gap-12 py-10">
          <Card className="w-full">
            <CardHeader className="gap-1 text-center">
              <CardTitle className="text-4xl">502,777</CardTitle>
              <CardDescription>mediciones</CardDescription>
            </CardHeader>
          </Card>
          <Card className="w-full">
            <CardHeader className="gap-1 text-center">
              <CardTitle className="text-4xl">119</CardTitle>
              <CardDescription>sensores</CardDescription>
            </CardHeader>
          </Card>
          <Card className="w-full">
            <CardHeader className="gap-1 text-center">
              <CardTitle className="text-4xl">17</CardTitle>
              <CardDescription>municipios</CardDescription>
            </CardHeader>
          </Card>
        </div>
        {/* Ir a Google Drive*/}
        <div className="flex justify-end py-10 pr-2 md:pr-0">
          <Link
            target="_blank"
            href="https://drive.google.com/drive/folders/14zDh5Eaa3twZmCJTQZDNkyDwEjoQajff"
          >
            <Button
              onClick={() => {
                track("Ir a Google Drive clicked");
              }}
            >
              <ArrowRight className="mr-2 h-4 w-4" /> Ir a Google Drive
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
