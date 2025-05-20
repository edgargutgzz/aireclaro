import Image from "next/image";
import Navlinks from "@/components/navbar/navlinks";

export default function Navbar() {
  return (
    <div className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="flex w-full items-center justify-between px-4 py-3">
        {/* Logo - visible on all screens but smaller on mobile */}
        <div className="flex-shrink-0">
          <Image
            src="/aireclaro-logo.png"
            alt="Aire Claro Logo"
            width={140}
            height={17}
            className="h-auto w-28 md:w-36"
          />
        </div>
        {/* Links */}
        <div className="flex justify-end gap-1 md:gap-4 lg:gap-8">
          <Navlinks />
        </div>
      </div>
    </div>
  );
}
