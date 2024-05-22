import Image from "next/image";
import Navlinks from "@/components/navlinks";

export default function Navbar() {
  return (
    <div className="flex h-full flex-col px-4 pt-14">
      {/* Logo */}
      <div className="mb-10 pl-4">
        <Image
          src="/aireclaro-logo.png"
          alt="Aire Claro Logo"
          width={160}
          height={19}
        />
      </div>
      {/* Links */}
      <div>
        <Navlinks />
      </div>
    </div>
  );
}
