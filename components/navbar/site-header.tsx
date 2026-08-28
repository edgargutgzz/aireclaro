import Link from "next/link";
import Image from "next/image";
import Navlinks from "@/components/navbar/navlinks";

// Same org as observatoriodelaire.com (shared logo), but the nav itself
// follows Aire Claro's own visual language — the same icon+label pill
// links used in the mobile bottom bar, not the reference site's plain
// text links. Desktop only - mobile keeps its own bottom nav bar.
export default function SiteHeader() {
  return (
    <div className="hidden h-[72px] border-b border-white/60 bg-white/80 backdrop-blur-md md:flex md:items-center">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link href="/">
          <Image
            src="/occamm-logo.png"
            alt="OCCAMM Logo"
            width={150}
            height={28}
            className="h-[27.5px] w-[150px]"
          />
        </Link>
        <div className="flex items-center gap-2">
          <Navlinks />
        </div>
      </div>
    </div>
  );
}
