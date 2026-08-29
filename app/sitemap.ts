import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://aireclaro.com",
      changeFrequency: "hourly",
      priority: 1,
    },
    // /recomendaciones was listed here with no route behind it, so the
    // sitemap was submitting a 404. /acerca and /datos are built but not
    // ready to show, and the nav does not offer them, so the sitemap should
    // not be advertising them either.
    {
      url: "https://aireclaro.com/aviso-privacidad",
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
