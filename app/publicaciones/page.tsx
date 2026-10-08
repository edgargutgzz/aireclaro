import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import PageShell from "@/components/observatorio/page-shell";
import Biblioteca from "@/components/publicaciones/biblioteca";

// Every publication in one library (./data.ts). Replaces /editoriales and
// /recursos, which redirect here (next.config.mjs).

const LEAD = "Columnas, informes y documentos del Observatorio sobre la calidad del aire en la ciudad.";

export const metadata: Metadata = pageMetadata({
  title: "Publicaciones",
  description: LEAD,
  path: "/publicaciones",
});

export default function Publicaciones() {
  return (
    <PageShell title="Publicaciones" lead={LEAD}>
      <Biblioteca />
    </PageShell>
  );
}
