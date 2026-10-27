"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

// Copies the month's note with its source line, ready to paste into an
// article or a message. Same tinted h-8 button as the chart headers'.
export default function CopiarNota({ texto }: { texto: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (permissions, old browser); the text is on the page.
    }
  };

  const Icono = copied ? Check : Copy;
  return (
    <button
      type="button"
      onClick={copy}
      className="flex h-8 shrink-0 items-center self-start lg:self-auto gap-1.5 rounded-xl bg-stone-100 px-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-stone-200/70 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
    >
      <Icono className="h-3.5 w-3.5" aria-hidden />
      <span aria-live="polite">{copied ? "Texto copiado" : "Copiar texto"}</span>
    </button>
  );
}
