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
  // slug pattern skips anything with a dot, so the PDFs and covers still
  // served from public/editoriales and public/recursos are left alone.
  async redirects() {
    return [
      { source: "/editoriales", destination: "/publicaciones?tipo=columna", permanent: true },
      { source: "/editoriales/:slug([^./]+)", destination: "/publicaciones/:slug", permanent: true },
      { source: "/recursos", destination: "/publicaciones", permanent: true },
    ];
  },
};

export default nextConfig;
