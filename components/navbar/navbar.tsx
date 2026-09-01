"use client";

import Navlinks from "@/components/navbar/navlinks";
import SiteHeader from "@/components/navbar/site-header";
import Logo from "@/components/navbar/logo";
import { HeaderFreshness } from "@/components/data/freshness";

export default function Navbar() {
  return (
    <>
      {/* Mobile top bar — logo on the left, the map's data-freshness time on the
          trailing edge (nothing there on other routes); nav links stay in the
          bottom bar. In normal document flow. */}
      <header className="flex h-header flex-shrink-0 items-center justify-between gap-3 bg-stone-50 px-4 md:hidden">
        <Logo size="sm" />
        <HeaderFreshness />
      </header>

      {/* Mobile navbar at bottom */}
      <nav
        aria-label="Principal"
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/60 bg-white/80 backdrop-blur-md shadow-sm md:hidden"
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
