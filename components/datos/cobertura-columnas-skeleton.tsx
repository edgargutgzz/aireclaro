import SkeletonBlock from "@/components/datos/skeleton-block";

// Mirrors CoberturaColumnasChart's shell: header, legend row, the
// 520/560px plot.
export default function CoberturaColumnasSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 pb-3 pt-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="flex flex-col gap-2">
          <SkeletonBlock className="h-5 w-64 max-w-full" />
          <SkeletonBlock className="h-4 w-56 max-w-full" />
        </div>
        <SkeletonBlock className="h-8 w-56 rounded-xl" />
      </div>
      <div className="px-5 pb-6 pt-5 md:pt-6">
        <div className="mb-4 flex items-center justify-end gap-4 md:mb-6">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-3 w-28" />
        </div>
        <SkeletonBlock className="h-[520px] w-full rounded-xl sm:h-[560px]" />
      </div>
    </div>
  );
}
