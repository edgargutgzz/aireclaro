import Image from "next/image";
import Link from "next/link";
import Navlinks from "@/components/navbar/navlinks";

export default function Navbar() {
  return (
    <>
      {/* Mobile navbar at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white shadow-sm md:hidden">
        <div className="flex w-full justify-around px-2 pb-2 pt-4">
          <Navlinks />
        </div>
        {/* Bottom safe area for newer iOS devices */}
        <div className="h-[env(safe-area-inset-bottom)]"></div>
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
