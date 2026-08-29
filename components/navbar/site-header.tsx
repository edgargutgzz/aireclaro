import Link from "next/link";
import Image from "next/image";
import Navlinks from "@/components/navbar/navlinks";

// Same org as observatoriodelaire.com (shared logo), but the nav itself
// follows Aire Claro's own visual language — the same icon+label pill
// links used in the mobile bottom bar, not the reference site's plain
// text links. Desktop only - mobile keeps its own bottom nav bar.
export default function SiteHeader() {
  return (
    <header className="hidden h-header items-center bg-stone-50 md:flex">
      {/* Full bleed rather than a centred max-w container. Everything below
          this bar is laid out against the viewport, the Capas panel and the
          map's controls all sit at left-6, so a boxed header left the logo
          around 100px inside the app's own left edge on a wide screen. */}
      <div className="flex w-full items-center justify-between px-6">
        <Link
          href="/"
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
        >
          <Image
            src="/occamm-logo.png"
            alt="OCCAMM, Observatorio del Aire"
            width={150}
            height={28}
            priority
            className="h-[27.5px] w-[150px]"
          />
        </Link>
        <nav aria-label="Principal">
          <ul className="flex items-center gap-2">
            <Navlinks />
          </ul>
        </nav>
      </div>
    </header>
  );
}
