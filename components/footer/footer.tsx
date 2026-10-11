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

// Quiet like the contact icons (gray, no box); the 36px target stays for
// touch. The first icon's glyph lines up with the "Síguenos" label.
const socialLinkClass =
  "flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-stone-200/70 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15";

// The footer's site map, between the contact and the socials. Publicaciones
// opens the library already filtered to each kind.
const COLUMNAS = [
  {
    titulo: "Explora",
    links: [
      { href: "/datos", label: "Datos" },
      { href: "/mapa", label: "Mapa" },
    ],
  },
  {
    titulo: "Publicaciones",
    links: [
      { href: "/publicaciones?tipo=columna", label: "Columnas" },
      { href: "/publicaciones?tipo=infografia", label: "Infografías" },
    ],
  },
  {
    titulo: "Nosotros",
    links: [
      { href: "/quienes-somos", label: "Quiénes somos" },
      { href: "/equipo", label: "Equipo" },
      { href: "/proyectos", label: "Proyectos" },
      { href: "/adopta-sensor", label: "Adopta un sensor" },
    ],
  },
];

const EYEBROW = "mb-3 text-xs font-medium uppercase leading-none tracking-wide text-gray-400";

export default function Footer() {
  return (
    <footer className="bg-stone-100">
      <div className="mx-auto max-w-7xl px-6 pt-12 pb-8 lg:px-8">
      {/* lg+: one row, the ways to reach us first (contact, socials), then
          the three link columns. Below: the same order stacked, the link
          columns two or three across. */}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_auto_repeat(3,minmax(0,1fr))] lg:gap-8">
        {/* Contact: email first (what most visitors need), the address as
            an envelope reads, Mexican format. <address> marks it as the
            site's contact info for screen readers and search engines. */}
        <address className="not-italic">
          <p className={EYEBROW}>Contacto</p>
          <a
            href="mailto:contacto@observatoriodelaire.com"
            className="flex items-center gap-2 rounded-xl text-sm text-gray-700 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
          >
            <Mail className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            contacto@observatoriodelaire.com
          </a>
          <a
            href="https://maps.app.goo.gl/uYj6u7VH1BzvbFJfA"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-start gap-2 rounded-xl text-sm leading-relaxed text-gray-500 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
          >
            <MapPin className="mt-1 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
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

        <nav aria-label="Secciones del sitio" className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:contents">
          {COLUMNAS.map(({ titulo, links }) => (
            <div key={titulo}>
              <h2 className={EYEBROW}>{titulo}</h2>
              <ul className="flex flex-col gap-2">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="rounded-xl text-sm text-gray-500 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

      </div>

      <div className="mt-10 border-t border-gray-200 pt-4 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Observatorio Ciudadano de la Calidad del Aire
        </p>
        <Link
          href="https://datacomun.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 self-start whitespace-nowrap rounded-xl text-xs text-gray-400 transition-colors hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
        >
          Desarrollado por
          <span className="font-medium">
            <span className="text-slate-900">data</span>
            <span className="datacomun-comun">comun</span>
          </span>
          <span className="sr-only"> (abre en una nueva pestaña)</span>
        </Link>
      </div>
      </div>
    </footer>
  );
}
