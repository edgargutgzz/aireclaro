import Ticker from "@/components/home/ticker";

// The layout's `strip` slot (above the navbar) on the homepage only: the live
// ticker. Every other route renders nothing here (default.tsx for hard loads,
// [...rest] so a client-side navigation away clears it too).
export const revalidate = 300;

export default function HomeStrip() {
  return <Ticker />;
}
