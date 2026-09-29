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
//
// PEEK_WIDTH (2026-09-28 feedback: "not the biggest fan" of the fade
// alone) reserves a fixed sliver of the viewport so a genuinely partial
// bar/column is always visible at rest when there IS more to scroll --
// without it, whether a partial mark happens to show at the natural edge
// is just whatever the real column width vs. viewport width coincidentally
// works out to (often barely-cropped, reading as "that's just how wide the
// last one is" rather than "there's more"). Only applied when scroll is
// actually needed (comparing minWidth against the WRAPPER's own natural
// width, measured before any narrowing) -- a chart with few enough
// categories to fit outright is untouched, never forced into an
// unnecessary scroll just to make room for a peek it doesn't need.
const PEEK_WIDTH = 40; // px

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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [needsScroll, setNeedsScroll] = useState(false);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft =
      centerOn !== undefined ? Math.max(0, centerOn - el.clientWidth / 2) : 0;
  }, [centerOn]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const el = scrollRef.current;
    if (!wrapper || !el) return;
    const update = () => {
      // wrapper's own clientWidth is never narrowed by PEEK_WIDTH (that
      // style only ever lands on the scroll element, a child of this one),
      // so it's always the true, natural available space to compare
      // minWidth against.
      setNeedsScroll(minWidth > wrapper.clientWidth);
      setCanScrollLeft(el.scrollLeft > 1);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(wrapper);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [minWidth]);

  return (
    <div ref={wrapperRef} className="relative">
      <div
        ref={scrollRef}
        className="overflow-x-auto"
        style={needsScroll ? { width: `calc(100% - ${PEEK_WIDTH}px)` } : undefined}
      >
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
