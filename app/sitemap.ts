import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://aireclaro.com",
      changeFrequency: "hourly",
      priority: 1,
    },
    // /recomendaciones was listed here with no route behind it, so the
    // sitemap was submitting a 404. /acerca is a live nav link with real
    // content, so it belongs here. /datos is a live nav link too but still a
    // placeholder, so it stays out until it has something to index.
    {
      url: "https://aireclaro.com/acerca",
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: "https://aireclaro.com/aviso-privacidad",
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
