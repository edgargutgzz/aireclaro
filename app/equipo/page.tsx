import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import PageShell from "@/components/observatorio/page-shell";
import { EquipoGrid } from "@/components/observatorio/equipo-grid";

// Ported from observatoriodelaire.com/equipo: same people, photos and card
// grid. Fixed on the way over: two typos in the puestos ("Extema",
// "Cardiopulmunar"), and the cards no longer lift on hover, since they aren't
// links and the lift read as clickable.

const LEAD =
  "Conoce al equipo detrás del Observatorio del Aire, comprometido con un aire más limpio.";

export const metadata: Metadata = pageMetadata({
  title: "Equipo",
  description: LEAD,
  path: "/equipo",
});


export default function Equipo() {
  return (
    <PageShell title="Equipo" lead={LEAD}>
      <EquipoGrid />
    </PageShell>
  );
}
