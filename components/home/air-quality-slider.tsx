"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";

// Ported from observatoriodelaire.com's homepage hero (same component, same
// photos), with next/image in place of <img> so the photos ship resized.

const SIZES = "(min-width: 1280px) 600px, (min-width: 1024px) 50vw, 100vw";

// Movement needed before a touch gesture is judged horizontal (drag the
// slider) or vertical (scroll the page).
const INTENT_THRESHOLD = 8;

export default function AirQualitySlider() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPos, setSliderPos] = useState(50);
  // Taps animate to the new position; drags follow the pointer directly.
  const [smooth, setSmooth] = useState(false);
  const isDragging = useRef(false);
  const didDrag = useRef(false);
  // A touch that has landed but whose direction is not yet known.
  const pendingTouch = useRef<{ x: number; y: number; id: number } | null>(
    null,
  );

  const updatePosition = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percent);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Touch waits for a direction before claiming the gesture, so a
      // vertical swipe still scrolls the page.
      if (e.pointerType === "touch") {
        pendingTouch.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
        didDrag.current = false;
        return;
      }
      isDragging.current = true;
      didDrag.current = false;
      setSmooth(false);
      e.currentTarget.setPointerCapture(e.pointerId);
      updatePosition(e.clientX);
    },
    [updatePosition],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isDragging.current) {
        didDrag.current = true;
        updatePosition(e.clientX);
        return;
      }

      const start = pendingTouch.current;
      if (!start) return;

      const dx = Math.abs(e.clientX - start.x);
      const dy = Math.abs(e.clientY - start.y);
      // Too little movement to tell the two apart yet.
      if (dx < INTENT_THRESHOLD && dy < INTENT_THRESHOLD) return;

      if (dy > dx) {
        // Vertical intent: hand the gesture back to the browser.
        pendingTouch.current = null;
        return;
      }

      pendingTouch.current = null;
      isDragging.current = true;
      didDrag.current = true;
      setSmooth(false);
      e.currentTarget.setPointerCapture(start.id);
      updatePosition(e.clientX);
    },
    [updatePosition],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDragging.current = false;
    pendingTouch.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // A tap (no drag) moves the slider; the click that trails a drag is
      // ignored so it cannot re-trigger the animation.
      if (didDrag.current) {
        didDrag.current = false;
        return;
      }
      setSmooth(true);
      updatePosition(e.clientX);
    },
    [updatePosition],
  );

  const transition = smooth ? "duration-300 ease-out" : "duration-0";

  return (
    <div
      ref={containerRef}
      className="relative h-[400px] w-full cursor-ew-resize touch-pan-y select-none overflow-hidden rounded-3xl shadow-2xl md:h-[500px] lg:h-[550px]"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleClick}
    >
      {/* Dirty photo (bottom layer) */}
      <Image
        src="/home/banner-sucio.jpeg"
        alt="Monterrey con aire contaminado"
        fill
        preload
        sizes={SIZES}
        className="object-cover"
        draggable={false}
      />

      {/* Clean photo (top layer, clipped from left) */}
      <div
        className={`absolute inset-0 transition-[clip-path] ${transition}`}
        style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
      >
        <Image
          src="/home/banner.jpeg"
          alt="Monterrey con aire limpio"
          fill
          preload
          sizes={SIZES}
          className="object-cover"
          draggable={false}
        />
      </div>

      {/* Slider line */}
      <div
        className={`absolute bottom-0 top-0 z-10 transition-[left] ${transition}`}
        style={{ left: `${sliderPos}%` }}
      >
        <div className="h-full w-[2px] bg-white/80" />
        {/* Handle */}
        <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-white/90 shadow-lg backdrop-blur-sm">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="text-gray-600"
          >
            <path d="M2 8L6 4V12L2 8Z" fill="currentColor" />
            <path d="M14 8L10 12V4L14 8Z" fill="currentColor" />
          </svg>
        </div>
      </div>
    </div>
  );
}
