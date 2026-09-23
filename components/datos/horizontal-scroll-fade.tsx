"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Shared by every /datos chart wide enough to need horizontal scroll (días
// insalubres' 12 months, promedio anual's up-to-15 stations): the row can
// hold more than fits without any visual sign there's more off to the side,
// so a viewer can miss whole stations/months sitting just past the edge.
// A fade at whichever edge still has content to scroll toward is the
// standard affordance for this (tables, card rails, …) -- cheaper than
// arrow buttons and reads as "there's more" without claiming how much.
// Fades in/out with the actual scroll position (ResizeObserver too, so
// resizing the window re-checks), not shown as a static decoration.
export default function HorizontalScrollFade({
  minWidth,
  centerOn,
  children,
}: {
  minWidth: number;
  // Content-local x (px) to bring to the horizontal center on mount, and
  // again whenever it changes (e.g. cobertura's year toggle moving "today"'s
  // column) -- undefined means "leave it at the start," the old default.
  // Doesn't fight manual scrolling: only runs when this value itself
  // changes, not on every render.
  centerOn?: number;
  children: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft =
      centerOn !== undefined ? Math.max(0, centerOn - el.clientWidth / 2) : 0;
  }, [centerOn]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      setCanScrollLeft(el.scrollLeft > 1);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [minWidth]);

  return (
    <div className="relative">
      <div ref={scrollRef} className="overflow-x-auto">
        <div style={{ minWidth }}>{children}</div>
      </div>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-linear-to-r from-white/80 to-transparent transition-opacity duration-200 ${
          canScrollLeft ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-white/80 to-transparent transition-opacity duration-200 ${
          canScrollRight ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
