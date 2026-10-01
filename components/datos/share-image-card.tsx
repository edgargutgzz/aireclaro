"use client";

import { useState } from "react";
import { ArrowDownToLine } from "lucide-react";
import ChartCard from "@/components/datos/chart-card";
import InfoTabs, { type InfoTab } from "@/components/datos/info-tabs";
import SegmentedToggle from "@/components/datos/segmented-toggle";
import { SHARE_FORMATS, type ShareFormat } from "@/lib/share-image-formats";

// A chart's downloadable image, presented as one more /datos chart: same
// card shell, header controls on the right (destination + download), the
// image where the plot goes (same height as the charts'), info tabs below.
// Generic over the image route, so the other charts can reuse it.

const FORMAT_OPTIONS: { value: ShareFormat; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram-post", label: "Instagram" },
  { value: "instagram-story", label: "Story" },
  { value: "facebook-post", label: "Facebook" },
];

export default function ShareImageCard({
  title,
  subtitle,
  src,
  filenameBase,
  tabs,
}: {
  title: string;
  subtitle?: string;
  /** The image route with its own query, minus the format. */
  src: string;
  /** Saved as `${filenameBase}-${format}.png`. */
  filenameBase: string;
  tabs: InfoTab[];
}) {
  const [format, setFormat] = useState<ShareFormat>("whatsapp");
  const href = `${src}${src.includes("?") ? "&" : "?"}format=${format}`;
  const { width, height } = SHARE_FORMATS[format];

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      headerRight={
        <>
          <SegmentedToggle
            options={FORMAT_OPTIONS}
            value={format}
            onChange={setFormat}
            ariaLabel="Formato de la imagen"
          />
          <div className="hidden h-5 w-px bg-gray-200 sm:block" aria-hidden />
          {/* Same tinted icon button as the comparison toggle above. */}
          <a
            href={href}
            download={`${filenameBase}-${format}.png`}
            aria-label="Descargar imagen"
            title="Descargar imagen"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200/70 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
          </a>
        </>
      }
    >
      {/* Same padding and plot height as the charts (320 / 460). */}
      <div className="flex justify-center px-5 pb-6 pt-5 md:pt-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- a generated
            PNG from our own route, shown and downloaded as is */}
        <img
          key={format}
          src={href}
          alt="Imagen para compartir con el resumen del mes"
          width={width}
          height={height}
          className="h-[320px] w-auto max-w-full rounded-lg border border-gray-200 object-contain md:h-[460px]"
        />
      </div>

      <div className="border-t border-gray-100 px-5 pb-5 pt-4">
        <InfoTabs tabs={tabs} />
      </div>
    </ChartCard>
  );
}
