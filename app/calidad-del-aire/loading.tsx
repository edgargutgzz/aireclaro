import { BASEMAP_GROUND } from "@/components/mapa/ground";

export default function Loading() {
  return <div className="h-below-header w-full animate-pulse" style={{ backgroundColor: BASEMAP_GROUND }} />;
}
