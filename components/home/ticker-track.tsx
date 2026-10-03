"use client";

import { useState } from "react";

// The ticker's moving part. The stations run twice back to back and the strip
// slides by half its width, so the loop is seamless. The whole strip is the
// pause control (moving content needs a way to stop it, WCAG 2.2.2): a tap or
// click (or Enter) pauses or resumes it; it also holds still under a mouse
// pointer, and never moves for visitors who ask for reduced motion. The moving copies
// are hidden from screen readers, which get the plain list instead.

export interface TickerItem {
  id: string;
  nombre: string;
  pm25: number;
  // The map marker's own fill for this reading.
  color: string;
}

function Items({ items }: { items: TickerItem[] }) {
  return (
    <span className="flex shrink-0 items-center">
      {items.map((item) => (
        <span key={item.id} className="flex items-center gap-1.5 whitespace-nowrap px-4 text-gray-600">
          <span
            className="h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
            style={{ backgroundColor: item.color }}
          />
          {item.nombre}
          <span className="font-mono font-semibold text-gray-900">{item.pm25}</span>
        </span>
      ))}
    </span>
  );
}

export default function TickerTrack({ items }: { items: TickerItem[] }) {
  const [paused, setPaused] = useState(false);
  return (
    <div className="relative flex min-w-0 flex-1 items-stretch">
      <ul className="sr-only">
        {items.map((item) => (
          <li key={item.id}>
            {item.nombre}: {item.pm25} µg/m³
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? "Reanudar la cinta" : "Pausar la cinta"}
        className="ticker-mask group min-w-0 flex-1 cursor-pointer overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15 motion-reduce:cursor-auto motion-reduce:overflow-x-auto"
      >
        <span className="ticker-run flex h-full w-max items-center" data-paused={paused || undefined} aria-hidden>
          <Items items={items} />
          <Items items={items} />
        </span>
      </button>
    </div>
  );
}
