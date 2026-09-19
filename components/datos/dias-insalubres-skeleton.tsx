import { Skeleton } from "@/components/ui/skeleton";

// Mirrors ChartCard's shell + DiasInsalubresChart's layout (header,
// label/legend row, chart area, info-tabs row) so the page doesn't jump
// around once the real data streams in behind this Suspense fallback.
export default function DiasInsalubresSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 pb-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-72 max-w-full" />
          <Skeleton className="h-4 w-52 max-w-full" />
        </div>
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>

      <div className="px-5 pb-6 pt-6">
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        {/* Matches StackedBarsChart's fixed CHART_HEIGHT (380px, same at
            every breakpoint since the Recharts -> hand-rolled SVG rebuild) --
            a taller/shorter skeleton than the real chart is exactly the
            layout-jump this component exists to prevent. */}
        <Skeleton className="h-[380px] w-full rounded-lg" />
      </div>

      <div className="flex flex-wrap gap-3 border-t border-gray-100 px-5 pb-5 pt-4">
        <Skeleton className="h-7 w-32 rounded-xl" />
        <Skeleton className="h-7 w-32 rounded-xl" />
        <Skeleton className="h-7 w-28 rounded-xl" />
        <Skeleton className="h-7 w-36 rounded-xl" />
      </div>
    </div>
  );
}
