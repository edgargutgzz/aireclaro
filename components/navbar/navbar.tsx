import Image from "next/image";
import Navlinks from "@/components/navbar/navlinks";

export default function Navbar() {
  return (
    <div className="fixed bottom-0 w-full border-t border-gray-200 bg-white lg:relative lg:h-screen lg:flex-col lg:space-y-4 lg:border-r lg:border-t-0 lg:border-gray-200 lg:py-6">
      {/* Logo */}
      <div className="hidden lg:block lg:px-8 lg:py-10">
        <Image
          src="/aireclaro-logo.png"
          alt="Aire Claro Logo"
          width={160}
          height={19}
        />
      </div>
      {/* Links */}
      <div className="flex w-full justify-between px-8 py-3 md:px-32 md:py-5 lg:flex-col lg:space-y-3 lg:px-4">
        <Navlinks />
      </div>
    </div>
  );
}
