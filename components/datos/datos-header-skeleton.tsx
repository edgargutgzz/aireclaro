import SkeletonBlock from "@/components/datos/skeleton-block";

// Mirrors DatosHeader's shell so the page doesn't jump once the real stamp
// streams in behind this Suspense fallback.
export default function DatosHeaderSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between md:gap-6">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-9 w-9 flex-shrink-0 rounded-full" />
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="h-4 w-40" />
          </div>
        </div>
        <SkeletonBlock className="h-10 w-40 rounded-xl" />
      </div>
      <div className="flex flex-wrap gap-3 border-t border-gray-100 px-5 pb-5 pt-4">
        <SkeletonBlock className="h-7 w-32 rounded-xl" />
        <SkeletonBlock className="h-7 w-36 rounded-xl" />
        <SkeletonBlock className="h-7 w-36 rounded-xl" />
      </div>
    </div>
  );
}
