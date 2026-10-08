"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

// "Cómo citar" on a publication's page: the APA citation (built in
// app/publicaciones/data.ts) and a button that copies it.
export default function Cita({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section aria-labelledby="como-citar" className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="como-citar" className="text-sm font-semibold text-gray-800">
          Cómo citar
        </h2>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
        >
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
          <span aria-live="polite">{copied ? "Copiada" : "Copiar"}</span>
        </button>
      </div>
      <p className="mt-2 break-words text-sm leading-relaxed text-gray-600">{text}</p>
    </section>
  );
}
