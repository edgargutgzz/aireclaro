"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine } from "lucide-react";
import type { ShareFormat } from "@/lib/share-image-formats";

// The monthly summary card's image download: asks where the image is going
// first, then downloads the size that destination wants (see
// lib/share-image-formats.ts). Each option is a same-origin <a download>, so
// the browser saves the file directly, no client-side fetch/blob needed.
// Surface = the /datos tooltip card, rows = the style guide's list row.

interface Option {
  format: ShareFormat;
  label: string;
}

const GROUPS: { title: string | null; options: Option[] }[] = [
  { title: "WhatsApp", options: [{ format: "whatsapp", label: "Mensaje" }] },
  {
    title: "Instagram",
    options: [
      { format: "instagram-post", label: "Post" },
      { format: "instagram-story", label: "Story" },
    ],
  },
  { title: "Facebook", options: [{ format: "facebook-post", label: "Post" }] },
];

// w-60 / min-w-60 below.
const MENU_MIN_WIDTH = 240;

export default function DownloadImageMenu({
  href,
  filename,
}: {
  /** Builds the image URL for a format. */
  href: (format: ShareFormat) => string;
  /** Builds the saved file's name for a format. */
  filename: (format: ShareFormat) => string;
}) {
  const [open, setOpen] = useState(false);
  // Where the menu opens, in viewport px. Fixed, not absolute: the button
  // lives in the card header's sideways-scrolling control row, which would
  // clip an absolutely positioned menu.
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Outside tap / Escape closes. Not useDismissTooltip: that closes on any
  // pointerdown, including one on a menu option, which would unmount the
  // option before its click (the download) lands.
  useEffect(() => {
    if (!open) return;
    // Re-anchored on every scroll/resize (page or the control row), so the
    // fixed menu stays under its button instead of drifting. Not closed on
    // scroll: phones fire scroll/resize on their own (address bar).
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Right-aligned to the button where the menu (min 240px) fits to its
      // left; otherwise (a phone, button at the row's start) left-aligned.
      setPos(
        rect.right >= MENU_MIN_WIDTH + 8
          ? { top: rect.bottom + 8, right: window.innerWidth - rect.right }
          : { top: rect.bottom + 8, left: Math.max(8, rect.left) },
      );
    };
    place();
    window.addEventListener("scroll", place, { capture: true, passive: true });
    window.addEventListener("resize", place);
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", place, { capture: true });
      window.removeEventListener("resize", place);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      {/* Tinted icon + label button, the same as chart 1's Comparar and
          every card's Metodología (h-8). */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Descargar imagen"
        className="flex h-8 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-colors bg-stone-100 text-neutral-600 hover:bg-stone-200/70 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
      >
        <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden />
        Descargar
      </button>

      {open && pos && (
        <div
          role="menu"
          aria-label="Descargar imagen para compartir en:"
          style={pos}
          className="fixed z-20 w-60 rounded-xl sm:w-auto sm:min-w-60 border border-black/[0.08] bg-white/95 p-1.5 shadow-[0_6px_24px_rgba(0,0,0,0.1)] backdrop-blur-[6px]"
        >
          {/* Heading + option read as one phrase ("Descargar imagen para compartir en
              WhatsApp"), and the button itself carries the download icon,
              so what a click does is said before it happens. */}
          <p className="px-3 pb-1 pt-2 text-xs font-medium text-neutral-400 sm:whitespace-nowrap">Descargar imagen para compartir en:</p>
          {GROUPS.map((group, i) => (
            <div key={group.options[0].format} className={i > 0 ? "mt-1 border-t border-stone-100 pt-1" : ""}>
              {group.title && (
                <p className="px-3 pb-0.5 pt-2 text-sm font-medium text-neutral-700">{group.title}</p>
              )}
              {group.options.map((o) => (
                <a
                  key={o.format}
                  role="menuitem"
                  href={href(o.format)}
                  download={filename(o.format)}
                  onClick={() => setOpen(false)}
                  className={`flex items-center rounded-xl py-2 pr-3 transition-colors hover:bg-stone-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-900/15 ${
                    group.title ? "pl-6" : "pl-3"
                  }`}
                >
                  <span className={`text-sm ${group.title ? "text-neutral-600" : "font-medium text-neutral-700"}`}>
                    {o.label}
                  </span>
                </a>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
