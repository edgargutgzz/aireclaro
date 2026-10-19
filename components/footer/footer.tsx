import Link from "next/link";
import { Mail, MapPin } from "lucide-react";
import { SiFacebook, SiInstagram, SiTiktok, SiX, SiYoutube } from "react-icons/si";

// One icon set (Simple Icons, the brands' own marks) at one size, so the
// five match in weight.
export const SOCIAL_LINKS = [
  { href: "https://www.instagram.com/observatoriomty/", label: "Instagram", Icon: SiInstagram },
  { href: "https://www.facebook.com/observatoriomty", label: "Facebook", Icon: SiFacebook },
  { href: "https://x.com/observatoriomty", label: "X", Icon: SiX },
  { href: "https://www.youtube.com/@observatoriomty", label: "YouTube", Icon: SiYoutube },
  { href: "https://www.tiktok.com/@observatoriomty", label: "TikTok", Icon: SiTiktok },
];

// Like every footer link: neutral-600 at rest (quieter than the navbar's
// neutral-800), darker on hover (lighter would drop under 4.5:1 on the
// footer), no box; the 36px target stays for touch. The first icon's glyph lines up with the "Síguenos" label.
const socialLinkClass =
  "flex h-9 w-9 items-center justify-center rounded-xl text-neutral-600 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15";

// The footer's site map, between the contact and the socials: the navbar's
// sections under two headers.
const COLUMNAS = [
  {
    titulo: "Explora",
    links: [
      { href: "/mapa", label: "Mapa" },
      { href: "/datos", label: "Datos" },
      { href: "/publicaciones", label: "Publicaciones" },
    ],
  },
  {
    titulo: "Observatorio",
    links: [
      { href: "/proyectos", label: "Proyectos" },
      { href: "/quienes-somos", label: "Quiénes somos" },
    ],
  },
];

const EYEBROW = "mb-3 text-xs font-medium uppercase leading-none tracking-wide text-neutral-600";

export default function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-stone-50">
      <div className="mx-auto max-w-7xl px-6 pt-12 pb-8 lg:px-8">
      {/* lg+: one row, the two link columns first (the site's sections:
          this is a data platform), then the ways to reach us (contact,
          socials), each as wide as its content and spread with equal gaps
          (the last ends at the right edge, over the credit). Below: the same
          order stacked, the link columns two across. */}
      <div className="grid gap-10 lg:flex lg:justify-between lg:gap-8">
        <nav aria-label="Secciones del sitio" className="grid grid-cols-2 gap-8 lg:contents">
          {COLUMNAS.map(({ titulo, links }) => (
            <div key={titulo}>
              <h2 className={EYEBROW}>{titulo}</h2>
              <ul className="flex flex-col gap-2">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="rounded-xl text-sm text-neutral-600 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Contact: email first (what most visitors need), the address as
            an envelope reads, Mexican format. <address> marks it as the
            site's contact info for screen readers and search engines. */}
        <address className="not-italic">
          <p className={EYEBROW}>Contacto</p>
          <a
            href="mailto:contacto@observatoriodelaire.com"
            className="flex items-center gap-2 rounded-xl text-sm text-neutral-600 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
          >
            <Mail className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
            contacto@observatoriodelaire.com
          </a>
          <a
            href="https://maps.app.goo.gl/uYj6u7VH1BzvbFJfA"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-start gap-2 rounded-xl text-sm leading-relaxed text-neutral-600 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
          >
            <MapPin className="mt-1 h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
            <span>
              Blvd. Antonio L. Rodríguez 2100
              <br />
              Col. Rincón de Santa María, C.P. 64650
              <br />
              Monterrey, N.L.
              <span className="sr-only"> (abre en una nueva pestaña)</span>
            </span>
          </a>
        </address>

        <div>
          <p className={EYEBROW}>Síguenos</p>
          <ul className="-ml-2.5 -mt-1.5 flex items-center gap-1">
            {SOCIAL_LINKS.map(({ href, label, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${label} (abre en una nueva pestaña)`}
                  className={socialLinkClass}
                >
                  <Icon size={16} aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </div>

      </div>

      <div className="mt-10 flex flex-col gap-6 lg:mt-14 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-neutral-600">
          &copy; {new Date().getFullYear()} Observatorio Ciudadano de la Calidad del Aire del Área Metropolitana de Monterrey
        </p>
        <Link
          href="https://datacomun.com"
          target="_blank"
          rel="noopener noreferrer"
          className="self-start whitespace-nowrap rounded-xl text-xs text-neutral-600 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
        >
          {/* Quiet like the © line: the site speaks for the Observatory. */}
          Desarrollado por datacomun
          <span className="sr-only"> (abre en una nueva pestaña)</span>
        </Link>
      </div>
      </div>
    </footer>
  );
}
