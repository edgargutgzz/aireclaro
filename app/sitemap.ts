import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://aireclaro.com",
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: "https://aireclaro.com/recomendaciones",
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: "https://aireclaro.com/acerca",
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: "https://aireclaro.com/aviso-privacidad",
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
