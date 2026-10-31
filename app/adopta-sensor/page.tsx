import type { Metadata } from "next";
import { pageMetadata, sectionCard } from "@/lib/metadata";
import FeatureCard from "@/components/observatorio/feature-card";
import LinkButton from "@/components/observatorio/link-button";
import PageShell from "@/components/observatorio/page-shell";

// Ported from observatoriodelaire.com/adopta-sensor: same copy, images and
// layout (image on the right at md+). The five steps are an ordered list of
// the shared FeatureCard; step 5 opens this app's own map.

const LEAD =
  "Únete a la iniciativa adoptando un sensor de forma gratuita y colabora en la medición de la calidad del aire en tu comunidad.";

export const metadata: Metadata = pageMetadata({
  title: "Adopta un sensor",
  description: LEAD,
  path: "/adopta-sensor",
  images: sectionCard("adopta-sensor", "Adopta un sensor, Observatorio del Aire"),
});

const PASOS = [
  {
    text: "Llena el formulario en línea (2 minutos).",
    link: "https://forms.gle/gzNU3aEbJ6tTqX8J6",
  },
  {
    text: "Espera nuestra confirmación por correo electrónico en donde te informaremos si tu ubicación cumple con los requisitos necesarios.",
  },
  {
    text: "En caso de ser aprobada, te contactaremos para agendar una visita de revisión del sitio.",
  },
  {
    text: "Si tu sitio es aprobado, agendaremos una visita final para instalar el sensor y firmar el acuerdo de adopción.",
  },
  {
    text: "Consulta los registros de tu sensor hora con hora en nuestro mapa de calidad del aire.",
    link: "/calidad-del-aire",
  },
];

export default function AdoptaSensor() {
  return (
    <PageShell title="Adopta un sensor" lead={LEAD}>
      <ol className="flex flex-col gap-28 md:gap-48">
        {PASOS.map((paso, i) => (
          <li key={i}>
            <FeatureCard
              title={`Paso ${i + 1}`}
              description={paso.text}
              image={`/adopta-sensor/paso${i + 1}.webp`}
              imageAlt={`Adopta un sensor - Paso ${i + 1}`}
              imageSide="right"
            >
              {paso.link && (
                <div className="flex justify-end pt-6 md:pt-12">
                  <LinkButton href={paso.link} label="Visitar" />
                </div>
              )}
            </FeatureCard>
          </li>
        ))}
      </ol>
    </PageShell>
  );
}
