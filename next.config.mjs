/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000, // 1 year for static assets
    remotePatterns: [
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
  // /editoriales and /recursos merged into /publicaciones (2026-10-08). The
  // slug pattern skips anything with a dot, so the covers in public/editoriales
  // and the documents' PDFs in public/recursos are left alone.
  async redirects() {
    return [
      { source: "/editoriales", destination: "/publicaciones?tipo=columna", permanent: true },
      { source: "/editoriales/:slug([^./]+)", destination: "/publicaciones/:slug", permanent: true },
      { source: "/recursos", destination: "/publicaciones", permanent: true },
      // The columns' newspaper-clipping PDFs, removed 2026-10-08 once each
      // column's page carried its full text: old links land on that page.
      { source: "/editoriales/01nov2024.pdf", destination: "/publicaciones/colaborar-para-prosperar", permanent: true },
      { source: "/editoriales/03mar2024.pdf", destination: "/publicaciones/nuevo-leon-y-el-viejo-fantasma", permanent: true },
      { source: "/editoriales/03nov2024.pdf", destination: "/publicaciones/dias-sobre-la-norma-una-verdad-incomoda", permanent: true },
      { source: "/editoriales/04jun2024.pdf", destination: "/publicaciones/el-aire-limpio-nos-dejaria-vivir-mas", permanent: true },
      { source: "/editoriales/09ago2024.pdf", destination: "/publicaciones/corredores-verdes", permanent: true },
      { source: "/editoriales/09jun2023.pdf", destination: "/publicaciones/refinar-o-respirar", permanent: true },
      { source: "/editoriales/10oct2024.pdf", destination: "/publicaciones/octubre-de-cambios-y-marrones", permanent: true },
      { source: "/editoriales/12ene2025.pdf", destination: "/publicaciones/un-2025-para-movilizarnos", permanent: true },
      { source: "/editoriales/12mar2024.pdf", destination: "/publicaciones/ozono-mejor-arriba-que-abajo", permanent: true },
      { source: "/editoriales/15dic2024.pdf", destination: "/publicaciones/impuestos-verdes-y-buen-gobierno", permanent: true },
      { source: "/editoriales/15ene2024.pdf", destination: "/publicaciones/una-agencia-del-aire", permanent: true },
      { source: "/editoriales/15mar2024.pdf", destination: "/publicaciones/vacios-y-tolerancia", permanent: true },
      { source: "/editoriales/16feb2025.pdf", destination: "/publicaciones/nl-no-puede-respirar", permanent: true },
      { source: "/editoriales/16may2024.pdf", destination: "/publicaciones/aire-limpio-corazon-contento", permanent: true },
      { source: "/editoriales/19ene2025.pdf", destination: "/publicaciones/por-debajo-de-la-alfombra", permanent: true },
      { source: "/editoriales/22jul2024.pdf", destination: "/publicaciones/combustibles-fosiles", permanent: true },
      { source: "/editoriales/22nov2024.pdf", destination: "/publicaciones/dias-limpios-ciudades-humanas", permanent: true },
      { source: "/editoriales/25feb2023.pdf", destination: "/publicaciones/tengo-un-sueno-para-monterrey", permanent: true },
      { source: "/editoriales/25jun2024.pdf", destination: "/publicaciones/todo-lo-que-sube-tiene-que-bajar", permanent: true },
      { source: "/editoriales/26ene2024.pdf", destination: "/publicaciones/gracias-refineria", permanent: true },
      { source: "/editoriales/27oct2023.pdf", destination: "/publicaciones/lo-que-se-respira-no-se-juzga", permanent: true },
      { source: "/editoriales/29dic2019.pdf", destination: "/publicaciones/pirotecnia", permanent: true },
      { source: "/editoriales/29sep2024.pdf", destination: "/publicaciones/el-espejismo-de-la-abundancia", permanent: true },
      { source: "/editoriales/30ago2024.pdf", destination: "/publicaciones/zonas-de-bajas-emisiones", permanent: true },
    ];
  },
};

export default nextConfig;
