import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Observatorio del Aire",
    short_name: "Observatorio del Aire",
    description:
      "Calidad del aire en tiempo real en Monterrey y Zona Metropolitana",
    start_url: "/calidad-del-aire",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#fafaf9",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
