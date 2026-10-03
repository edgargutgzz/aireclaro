import AireAhora from "@/components/home/aire-ahora";

// The layout's `strip` slot (above the navbar) on the homepage only: the live
// air strip. Every other route renders nothing here (default.tsx for hard
// loads, [...rest] so a client-side navigation away clears it too).
export const revalidate = 300;

export default function HomeStrip() {
  return <AireAhora />;
}
