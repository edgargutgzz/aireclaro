"use client";

import dynamic from "next/dynamic";
import type { Sensor, Data } from "@/components/inicio/air-quality"; // You'll need to export these types

const LazyAirQuality = dynamic(
  () => import("@/components/inicio/air-quality"),
  {
    ssr: false,
    loading: () => <div>Loading...</div>, // Optional loading state
  },
);

interface LazyAirQualityWrapperProps {
  sensors: Sensor[];
  data: Data[];
  showMenoresRecommendation?: boolean;
  showAdultosMayoresRecommendation?: boolean;
  showEmbarazadasRecommendation?: boolean;
  showEnfermedadesRecommendation?: boolean;
  showAddress?: boolean;
  showTime?: boolean;
}

export default function LazyAirQualityWrapper({
  sensors,
  data,
  showMenoresRecommendation,
  showAdultosMayoresRecommendation,
  showEmbarazadasRecommendation,
  showEnfermedadesRecommendation,
  showAddress,
  showTime,
}: LazyAirQualityWrapperProps) {
  return (
    <LazyAirQuality
      sensors={sensors}
      data={data}
      showMenoresRecommendation={showMenoresRecommendation}
      showAdultosMayoresRecommendation={showAdultosMayoresRecommendation}
      showEmbarazadasRecommendation={showEmbarazadasRecommendation}
      showEnfermedadesRecommendation={showEnfermedadesRecommendation}
      showAddress={showAddress}
      showTime={showTime}
    />
  );
}
