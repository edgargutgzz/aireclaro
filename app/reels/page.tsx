import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";

// Temporary: the two social-media Reels, playable on the site without opening
// Instagram (shown live at the ecoFAV talk, 2026-10-29). A white full-screen
// layer over the navbar and footer, just the videos. Not in the navbar or the
// sitemap, and not indexed. Delete app/reels and public/reels when done.

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Reels",
    description: "Videos cortos con datos de las estaciones de calidad del aire, hechos para redes sociales.",
    path: "/reels",
  }),
  robots: { index: false, follow: false },
};

const REELS = [
  { file: "carrera-estaciones-2026-t3", label: "Reel: ¿qué estación registró la peor calidad del aire?, julio a septiembre de 2026" },
  { file: "cobertura-estaciones-2026", label: "Reel: ¿cómo han funcionado las estaciones de calidad del aire?, enero a septiembre de 2026" },
];

export default function Reels() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center gap-10 bg-white p-6">
      {REELS.map((reel) => (
        <video
          key={reel.file}
          src={`/reels/${reel.file}.mp4`}
          poster={`/reels/${reel.file}.webp`}
          aria-label={reel.label}
          controls
          playsInline
          preload="metadata"
          className="aspect-[9/16] h-full max-h-[92svh] max-w-[45vw] rounded-xl bg-stone-100 object-contain"
        />
      ))}
    </div>
  );
}
