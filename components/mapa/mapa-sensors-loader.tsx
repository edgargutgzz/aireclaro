"use client";

import dynamic from "next/dynamic";

const MapaSensors = dynamic(() => import("./mapa-sensors"), {
  ssr: false,
  loading: () => <div className="h-screen w-full animate-pulse bg-gray-200" />,
});

export default MapaSensors;
