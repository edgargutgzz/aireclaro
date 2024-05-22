import Image from "next/image";
import Navlinks from "@/components/navlinks";

export default function Navbar() {
  return (
    <div className="fixed bottom-0 z-10 w-full flex-col bg-white shadow-lg lg:static lg:z-auto lg:flex lg:min-h-screen lg:w-3/12 lg:flex-col lg:py-10">
      <div className="container mx-auto flex h-full items-center justify-around px-2 pb-2 pt-3 lg:flex-col lg:items-start lg:justify-start lg:pl-4 lg:pr-5">
        {/* Logo */}
        <div className="hidden lg:mb-10 lg:block lg:pl-4">
          <Image
            src="/aireclaro-logo.png"
            alt="Aire Claro Logo"
            width={180}
            height={22}
          />
        </div>
        {/* Navlinks */}
        <Navlinks />
      </div>
    </div>
  );
}
