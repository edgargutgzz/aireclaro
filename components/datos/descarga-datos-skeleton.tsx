import SkeletonBlock from "@/components/datos/skeleton-block";

// Mirrors ChartCard's shell + DescargaDatosCard's filter row, so the page
// doesn't jump once the station list streams in.
export default function DescargaDatosSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 pb-3 pt-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="flex flex-col gap-2">
          <SkeletonBlock className="h-5 w-64 max-w-full" />
          <SkeletonBlock className="h-4 w-96 max-w-full" />
        </div>
      </div>
      <div className="flex flex-col gap-5 px-5 py-5 lg:flex-row lg:items-end">
        {["w-32", "w-48", "w-64"].map((w) => (
          <div key={w} className="flex flex-col gap-1.5">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className={`h-10 max-w-full rounded-xl ${w}`} />
          </div>
        ))}
        <SkeletonBlock className="h-10 w-40 rounded-xl lg:ml-auto" />
      </div>
      <div className="flex flex-wrap gap-3 border-t border-gray-100 px-5 pb-5 pt-4">
        {["w-32", "w-32", "w-36", "w-36", "w-28"].map((w, i) => (
          <SkeletonBlock key={i} className={`h-7 rounded-xl ${w}`} />
        ))}
      </div>
    </div>
  );
}
