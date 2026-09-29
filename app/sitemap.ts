import type { MetadataRoute } from "next";

const BASE = "https://aireclaro.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/mapa`, changeFrequency: "hourly", priority: 1 },
    { url: `${BASE}/datos`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/proyectos`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/infografias`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
