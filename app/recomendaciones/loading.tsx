import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-4 flex flex-col space-y-20 pb-32 pt-4 md:mx-16 md:pb-28 md:pt-32 lg:mx-52 lg:pb-20">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex flex-col space-y-4 rounded-lg bg-white px-4 py-5 shadow-lg">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}
