import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import PageShell from "@/components/observatorio/page-shell";
import { QuienesSomosSections } from "@/components/observatorio/quienes-somos-sections";
import { EquipoGrid } from "@/components/observatorio/equipo-grid";

// Draft: Quiénes somos and Equipo on one page. Hidden while it's reviewed: no
// nav link, not in the sitemap, noindex. /quienes-somos and /equipo stay live.

const LEAD =
  "Somos una organización de la sociedad civil dedicada a generar esfuerzos colaborativos y fundamento técnico para mejorar la calidad del aire en Nuevo León.";

export const metadata: Metadata = {
  ...pageMetadata({ title: "Quiénes somos", description: LEAD, path: "/quienes-somos" }),
  robots: { index: false, follow: false },
};

export default function QuienesSomos2() {
  return (
    <PageShell title="Quiénes somos" lead={LEAD}>
      <QuienesSomosSections>
        <section className="flex flex-col gap-8 pt-10 md:pt-0">
          <h2 className="text-2xl font-semibold text-gray-800 md:text-3xl">Equipo</h2>
          <EquipoGrid heading="h3" />
        </section>
      </QuienesSomosSections>
    </PageShell>
  );
}
