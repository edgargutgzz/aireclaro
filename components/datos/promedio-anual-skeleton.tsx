import SkeletonBlock from "@/components/datos/skeleton-block";

// Mirrors ChartCard's shell + PromedioAnualChart's layout (header, bar area,
// falta-de-información pills, info-tabs row) so the page doesn't jump around
// once the real data streams in behind this Suspense fallback.
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
        <SkeletonBlock className="mb-3 h-3 w-24" />
        {/* Matches BarsChart's fixed CHART_HEIGHT (380px, same at every
            breakpoint since the Recharts -> hand-rolled SVG rebuild) -- a
            taller/shorter skeleton than the real chart is exactly the
            layout-jump this component exists to prevent. */}
        <SkeletonBlock className="h-[380px] w-full rounded-lg" />
        <div className="mt-5 flex flex-wrap gap-2">
          <SkeletonBlock className="h-6 w-24 rounded-full" />
          <SkeletonBlock className="h-6 w-20 rounded-full" />
          <SkeletonBlock className="h-6 w-28 rounded-full" />
        </div>
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
