"use client";

import Navlinks from "@/components/navbar/navlinks";
import SiteHeader from "@/components/navbar/site-header";

export default function Navbar() {
  return (
    <>
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
