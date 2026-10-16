import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import PageShell from "@/components/observatorio/page-shell";
import { QuienesSomosSections } from "@/components/observatorio/quienes-somos-sections";

// Ported from observatoriodelaire.com/quienes-somos: same copy, images and
// layout (components/observatorio/quienes-somos-sections.tsx).

const LEAD =
  "Somos una organización de la sociedad civil dedicada a generar esfuerzos colaborativos y fundamento técnico para mejorar la calidad del aire en Nuevo León.";

export const metadata: Metadata = pageMetadata({
  title: "Quiénes somos",
  description: LEAD,
  path: "/quienes-somos",
});

export default function QuienesSomos() {
  return (
    <PageShell title="Quiénes somos" lead={LEAD}>
      <QuienesSomosSections />
    </PageShell>
  );
}
