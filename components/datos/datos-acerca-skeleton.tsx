import SkeletonBlock from "@/components/datos/skeleton-block";

// Mirrors DatosAcerca's shell so the page doesn't jump once it streams in.
export default function DatosAcercaSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 pb-3 pt-4">
        <SkeletonBlock className="h-6 w-40" />
        <SkeletonBlock className="mt-2 h-4 w-72" />
      </div>
      <div className="flex flex-wrap gap-3 px-5 pb-5 pt-4">
        <SkeletonBlock className="h-7 w-32 rounded-xl" />
        <SkeletonBlock className="h-7 w-36 rounded-xl" />
        <SkeletonBlock className="h-7 w-36 rounded-xl" />
      </div>
    </div>
  );
}
