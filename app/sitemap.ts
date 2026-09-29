import type { MetadataRoute } from "next";
import { editoriales } from "@/app/editoriales/data";

const BASE = "https://aireclaro.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/mapa`, changeFrequency: "hourly", priority: 1 },
    { url: `${BASE}/datos`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/proyectos`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/infografias`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/editoriales`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/recursos`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/quienes-somos`, changeFrequency: "yearly", priority: 0.5 },
    // Article pages exist only for editorials with written content.
    ...editoriales
      .filter((editorial) => editorial.content)
      .map((editorial) => ({
        url: `${BASE}/editoriales/${editorial.slug}`,
        changeFrequency: "yearly" as const,
        priority: 0.4,
      })),
  ];
}
