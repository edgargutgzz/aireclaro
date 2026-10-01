import SkeletonBlock from "@/components/datos/skeleton-block";

// Mirrors ShareImageCard's shell (header, image area at the charts' plot
// height, info-tabs row) so the page doesn't jump when it streams in.
export default function ShareImageSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 pb-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <SkeletonBlock className="h-5 w-64 max-w-full" />
          <SkeletonBlock className="h-4 w-80 max-w-full" />
        </div>
        <SkeletonBlock className="h-10 w-80 max-w-full rounded-xl" />
      </div>
      <div className="flex justify-center px-5 pb-6 pt-5 md:pt-6">
        <SkeletonBlock className="aspect-square h-[320px] max-w-full rounded-lg md:h-[460px]" />
      </div>
      <div className="flex flex-wrap gap-3 border-t border-gray-100 px-5 pb-5 pt-4">
        <SkeletonBlock className="h-7 w-32 rounded-xl" />
        <SkeletonBlock className="h-7 w-32 rounded-xl" />
      </div>
    </div>
  );
}
