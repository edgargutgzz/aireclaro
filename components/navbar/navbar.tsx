import Image from "next/image";
import Navlinks from "@/components/navbar/navlinks";

export default function Navbar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white shadow-lg">
      <div className="flex w-full justify-around px-2 py-3">
        <Navlinks />
      </div>
      {/* Bottom safe area for newer iOS devices */}
      <div className="h-[env(safe-area-inset-bottom)] bg-white"></div>
    </div>
  );
}
