import type { ReactNode } from "react";

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
  children,
}: {
  title: string;
  subtitle: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    // Opaque, not glass -- per the style guide, translucency is reserved for
    // floating chrome over the map; a chart card is a reading surface, like
    // a dialog, and stays opaque white on a gray-200 hairline.
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 pb-2 pt-3 sm:flex-row sm:items-center sm:justify-between md:pb-3 md:pt-4">
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
          <div className="mt-1 text-xs text-gray-500 md:text-sm">{subtitle}</div>
        </div>
        {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
      </div>
      {children}
    </div>
  );
}
