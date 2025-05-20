import Image from "next/image";
import Navlinks from "@/components/navbar/navlinks";

export default function Navbar() {
  return (
    <div className="sticky top-0 z-50 border-b-0 bg-white shadow-sm">
      {/* Main navbar content */}
      <div className="relative flex w-full items-center justify-between px-2 py-2 md:px-6 md:py-3">
        {/* Logo - only visible on larger screens */}
        <div className="hidden md:block">
          <Image
            src="/aireclaro-logo.png"
            alt="Aire Claro Logo"
            width={140}
            height={17}
            className="h-auto"
          />
        </div>
        {/* Links - centered on mobile, right-aligned on desktop */}
        <div className="mx-auto flex w-full justify-around md:mx-0 md:w-auto md:justify-end md:gap-4 lg:gap-6">
          <Navlinks />
        </div>
      </div>

      {/* Border at the bottom (separate from indicator line) */}
      <div className="h-[1px] w-full bg-gray-200"></div>
    </div>
  );
}
