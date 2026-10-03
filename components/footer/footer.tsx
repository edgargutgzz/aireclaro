import Link from "next/link";
import { AiFillInstagram, AiFillTikTok } from "react-icons/ai";
import { FaFacebook, FaYoutube } from "react-icons/fa";
import { FaSquareXTwitter } from "react-icons/fa6";

export const SOCIAL_LINKS = [
  { href: "https://www.instagram.com/observatoriomty/", label: "Instagram", Icon: AiFillInstagram, size: 18 },
  { href: "https://www.facebook.com/observatoriomty", label: "Facebook", Icon: FaFacebook, size: 16 },
  { href: "https://x.com/observatoriomty", label: "X", Icon: FaSquareXTwitter, size: 16 },
  { href: "https://www.youtube.com/@observatoriomty", label: "YouTube", Icon: FaYoutube, size: 18 },
  { href: "https://www.tiktok.com/@observatoriomty", label: "TikTok", Icon: AiFillTikTok, size: 18 },
];

const socialLinkClass =
  "flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-xs transition-all hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15";

export default function Footer() {
  return (
    <footer className="bg-stone-100">
      <div className="mx-auto max-w-7xl px-6 pt-24 pb-8 md:py-8 lg:px-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <Link
            href="https://maps.app.goo.gl/uYj6u7VH1BzvbFJfA"
            target="_blank"
            className="text-sm text-gray-500 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
          >
            Blvd. Antonio L. Rodríguez 2100, Rincón de Santa María, 64650,
            Monterrey, N.L.
            <span className="sr-only"> (abre en una nueva pestaña)</span>
          </Link>
          <p className="text-sm text-gray-500">
            contacto@observatoriodelaire.com
          </p>
        </div>

        <div className="flex items-center gap-3">
          {SOCIAL_LINKS.map(({ href, label, Icon, size }) => (
            <Link
              key={label}
              href={href}
              target="_blank"
              aria-label={`${label} (abre en una nueva pestaña)`}
              className={socialLinkClass}
            >
              <Icon size={size} />
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-gray-200 pt-4 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Observatorio Ciudadano de la Calidad del Aire
        </p>
        <Link
          href="https://datacomun.com"
          target="_blank"
          className="self-start flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs text-gray-500 shadow-xs transition-all hover:border-gray-300 hover:shadow-sm whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
        >
          Diseño y desarrollo por
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
