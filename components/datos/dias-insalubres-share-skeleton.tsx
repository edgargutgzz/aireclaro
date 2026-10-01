import SkeletonBlock from "@/components/datos/skeleton-block";

// Mirrors DiasInsalubresShare's shell (title/subtitle header, month header,
// two pollutant rows, info-tabs row) so the page doesn't jump when it
// streams in.
export default function DiasInsalubresShareSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-2 border-b border-gray-100 px-5 pb-3 pt-4">
        <SkeletonBlock className="h-5 w-[28rem] max-w-full" />
        <SkeletonBlock className="h-4 w-96 max-w-full" />
      </div>
      <div className="px-5 pb-6 pt-5 md:pt-6">
        <SkeletonBlock className="mb-4 h-3 w-48 md:mb-6" />
        <SkeletonBlock className="mb-4 h-14 w-full md:mb-6 md:h-20" />
        <SkeletonBlock className="h-14 w-full md:h-20" />
      </div>
      <div className="flex flex-wrap gap-3 border-t border-gray-100 px-5 pb-5 pt-4">
        <SkeletonBlock className="h-7 w-32 rounded-xl" />
        <SkeletonBlock className="h-7 w-32 rounded-xl" />
      </div>
    </div>
  );
}
