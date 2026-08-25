import Link from "next/link";
import { AiFillInstagram, AiFillTikTok } from "react-icons/ai";
import { FaFacebook, FaYoutube } from "react-icons/fa";
import { FaSquareXTwitter } from "react-icons/fa6";

export default function Footer() {
  return (
    <footer className="bg-stone-100">
      <div className="mx-auto max-w-7xl px-6 pt-24 pb-8 md:py-8 lg:px-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <Link
            href="https://maps.app.goo.gl/uYj6u7VH1BzvbFJfA"
            target="_blank"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Blvd. Antonio L. Rodríguez 2100, Rincón de Santa María, 64650,
            Monterrey, N.L.
          </Link>
          <p className="text-sm text-gray-500">
            contacto@observatoriodelaire.com
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="https://www.instagram.com/observatoriomty/"
            target="_blank"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm backdrop-blur-md transition-all hover:bg-gray-50 hover:text-gray-900 hover:shadow-md"
          >
            <AiFillInstagram size={18} />
          </Link>
          <Link
            href="https://www.facebook.com/observatoriomty"
            target="_blank"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm backdrop-blur-md transition-all hover:bg-gray-50 hover:text-gray-900 hover:shadow-md"
          >
            <FaFacebook size={16} />
          </Link>
          <Link
            href="https://x.com/observatoriomty"
            target="_blank"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm backdrop-blur-md transition-all hover:bg-gray-50 hover:text-gray-900 hover:shadow-md"
          >
            <FaSquareXTwitter size={16} />
          </Link>
          <Link
            href="https://www.youtube.com/@observatoriomty"
            target="_blank"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm backdrop-blur-md transition-all hover:bg-gray-50 hover:text-gray-900 hover:shadow-md"
          >
            <FaYoutube size={18} />
          </Link>
          <Link
            href="https://www.tiktok.com/@observatoriomty"
            target="_blank"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm backdrop-blur-md transition-all hover:bg-gray-50 hover:text-gray-900 hover:shadow-md"
          >
            <AiFillTikTok size={18} />
          </Link>
        </div>
      </div>

      <div className="mt-6 border-t border-gray-200 pt-4 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Observatorio Ciudadano de la Calidad del Aire
        </p>
        <Link
          href="https://datacomun.com"
          target="_blank"
          className="self-start flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-500 shadow-sm transition-all hover:border-gray-300 hover:shadow-md whitespace-nowrap"
        >
          {"Desarrollado por "}<span className="font-medium" style={{ marginLeft: "-2px" }}><span style={{ color: "#0f172a" }}>data</span><span className="datacomun-comun">comun</span></span>
        </Link>
      </div>
      </div>
    </footer>
  );
}
