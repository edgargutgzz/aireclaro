import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SquareArrowOutUpRight,
  CircleGauge,
  Radio,
  MapPin,
} from "lucide-react";
import Link from "next/link";

export default function Datos() {
  return (
    <div className="container mx-auto max-w-6xl px-4 pb-8 pt-16 md:pb-16 md:pt-28">
      <div className="mb-16 flex flex-col items-start justify-between md:flex-row md:items-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900">
          Datos
        </h1>
        <Link
          target="_blank"
          href="https://datamx.io/dataset/calidad-del-aire-en-nuevo-leon"
          className="mt-4 md:mt-0"
        >
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-3 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="flex-shrink-0 rounded-full bg-gray-100 p-2 text-gray-600">
              <SquareArrowOutUpRight size={18} />
            </div>
            <span className="font-medium text-gray-900">Descargar datos</span>
          </div>
        </Link>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-12">
        <div className="relative rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <CircleGauge
            size={20}
            className="absolute right-4 top-4 text-gray-300"
          />
          <h3 className="mb-2 text-3xl font-semibold text-gray-900">
            1,250,000
          </h3>
          <p className="text-gray-600">mediciones</p>
        </div>
        <div className="relative rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <Radio size={20} className="absolute right-4 top-4 text-gray-300" />
          <h3 className="mb-2 text-3xl font-semibold text-gray-900">85</h3>
          <p className="text-gray-600">sensores</p>
        </div>
        <div className="relative rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <MapPin size={20} className="absolute right-4 top-4 text-gray-300" />
          <h3 className="mb-2 text-3xl font-semibold text-gray-900">19</h3>
          <p className="text-gray-600">municipios</p>
        </div>
      </div>
    </div>
  );
}
