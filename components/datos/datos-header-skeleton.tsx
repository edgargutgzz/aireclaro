import SkeletonBlock from "@/components/datos/skeleton-block";

// Mirrors DatosHeader's shell so the page doesn't jump once the real stamp
// streams in behind this Suspense fallback.
export default function DatosHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4">
      <SkeletonBlock className="h-9 w-9 flex-shrink-0 rounded-full" />
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="h-4 w-40" />
      </div>
    </div>
  );
}
