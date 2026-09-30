"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine } from "lucide-react";
import type { ShareFormat } from "@/lib/share-image-formats";

// The días insalubres chart's image download: asks where the image is going
// first, then downloads the size that destination wants (see
// lib/share-image-formats.ts). Each option is a same-origin <a download>, so
// the browser saves the file directly, no client-side fetch/blob needed.
// Surface = the /datos tooltip card, rows = the style guide's list row.

interface Option {
  format: ShareFormat;
  label: string;
}

const GROUPS: { title: string | null; options: Option[] }[] = [
  { title: null, options: [{ format: "whatsapp", label: "WhatsApp" }] },
  {
    title: "Instagram",
    options: [
      { format: "instagram-post", label: "Post" },
      { format: "instagram-story", label: "Story" },
    ],
  },
  { title: "Facebook", options: [{ format: "facebook-post", label: "Post" }] },
];

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
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Outside tap / Escape closes. Not useDismissTooltip: that closes on any
  // pointerdown, including one on a menu option, which would unmount the
  // option before its click (the download) lands.
  useEffect(() => {
    if (!open) return;
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
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      {/* Tinted icon button, sized like the selected year chip (h-8) inside
          the YearToggle beside it, so it doesn't float. */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Descargar imagen"
        title="Descargar imagen"
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200/70 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
      >
        <ArrowDownToLine className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Descargar imagen para"
          className="absolute right-0 top-full z-20 mt-2 w-60 rounded-xl border border-black/[0.08] bg-white/95 p-1.5 shadow-[0_6px_24px_rgba(0,0,0,0.1)] backdrop-blur-[6px]"
        >
          {/* Heading + option read as one phrase ("Descargar imagen para
              WhatsApp"), and the button itself carries the download icon,
              so what a click does is said before it happens. */}
          <p className="px-3 pb-1 pt-2 text-xs font-medium text-gray-400">Descargar imagen para</p>
          {GROUPS.map((group, i) => (
            <div key={group.options[0].format} className={i > 0 ? "mt-1 border-t border-gray-100 pt-1" : ""}>
              {group.title && (
                <p className="px-3 pb-0.5 pt-2 text-sm font-medium text-gray-700">{group.title}</p>
              )}
              {group.options.map((o) => (
                <a
                  key={o.format}
                  role="menuitem"
                  href={href(o.format)}
                  download={filename(o.format)}
                  onClick={() => setOpen(false)}
                  className={`flex items-center rounded-lg py-2 pr-3 transition-colors hover:bg-gray-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15 ${
                    group.title ? "pl-6" : "pl-3"
                  }`}
                >
                  <span className={`text-sm ${group.title ? "text-gray-600" : "font-medium text-gray-700"}`}>
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
