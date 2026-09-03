import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://aireclaro.com",
      changeFrequency: "hourly",
      priority: 1,
    },
    // Only the map is indexed. /datos is a live nav link but still a
    // placeholder; /acerca and /aviso-privacidad were removed pending a
    // rebuild. Nothing else to advertise yet.
  ];
}
