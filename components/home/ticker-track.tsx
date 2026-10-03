"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";

// The ticker's moving part. The list runs twice back to back and the strip
// slides by half its width, so the loop is seamless; the second copy is
// hidden from screen readers. It pauses on hover, on keyboard focus, and with
// the pause button (moving content needs a way to stop it, WCAG 2.2.2), and
// sits still, scrollable by hand, for visitors who ask for reduced motion.

export interface TickerItem {
  id: string;
  nombre: string;
  pm25: number;
  cambio: number | null;
  color: string;
}

function Cambio({ cambio }: { cambio: number | null }) {
  if (cambio === null) return null;
  if (cambio > 0) return <span className="font-mono text-xs text-amber-700">▲{cambio}</span>;
  if (cambio < 0) return <span className="font-mono text-xs text-emerald-700">▼{-cambio}</span>;
  return <span className="font-mono text-xs text-gray-400">=</span>;
}

function Items({ items, hidden }: { items: TickerItem[]; hidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-1.5 whitespace-nowrap px-4 text-gray-600">
          <span
            className="h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          {item.nombre}
          <span className="font-mono font-semibold text-gray-900">{item.pm25}</span>
          <span className="sr-only">µg/m³</span>
          <Cambio cambio={item.cambio} />
        </li>
      ))}
    </ul>
  );
}

export default function TickerTrack({ items }: { items: TickerItem[] }) {
  const [paused, setPaused] = useState(false);
  return (
    <div className="group relative flex min-w-0 flex-1 items-stretch">
      <div className="ticker-mask min-w-0 flex-1 overflow-hidden motion-reduce:overflow-x-auto">
        <div className="ticker-run flex h-full w-max items-center" data-paused={paused || undefined}>
          <Items items={items} />
          <Items items={items} hidden />
        </div>
      </div>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? "Reanudar la cinta" : "Pausar la cinta"}
        className="flex w-9 shrink-0 items-center justify-center border-l border-stone-200 text-gray-400 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15 motion-reduce:hidden"
      >
        {paused ? <Play className="h-3.5 w-3.5" aria-hidden /> : <Pause className="h-3.5 w-3.5" aria-hidden />}
      </button>
    </div>
  );
}
