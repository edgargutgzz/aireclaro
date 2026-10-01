import SkeletonBlock from "@/components/datos/skeleton-block";

// Mirrors ChartCard's shell + DiasInsalubresChart's layout (header,
// label/legend row, chart area) so the page doesn't jump
// around once the real data streams in behind this Suspense fallback.
export default function DiasInsalubresSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 pb-3 pt-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="flex flex-col gap-2">
          <SkeletonBlock className="h-5 w-72 max-w-full" />
          <SkeletonBlock className="h-4 w-52 max-w-full" />
        </div>
        <SkeletonBlock className="h-8 w-24 rounded-xl" />
      </div>

      <div className="px-5 pb-6 pt-5 md:pt-6">
        {/* mb-4 md:mb-6, matching the real legend row exactly -- was mb-3
            with no responsive step (predates that row's own 2026-09-22
            mobile-easing pass), a real, small, every-load layout shift right
            at this row once the real content swapped in (2026-09-28 audit). */}
        <div className="mb-4 flex items-center justify-between md:mb-6">
          <SkeletonBlock className="h-3 w-20" />
          <div className="flex items-center gap-4">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-3 w-20" />
          </div>
        </div>
        {/* Matches StackedBarsChart's CHART_HEIGHT_MOBILE/DESKTOP (320/460,
            2026-09-22 -- shorter on mobile so the chart doesn't need its own
            scroll on top of the header's) -- a taller/shorter skeleton than
            the real chart is exactly the layout-jump this exists to prevent. */}
        <SkeletonBlock className="h-[320px] w-full rounded-lg md:h-[460px]" />
      </div>
    </div>
  );
}
