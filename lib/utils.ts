import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// The shadcn class-merge helper: clsx resolves conditionals, tailwind-merge
// then dedupes conflicting Tailwind classes so a caller's `className` can
// override a component's defaults.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
