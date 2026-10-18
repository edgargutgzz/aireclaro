"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

// "Compartir" on a featured item (the library's Destacado cards): on a
// phone, the system share sheet (WhatsApp and the rest); elsewhere, copies
// the link, the way "Cómo citar" copies its citation (./cita.tsx). The link
// is the item's share link (app/publicaciones/data.ts shareUrl): a
// document's /d/<slug> carries its card and opens the PDF. `soloIcono` is
// the borderless icon for the library's rows, where a labeled, bordered
// button on every row would crowd the list.
export default function Compartir({
  url,
  title,
  soloIcono = false,
  className = "",
}: {
  url: string;
  title: string;
  soloIcono?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title, url });
      } catch {
        // Closing the share sheet rejects; nothing to do.
      }
      return;
    }
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const Icono = copied ? Check : Share2;
  if (soloIcono) {
    // With no label of its own, the copy is confirmed by a hint chip (the
    // style guide's dark tooltip) beside the button.
    return (
      <button
        type="button"
        onClick={share}
        title={copied ? undefined : "Copiar enlace"}
        className={`flex h-8 w-8 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-200/70 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 ${className}`}
      >
        <Icono className="h-3.5 w-3.5" aria-hidden />
        {copied && (
          <span
            aria-hidden
            className="pointer-events-none absolute right-full top-1/2 mr-2 flex -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-gray-900 px-2.5 py-1 text-xs font-medium text-white"
          >
            <Check className="h-3 w-3" />
            Enlace copiado
          </span>
        )}
        <span className="sr-only" aria-live="polite">
          {copied ? "Enlace copiado" : `Compartir ${title}`}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={share}
      className={`flex h-8 items-center gap-1.5 rounded-xl border border-gray-200 bg-white/95 px-3 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 ${className}`}
    >
      <Icono className="h-3.5 w-3.5" aria-hidden />
      <span aria-live="polite">{copied ? "Enlace copiado" : "Compartir"}</span>
      <span className="sr-only">{title}</span>
    </button>
  );
}
