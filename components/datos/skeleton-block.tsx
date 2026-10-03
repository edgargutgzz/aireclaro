// A plain loading-placeholder block -- was shadcn's Skeleton primitive
// (Radix-free itself, just a styled div), replaced when shadcn was dropped
// project-wide. Same recipe, hand-written, no CLI dependency.
export default function SkeletonBlock({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`animate-pulse rounded-xl bg-gray-200 ${className}`} />
  );
}
