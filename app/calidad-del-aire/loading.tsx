import { BASEMAP_GROUND } from "@/components/mapa/ground";

export default function Loading() {
  return <div className="h-screen w-full animate-pulse" style={{ backgroundColor: BASEMAP_GROUND }} />;
}
