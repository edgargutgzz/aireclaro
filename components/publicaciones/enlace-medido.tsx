"use client";

import { track } from "@vercel/analytics";

// A link that leaves the site's pages (a document's PDF, the outlet hosting a
// column) and so is invisible to page-view analytics: it records a Vercel
// Analytics event on click instead, with the publication's slug so each one
// can be counted on its own. Opens in a new tab, said to screen readers.
//   pdf_abierto     {publicacion}  a document's PDF (library list or its page)
//   enlace_externo  {publicacion}  a column that lives on another site
export default function EnlaceMedido({
  href,
  evento,
  publicacion,
  aviso,
  className,
  children,
}: {
  href: string;
  evento: "pdf_abierto" | "enlace_externo";
  publicacion: string;
  /** What the screen reader hears after the link text. */
  aviso: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track(evento, { publicacion })}
      className={className}
    >
      {children}
      <span className="sr-only"> ({aviso})</span>
    </a>
  );
}
