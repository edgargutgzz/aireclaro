"use client";

import Link from "next/link";
import Image from "next/image";
import Navlinks from "@/components/navbar/navlinks";
import SiteHeader from "@/components/navbar/site-header";

export default function Navbar() {
  return (
    <>
      {/* Mobile top bar — logo only, in normal document flow; nav links stay in the bottom bar */}
      <div className="flex h-14 flex-shrink-0 items-center bg-stone-50 px-4 md:hidden">
        <Link href="https://observatoriodelaire.com" target="_blank">
          <Image
            src="/occamm-logo.png"
            alt="OCCAMM Logo"
            width={150}
            height={28}
            className="h-[27.5px] w-[150px]"
          />
        </Link>
      </div>

      {/* Mobile navbar at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/60 bg-white/80 backdrop-blur-md shadow-sm md:hidden">
        <div className="flex w-full items-center justify-around px-4 pt-3 pb-3">
          <Navlinks />
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>

      {/* Desktop navbar — full-width top bar, in normal document flow, shown on every page */}
      <SiteHeader />
    </>
  );
}
