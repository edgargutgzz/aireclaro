import Image from "next/image";
import Navlinks from "@/components/navbar/navlinks";

export default function Navbar() {
  return (
    <>
      {/* Mobile navbar at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white shadow-lg md:hidden">
        <div className="flex w-full justify-around px-2 py-3">
          <Navlinks />
        </div>
        {/* Bottom safe area for newer iOS devices */}
        <div className="h-[env(safe-area-inset-bottom)] bg-white"></div>
      </div>

      {/* Desktop navbar at top */}
      <div className="sticky top-0 z-50 hidden border-b border-gray-200 bg-white shadow-sm md:block">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Image
              src="/aireclaro-logo.png"
              alt="Aire Claro Logo"
              width={160}
              height={19}
              className="h-auto"
            />
          </div>
          {/* Navigation */}
          <div className="flex justify-end gap-6">
            <Navlinks />
          </div>
        </div>
      </div>
    </>
  );
}
