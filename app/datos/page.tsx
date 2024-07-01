"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDownToLine, Loader2 } from "lucide-react";

export default function Datos() {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true); // Set loading to true when the download starts
    try {
      const response = await fetch("/api/download-csv", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "calidad_aire.csv");
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error("Error downloading CSV:", error);
    } finally {
      setLoading(false); // Set loading to false when the download completes
    }
  };

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
        {/* Button */}
        <div className="flex justify-end py-10 pr-2 md:pr-0">
          <Button onClick={handleDownload} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Please wait
              </>
            ) : (
              <>
                <ArrowDownToLine className="mr-2 h-4 w-4" /> Descargar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
