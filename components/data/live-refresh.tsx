"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Keeps a live page's readings current while it stays open: router.refresh()
// re-runs the page's server data fetch (cached for 2 minutes server side,
// components/data/cache.ts) and swaps the new readings in without a reload,
// so client state (map position, selected station) stays. It fires when the
// visitor comes back to the tab, and every few minutes while the tab is
// visible; a hidden tab doesn't fetch, the return catches it up. SIMA
// readings land once an hour (job every 5 minutes to :30) and PurpleAir's at :01, so 5 minutes
// is plenty.

const INTERVAL_MS = 5 * 60 * 1000;

export default function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    let last = Date.now();
    const refresh = () => {
      last = Date.now();
      router.refresh();
    };
    const tick = () => {
      if (document.visibilityState === "visible" && Date.now() - last >= INTERVAL_MS) refresh();
    };
    // On return, only if the last refresh is more than a minute old, so
    // flicking between tabs doesn't refetch every time.
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - last > 60_000) refresh();
    };
    const id = window.setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}
