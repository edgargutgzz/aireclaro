import Image from "next/image";
import Navlinks from "@/components/navbar/navlinks";

export default function Navbar() {
  return (
    <div className="w-full border-t border-gray-200 bg-white md:border-b md:border-t-0">
      <div className="flex w-full items-center justify-between bg-gradient-to-b from-white to-gray-50 px-8 py-3 md:py-2">
        {/* Logo */}
        <div className="hidden md:block">
          <Image
            src="/aireclaro-logo.png"
            alt="Aire Claro Logo"
            width={160}
            height={19}
          />
        </div>
        {/* Links */}
        <div className="flex w-full justify-between md:w-auto md:justify-end md:gap-8 md:px-8">
          <Navlinks />
        </div>
      </div>
    </div>
  );
}
