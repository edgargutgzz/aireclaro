import SkeletonBlock from "@/components/datos/skeleton-block";

// Mirrors ChartCard's shell + PromedioAnualChart's layout (header, legend
// row, bar area, info-tabs row) so the page doesn't jump around once the
// real data streams in behind this Suspense fallback.
export default function PromedioAnualSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 pb-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <SkeletonBlock className="h-5 w-96 max-w-full" />
          <SkeletonBlock className="h-4 w-64 max-w-full" />
        </div>
        <SkeletonBlock className="h-8 w-24 rounded-xl" />
      </div>

      <div className="px-5 pb-6 pt-5 md:pt-6">
        {/* Matches the real legend row's own shape (axis label left, two
            swatches right, mb-4 md:mb-6) -- this was still just a single
            bare block (the pre-legend placeholder) from before the chart
            got a real legend row (2026-09-28 audit: never updated when that
            row was added earlier the same day). */}
        <div className="mb-4 flex items-center justify-between md:mb-6">
          <SkeletonBlock className="h-3 w-20" />
          <div className="flex items-center gap-4">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-3 w-24" />
          </div>
        </div>
        {/* Matches BarsChart's CHART_HEIGHT_MOBILE/DESKTOP (320/460,
            2026-09-28 -- was a flat 380px at every breakpoint until this
            chart got the same responsive height días insalubres' own chart
            already had) -- a taller/shorter skeleton than the real chart is
            exactly the layout-jump this component exists to prevent. */}
        <SkeletonBlock className="h-[320px] w-full rounded-lg md:h-[460px]" />
        {/* No falta-de-información pill row placeholder -- that per-station
            pill list was removed entirely (2026-09-28 request), replaced by
            a plain count folded into the header subtitle above, which the
            header's own SkeletonBlock already covers. */}
      </div>

      <div className="flex flex-wrap gap-3 border-t border-gray-100 px-5 pb-5 pt-4">
        <SkeletonBlock className="h-7 w-32 rounded-xl" />
        <SkeletonBlock className="h-7 w-32 rounded-xl" />
        <SkeletonBlock className="h-7 w-28 rounded-xl" />
        <SkeletonBlock className="h-7 w-28 rounded-xl" />
        <SkeletonBlock className="h-7 w-36 rounded-xl" />
      </div>
    </div>
  );
}
