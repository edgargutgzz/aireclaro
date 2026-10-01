import { ArrowDownToLine } from "lucide-react";
import ChartCard from "@/components/datos/chart-card";
import { SHARE_FORMATS, type ShareFormat } from "@/lib/share-image-formats";

// A chart's downloadable images, shown as a card under the chart: every
// destination's image previewed side by side, each with its own download.
// Seeing the image before saving it beats picking a size from a menu blind.
// Generic over the image route (href/filename builders), so the other /datos
// charts can reuse it once they get their own image.

const OPTIONS: { format: ShareFormat; label: string }[] = [
  { format: "whatsapp", label: "WhatsApp" },
  { format: "instagram-post", label: "Instagram post" },
  { format: "instagram-story", label: "Instagram story" },
  { format: "facebook-post", label: "Facebook" },
];

export default function ShareImagesCard({
  title,
  subtitle,
  href,
  filename,
}: {
  title: string;
  subtitle?: string;
  /** Builds the image URL for a format. */
  href: (format: ShareFormat) => string;
  /** Builds the saved file's name for a format. */
  filename: (format: ShareFormat) => string;
}) {
  return (
    <ChartCard title={title} subtitle={subtitle}>
      {/* Every preview shares one height, so the row reads as one set and the
          formats' shapes are what differ. items-end: captions line up. */}
      <div className="grid grid-cols-2 items-end gap-x-4 gap-y-8 px-5 pb-6 pt-5 md:pt-6 lg:grid-cols-4">
        {OPTIONS.map(({ format, label }) => {
          const { width, height } = SHARE_FORMATS[format];
          return (
            <figure key={format} className="flex flex-col items-center gap-3">
              {/* The image is the preview and a download target itself. */}
              <a href={href(format)} download={filename(format)} className="block max-w-full">
                {/* eslint-disable-next-line @next/next/no-img-element -- a
                    generated PNG from our own route, downloaded as is */}
                <img
                  src={href(format)}
                  alt={`Imagen para ${label}`}
                  width={width}
                  height={height}
                  loading="lazy"
                  className="h-44 w-auto max-w-full rounded-lg border border-gray-200 object-contain sm:h-56 lg:h-64"
                />
              </a>
              <figcaption className="flex flex-col items-center gap-2">
                <span className="text-sm text-gray-600">{label}</span>
                <a
                  href={href(format)}
                  download={filename(format)}
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-gray-100 px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200/70 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
                >
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                  Descargar
                </a>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </ChartCard>
  );
}
