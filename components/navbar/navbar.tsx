"use client";

import Navlinks from "@/components/navbar/navlinks";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile navbar at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/60 bg-white/80 backdrop-blur-md shadow-sm md:hidden">
        <div className="flex w-full items-center justify-around px-4 pt-3 pb-3">
          <Navlinks />
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>

      {/* Desktop navbar — floating pill card, hidden on map page (which renders its own).
          Sits top-right instead of top-left so it doesn't collide with page content
          that starts near the left edge (e.g. the Acerca page's logo/description). */}
      {pathname !== "/" && (
        <div className="fixed right-6 top-6 z-50 hidden md:block">
          <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-3 px-4 py-3">
              <Navlinks />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
