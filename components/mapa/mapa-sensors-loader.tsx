"use client";

import dynamic from "next/dynamic";
import { BASEMAP_GROUND } from "./ground";

// The map component carries maplibre-gl, by far the page's largest download.
// next/dynamic would only request it once React renders this component, after
// the rest of the page's JS has loaded and hydrated; kicking off the same
// import when this module first evaluates starts that download earlier. The
// bundler dedupes the two into one request.
if (typeof window !== "undefined") void import("./mapa-sensors");

const MapaSensors = dynamic(() => import("./mapa-sensors"), {
  ssr: false,
  loading: () => <div className="h-screen w-full animate-pulse" style={{ backgroundColor: BASEMAP_GROUND }} />,
});

export default MapaSensors;
