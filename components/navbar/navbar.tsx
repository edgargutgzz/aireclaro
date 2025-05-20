import Image from "next/image";
import Navlinks from "@/components/navbar/navlinks";

export default function Navbar() {
  return (
    <div className="sticky top-0 z-50 rounded-b-xl bg-white shadow-lg">
      <div className="flex w-full justify-around px-2 py-3">
        <Navlinks />
      </div>
    </div>
  );
}
