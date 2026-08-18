"use client";

import Image from "next/image";
import Link from "next/link";
import Navlinks from "@/components/navbar/navlinks";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile navbar at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/60 bg-white/80 backdrop-blur-md shadow-sm md:hidden">
        <div className="flex w-full items-center justify-around px-4 pt-3 pb-1">
          <Navlinks />
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>

      {/* Desktop navbar at top — hidden on map page */}
      {pathname !== "/" && (
        <div className="sticky top-0 z-50 hidden border-b border-gray-200 bg-gray-50 shadow-sm md:block">
          <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-3">
            <div className="flex-shrink-0">
              <Link href="/">
                <Image
                  src="/aireclaro-logo.png"
                  alt="Aire Claro Logo"
                  width={180}
                  height={21}
                  className="h-auto"
                  priority
                />
              </Link>
            </div>
            <div className="flex justify-end gap-10">
              <Navlinks />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
