import { Skeleton } from "@/components/ui/skeleton";

export default function SkeletonGeneral() {
  return (
    <div className="flex flex-col space-y-4 pt-4">
      <Skeleton className="h-10 w-1/3" />
      <div className="flex flex-col space-y-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-1/2" />
      </div>
      <div className="pb-1 pt-2">
        <Skeleton className="h-5 w-full" />
      </div>
    </div>
  );
}
