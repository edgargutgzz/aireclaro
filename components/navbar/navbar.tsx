import Image from "next/image";
import Link from "next/link";
import Navlinks from "@/components/navbar/navlinks";

export default function Navbar() {
  return (
    <>
      {/* Mobile navbar at bottom — floating pill */}
      <div
        className="fixed left-1/2 z-50 -translate-x-1/2 md:hidden"
        style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex items-center gap-1 rounded-full border border-white/60 bg-white/85 p-1.5 shadow-lg backdrop-blur-md">
          <Navlinks />
        </div>
      </div>

      {/* Desktop navbar at top */}
      <div className="sticky top-0 z-50 hidden border-b border-gray-200 bg-white shadow-sm md:block">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-3">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/">
              <Image
                src="/aireclaro-logo.png"
                alt="Aire Claro Logo"
                width={180}
                height={21}
                className="h-auto"
              />
            </Link>
          </div>
          {/* Navigation */}
          <div className="flex justify-end gap-10">
            <Navlinks />
          </div>
        </div>
      </div>
    </>
  );
}
