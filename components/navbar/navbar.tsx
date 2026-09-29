"use client";

import { usePathname } from "next/navigation";
import Navlinks from "@/components/navbar/navlinks";
import ObservatorioNavbar from "@/components/navbar/observatorio-navbar";
import SiteHeader from "@/components/navbar/site-header";
import Logo from "@/components/navbar/logo";

export default function Navbar() {
  // Every page but the map wears the observatoriodelaire.com navbar. The map
  // keeps the app chrome below: its mobile panels are positioned against the
  // 56px bottom bar and the header height.
  const pathname = usePathname();
  if (pathname !== "/mapa") return <ObservatorioNavbar />;

  return (
    <>
      {/* Mobile top bar — logo only, in normal document flow; nav links stay in the bottom bar */}
      <header className="flex h-header flex-shrink-0 items-center border-b border-stone-200 bg-stone-50 px-4 md:hidden">
        <Logo size="sm" />
      </header>

      {/* Mobile navbar at bottom. `.glass` gives it a border on every side; the
          x/b edges are zeroed and the top edge takes the same stone hairline
          the two top bars use, so all three chrome edges read alike. */}
      <nav
        aria-label="Principal"
        className="glass fixed bottom-0 left-0 right-0 z-50 border-x-0 border-b-0 border-t-stone-200 md:hidden"
      >
        {/* flex-1 tabs (see Navlinks), so px-2 + pt-1.5/pb-1.5 around a py-3
            pill lands this bar at exactly 56px — the 3.5rem the map's
            bottom-pinned panels offset against. (Not --header-h: that is the
            separate top bar, 44px.) */}
        <ul className="flex w-full items-center px-2 pt-1.5 pb-1.5">
          <Navlinks />
        </ul>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>

      {/* Desktop navbar — full-width top bar, in normal document flow, shown on every page */}
      <SiteHeader />
    </>
  );
}
