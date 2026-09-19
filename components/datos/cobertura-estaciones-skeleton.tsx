import SkeletonBlock from "@/components/datos/skeleton-block";

// Mirrors CoberturaEstacionesChart's shell (header, legend, station-tile
// grid, info-tabs row). Only a handful of tiles are stubbed out -- the real
// grid has 15, but the skeleton just needs to read as "a grid is loading,"
// not reproduce every row.
function EstacionTileSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="h-5 w-20 rounded-full" />
      </div>
      <SkeletonBlock className="h-24 w-full rounded-lg" />
    </div>
  );
}

export default function CoberturaEstacionesSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 pb-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <SkeletonBlock className="h-5 w-80 max-w-full" />
          <SkeletonBlock className="h-4 w-56 max-w-full" />
        </div>
        <SkeletonBlock className="h-8 w-24 rounded-xl" />
      </div>

      <div className="px-5 pb-6 pt-6">
        <div className="mb-3 flex items-center justify-end gap-4">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-3 w-28" />
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <EstacionTileSkeleton key={i} />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-gray-100 px-5 pb-5 pt-4">
        <SkeletonBlock className="h-7 w-32 rounded-xl" />
        <SkeletonBlock className="h-7 w-28 rounded-xl" />
        <SkeletonBlock className="h-7 w-36 rounded-xl" />
      </div>
    </div>
  );
}
