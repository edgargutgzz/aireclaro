"use client";

import { useId, useState, type ReactNode } from "react";
import type { InfoTab } from "@/components/datos/info-tabs";
import HorizontalScrollFade from "@/components/datos/horizontal-scroll-fade";

// Shared outer shell for every /datos chart -- same duplication risk as
// info-tabs.tsx and year-toggle.tsx (see those files): this exact card
// shell (border, header row, title/subtitle block) was typed out
// identically in both dias-insalubres-chart.tsx and
// cobertura-estaciones-chart.tsx. One shell, so a border, radius, or
// spacing tweak lands on every /datos chart at once instead of needing to
// be repeated (or forgotten) per file.
export default function ChartCard({
  title,
  subtitle,
  headerRight,
  infoTab,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  headerRight?: ReactNode;
  /** The chart's own "learn more" (its methodology): a pill at the end of
   *  the header controls that opens its text right under the header. The
   *  tabs every chart shares live once in the page's top bar instead. */
  infoTab?: InfoTab;
  children: ReactNode;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const panelId = useId();
  const InfoIcon = infoTab?.icon;

  return (
    // Opaque, not glass -- per the style guide, translucency is reserved for
    // floating chrome over the map; a chart card is a reading surface, like
    // a dialog, and stays opaque white on a gray-200 hairline.
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 pb-3 pt-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        {/* min-w-0: a flex item's default min-width is auto, not 0 -- without
            this, a child with wide unwrapped content (a long title, or the
            year-over-year comparison line) can force this whole item wider
            than the row instead of wrapping, dragging the entire card into
            horizontal overflow. Classic flexbox gotcha, not specific to any
            one caller. */}
        <div className="min-w-0">
          <h3 className="text-lg font-medium text-gray-700">{title}</h3>
          {/* div, not p: a caller's subtitle can carry its own block-level
              row (e.g. a year-over-year comparison line), which can't
              legally nest inside a p. */}
          {subtitle && <div className="mt-1 text-xs text-gray-500 md:text-sm">{subtitle}</div>}
        </div>
        {/* One line of controls that never wraps: below lg it sits under
            the title and slides sideways when it doesn't fit (bleeding to
            the card's edges, with the charts' own edge fade); from lg it
            sits beside the title, which wraps instead. */}
        {(headerRight || infoTab) && (
          <div className="-mx-5 lg:mx-0 lg:shrink-0">
            <HorizontalScrollFade minWidth={0}>
              <div className="flex w-max items-center gap-2 px-5 lg:px-0">
                {headerRight}
                {infoTab && InfoIcon && (
                  // Icon + label, the same tinted h-8 button as the header's
                  // Comparar / Descargar, dark while open (like Comparar).
                  <button
                    type="button"
                    onClick={() => setInfoOpen((o) => !o)}
                    aria-expanded={infoOpen}
                    aria-controls={panelId}
                    className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 ${
                      infoOpen
                        ? "bg-gray-800 text-white hover:bg-gray-700"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200/70 hover:text-gray-700"
                    }`}
                  >
                    <InfoIcon className="h-3.5 w-3.5" aria-hidden />
                    {infoTab.label}
                  </button>
                )}
              </div>
            </HorizontalScrollFade>
          </div>
        )}
      </div>
      {infoTab && infoOpen && (
        // The same panel box the old bottom-row tabs opened.
        <div className="px-5 pt-4">
          <div id={panelId} className="rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4">
            <div className="text-sm leading-relaxed text-gray-600">{infoTab.body}</div>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
