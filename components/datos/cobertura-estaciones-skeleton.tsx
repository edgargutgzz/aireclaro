import SkeletonBlock from "@/components/datos/skeleton-block";

// Mirrors CoberturaEstacionesChart's shell (header, legend, station-tile
// list, info-tabs row). 5 tiles, matching the real chart's own
// STATIONS_COLLAPSED_COUNT default (15 stations total, expandable) --
// not a coincidence, keeps the skeleton's height honest for the state
// most visitors actually land on.
//
// One column at every width (2026-09-27 feedback: this had drifted from
// the real chart's own lg:grid-cols-2 -> single-column change and was
// still showing two stations per row). The two skeleton blocks below are
// each responsive themselves, not just the grid -- the header block is
// *taller* on mobile (the two-line subtitle wraps under the station name
// there) while the calendar block is *shorter* (smaller cells), the
// opposite direction from most other /datos skeletons, so both need their
// own breakpoint value rather than one shared one. Heights measured
// directly against the real rendered card at 390px/1280px.
function EstacionTileSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <div className="mb-5 flex items-center justify-between">
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="h-[68px] w-40 md:h-9 md:w-56" />
      </div>
      <SkeletonBlock className="h-20 w-full rounded-lg md:h-[137px]" />
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
        <div className="grid grid-cols-1 gap-y-5">
          {Array.from({ length: 5 }, (_, i) => (
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
