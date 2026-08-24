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

      {/* Desktop navbar — floating vertical rail, hidden on map page (which renders its own) */}
      {pathname !== "/" && (
        <div className="fixed left-6 top-6 z-50 hidden w-[210px] md:block">
          <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-md">
            <div className="flex flex-col items-stretch gap-1 p-2.5">
              <Navlinks />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
