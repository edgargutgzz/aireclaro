"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";

// Ported from observatoriodelaire.com's homepage hero (same component, same
// photos), with next/image in place of <img> so the photos ship resized.

const SIZES = "(min-width: 1280px) 820px, (min-width: 1024px) 67vw, 100vw";

// The box is narrower than the 16:9 photos, so they're cropped near the left
// edge, where the Cerro de la Silla is: the clean photo a tenth in, the
// polluted one from the edge itself and enlarged 10% from there, which nudges
// its scene to the right (it has no more photo to its left to show).

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

  // Arrow keys step 5%, Page Up/Down 10%, Home/End jump to either photo.
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step: Record<string, (pos: number) => number> = {
      ArrowLeft: (pos) => pos - 5,
      ArrowDown: (pos) => pos - 5,
      ArrowRight: (pos) => pos + 5,
      ArrowUp: (pos) => pos + 5,
      PageDown: (pos) => pos - 10,
      PageUp: (pos) => pos + 10,
      Home: () => 0,
      End: () => 100,
    };
    const move = step[e.key];
    if (!move) return;
    e.preventDefault();
    setSmooth(true);
    setSliderPos((pos) => Math.max(0, Math.min(100, move(pos))));
  }, []);

  const transition = smooth ? "duration-300 ease-out" : "duration-0";
  const cleanPercent = Math.round(sliderPos);

  return (
    <div
      ref={containerRef}
      // A WAI-ARIA slider: focusable, keyboard-driven, and read out as how
      // much of each photo is showing.
      role="slider"
      tabIndex={0}
      aria-label="Comparación: aire limpio y aire contaminado"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={cleanPercent}
      aria-valuetext={`${cleanPercent}% aire limpio, ${100 - cleanPercent}% aire contaminado`}
      onKeyDown={handleKeyDown}
      className="group relative h-[260px] w-full cursor-ew-resize touch-pan-y select-none overflow-hidden focus-visible:outline-none md:h-[400px]"
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
        className="origin-left scale-110 object-cover object-left"
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
          className="object-cover object-[10%_50%]"
          draggable={false}
        />
      </div>

      {/* Slider line */}
      <div
        className={`absolute bottom-0 top-0 z-10 transition-[left] ${transition}`}
        style={{ left: `${sliderPos}%` }}
      >
        <div className="h-full w-[2px] bg-white/80" />
        {/* Handle. Keyboard focus shows here as a solid outline: the
            translucent house ring disappears over photos (same exception as
            the map's selected station). */}
        <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-white/90 shadow-lg backdrop-blur-sm group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-stone-900">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="text-neutral-600"
          >
            <path d="M2 8L6 4V12L2 8Z" fill="currentColor" />
            <path d="M14 8L10 12V4L14 8Z" fill="currentColor" />
          </svg>
        </div>
      </div>
    </div>
  );
}
