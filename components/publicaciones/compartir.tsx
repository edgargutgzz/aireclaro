"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

// "Compartir" on a publication's own page: on a
// phone, the system share sheet (WhatsApp and the rest); elsewhere, copies
// the link. The link
// is the item's share link (app/publicaciones/data.ts shareUrl): its page,
// whose link card names it.
export default function Compartir({ url, title, className = "" }: { url: string; title: string; className?: string }) {
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
  return (
    <button
      type="button"
      onClick={share}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-xl border border-stone-200 bg-white/95 px-3 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15",
        className,
      )}
    >
      <Icono className="h-3.5 w-3.5" aria-hidden />
      <span aria-live="polite">{copied ? "Enlace copiado" : "Compartir"}</span>
      <span className="sr-only">{title}</span>
    </button>
  );
}
