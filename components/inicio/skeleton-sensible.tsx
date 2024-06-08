import { Skeleton } from "@/components/ui/skeleton";

export default function SkeletonSensible() {
  return (
    <div className="flex flex-col space-y-4 pt-4">
      <div className="pb-1 pt-2">
        <Skeleton className="h-5 w-full" />
      </div>
    </div>
  );
}
