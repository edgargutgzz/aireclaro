"use client";

import Link from "next/link";
import Image from "next/image";
import Navlinks from "@/components/navbar/navlinks";
import SiteHeader from "@/components/navbar/site-header";

export default function Navbar() {
  return (
    <>
      {/* Mobile top bar — logo only, in normal document flow; nav links stay in the bottom bar */}
      <header className="flex h-header flex-shrink-0 items-center bg-stone-50 px-4 md:hidden">
        <Link
          href="/"
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
        >
          <Image
            src="/occamm-logo.png"
            alt="OCCAMM, Observatorio del Aire"
            width={130}
            height={24}
            priority
            className="h-[24px] w-[130px]"
          />
        </Link>
      </header>

      {/* Mobile navbar at bottom */}
      <nav
        aria-label="Principal"
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/60 bg-white/80 backdrop-blur-md shadow-sm md:hidden"
      >
        <ul className="flex w-full items-center justify-around px-4 pt-3 pb-3">
          <Navlinks />
        </ul>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>

      {/* Desktop navbar — full-width top bar, in normal document flow, shown on every page */}
      <SiteHeader />
    </>
  );
}
