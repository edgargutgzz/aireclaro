import Image from "next/image";
import Navlinks from "@/components/navlinks";

export default function Navbar() {
  return (
    <div className="flex h-full flex-col pt-14">
      {/* Logo */}
      <div className="px-8 pb-12">
        <Image
          src="/aireclaro-logo.png"
          alt="Aire Claro Logo"
          width={160}
          height={19}
        />
      </div>
      {/* Links */}
      <div className="px-4">
        <Navlinks />
      </div>
    </div>
  );
}
