import Image from "next/image";
import Navlinks from "@/components/navlinks";

export default function Navbar() {
  return (
    <div className="fixed bottom-0 z-10 w-full bg-white shadow-lg lg:relative lg:bottom-auto lg:z-auto lg:h-full lg:w-1/5">
      {/* Logo */}
      <div className="hidden lg:block lg:px-8 lg:pb-12">
        <Image
          src="/aireclaro-logo.png"
          alt="Aire Claro Logo"
          width={160}
          height={19}
        />
      </div>
      {/* Links */}
      <div className="flex w-full justify-center space-x-20 py-2 lg:flex-col lg:space-x-0 lg:px-4">
        <Navlinks />
      </div>
    </div>
  );
}
