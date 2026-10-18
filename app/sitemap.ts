import type { MetadataRoute } from "next";
import { publicaciones } from "@/app/publicaciones/data";
import { SITE_URL as BASE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/mapa`, changeFrequency: "hourly", priority: 1 },
    { url: `${BASE}/datos`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/proyectos`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/adopta-sensor`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${BASE}/publicaciones`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/quienes-somos`, changeFrequency: "yearly", priority: 0.5 },
    ...publicaciones.map((p) => ({
      url: `${BASE}/publicaciones/${p.slug}`,
      lastModified: p.date,
      changeFrequency: "yearly" as const,
      priority: 0.4,
    })),
  ];
}
