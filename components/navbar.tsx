import Image from "next/image";
import Navlinks from "@/components/navlinks";

export default function Navbar() {
  return (
    <div
      style={{ boxShadow: "0 -4px 5px -2px rgba(0, 0, 0, 0.1)" }}
      className="fixed bottom-0 w-full bg-white lg:relative lg:flex-col lg:pt-14"
    >
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
      <div className="flex w-full justify-center space-x-20 py-1 lg:flex-col lg:space-x-0 lg:px-4">
        <Navlinks />
      </div>
    </div>
  );
}
