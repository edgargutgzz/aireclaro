"use client";

import { useRef, useState } from "react";
import Link from "next/link";

// The ticker's moving part. The items run twice back to back and the strip
// slides by half its width, so the loop is seamless. Every item links to the
// map (an official station with that station selected).
//
// Moving content needs a way to stop it (WCAG 2.2.2):
// - mouse: it holds still while the pointer is over it, so a click lands;
// - touch: the first tap on the moving strip pauses it instead of following a
//   link; once paused, a tap on a station opens it, a tap between stations
//   resumes;
// - keyboard: it holds still while a station link has focus;
// - reduced motion: it never moves.
// The second copy is hidden from screen readers and skipped by Tab.

export interface TickerItem {
  id: string;
  href: string;
  nombre: string;
  // null: no live reading ("no disponible").
  pm25: number | null;
  // The map marker's own fill for this reading; null draws the map's gray.
  color: string | null;
}

function Items({
  items,
  copy,
  onStationClick,
}: {
  items: TickerItem[];
  copy?: boolean;
  onStationClick: (event: React.MouseEvent) => void;
}) {
  return (
    <ul className="flex shrink-0 items-center" aria-hidden={copy || undefined}>
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={item.href}
            tabIndex={copy ? -1 : undefined}
            onClick={onStationClick}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-1 text-neutral-600 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-900/15"
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-black/10 ${item.color ? "" : "bg-[#a6a09b]/50"}`}
              style={item.color ? { backgroundColor: item.color } : undefined}
              aria-hidden
            />
            {item.nombre}
            {item.pm25 === null ? (
              <span className="text-neutral-400">no disponible</span>
            ) : (
              <>
                <span className="font-mono font-semibold text-neutral-900">{item.pm25}</span>
                <span className="sr-only">µg/m³</span>
              </>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function TickerTrack({ items }: { items: TickerItem[] }) {
  const [paused, setPaused] = useState(false);
  const pointerType = useRef("mouse");

  const isTouch = () => pointerType.current === "touch";

  // On a link's own onClick, where next/link checks preventDefault before it
  // navigates: a touch tap on the moving strip only pauses it.
  const onStationClick = (event: React.MouseEvent) => {
    if (isTouch() && !paused) {
      event.preventDefault();
      setPaused(true);
    }
  };

  // A touch tap between stations toggles it.
  const onStripClick = (event: React.MouseEvent) => {
    if (isTouch() && !(event.target as Element).closest("a")) setPaused((p) => !p);
  };

  return (
    <div
      className="ticker-mask group min-w-0 flex-1 overflow-hidden motion-reduce:overflow-x-auto"
      onPointerDown={(e) => (pointerType.current = e.pointerType)}
      onClick={onStripClick}
    >
      <div className="ticker-run flex h-full w-max items-center" data-paused={paused || undefined}>
        <Items items={items} onStationClick={onStationClick} />
        <Items items={items} copy onStationClick={onStationClick} />
      </div>
    </div>
  );
}
