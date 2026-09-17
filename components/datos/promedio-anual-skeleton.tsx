import { Skeleton } from "@/components/ui/skeleton";

// Mirrors ChartCard's shell + PromedioAnualChart's layout (header, bar area,
// falta-de-información pills, info-tabs row) so the page doesn't jump around
// once the real data streams in behind this Suspense fallback.
export default function PromedioAnualSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 pb-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-96 max-w-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>

      <div className="px-5 pb-6 pt-6">
        <Skeleton className="mb-3 h-3 w-24" />
        <Skeleton className="h-80 w-full rounded-lg md:h-[32rem]" />
        <div className="mt-5 flex flex-wrap gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
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
