import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import MapaSensors from "@/components/mapa/mapa-sensors-loader";
import PurpleAirSensors from "@/components/data/purple-air-sensors";
import PurpleAirData from "@/components/data/purple-air-data";
import SimaSensors from "@/components/data/sima-sensors";
import SimaData from "@/components/data/sima-data";
import { fetchWithFallback } from "@/utils/fetch";
import { getSensorSnapshot } from "@/lib/sensor-snapshot";
import { getQualityInfo, roundPM25 } from "@/lib/air-quality";

const BASE_TITLE = "Mapa";
const BASE_DESCRIPTION =
  "Consulta en tiempo real la calidad del aire (PM2.5) de los sensores ciudadanos y las estaciones SIMA en la Zona Metropolitana de Monterrey.";

// A bare visit gets the map's own metadata. A shared ?sensor= link gets a
// title, description and unfurl card built from that station's latest reading,
// so it travels as "<estación>, calidad del aire mala, 48 μg/m³ PM2.5" instead of a generic
// preview. Reading searchParams makes this render dynamic; the four map
// datasets themselves are cached across requests (components/data/cache.ts),
// so a dynamic render is only the render, not four database round-trips.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ sensor?: string | string[] }>;
}): Promise<Metadata> {
  const base = pageMetadata({ title: BASE_TITLE, description: BASE_DESCRIPTION, path: "/mapa" });

  const raw = (await searchParams).sensor;
  const sensorParam = Array.isArray(raw) ? raw[0] : raw;
  if (!sensorParam || !/^\d+$/.test(sensorParam)) return base;

  const snapshot = await getSensorSnapshot(Number(sensorParam)).catch(() => null);
  if (!snapshot) return base;

  const quality = getQualityInfo(snapshot.pm25);
  const pm = snapshot.pm25 != null ? roundPM25(snapshot.pm25) : null;
  const where = snapshot.municipio ? `${snapshot.name}, ${snapshot.municipio}` : snapshot.name;

  const title =
    quality && pm
      ? `${snapshot.name}, calidad del aire ${quality.label.toLowerCase()}, ${pm} μg/m³ PM2.5`
      : `${snapshot.name}, calidad del aire`;
  const description =
    quality && pm
      ? `Calidad del aire ${quality.label.toLowerCase()}, ${pm} μg/m³ de PM2.5, en ${where}, en tiempo real.`
      : `Lectura de calidad del aire en tiempo real para ${where} en el Observatorio del Aire.`;

  const ogImage = `/api/og?sensor=${snapshot.sensorId}`;
  const pageUrl = `/mapa?sensor=${snapshot.sensorId}`;

  return {
    title,
    description,
    alternates: { canonical: "/mapa" },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: "website",
      locale: "es_MX",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function Mapa() {
  // Critical data - retry on failure (both PurpleAir AND SIMA)
  const [purpleAirSensors, purpleAirData, simaSensors, simaData] =
    await Promise.all([
      fetchWithFallback(PurpleAirSensors, []),
      fetchWithFallback(PurpleAirData, []),
      fetchWithFallback(SimaSensors, []),
      fetchWithFallback(SimaData, []),
    ]);

  // Tag sensors
  const taggedPurpleAirSensors = purpleAirSensors.map((sensor) => ({
    ...sensor,
    source: "purpleAir",
  }));

  const taggedSimaSensors = simaSensors.map((sensor) => ({
    ...sensor,
    source: "sima",
  }));

  const sensors = [...taggedPurpleAirSensors, ...taggedSimaSensors];
  const data = [...purpleAirData, ...simaData];

  return (
    <>
      <h1 className="sr-only">Mapa de calidad del aire en la Zona Metropolitana de Monterrey</h1>
      <MapaSensors sensors={sensors} data={data} />
    </>
  );
}
