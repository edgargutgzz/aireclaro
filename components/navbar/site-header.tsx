import Link from "next/link";
import Image from "next/image";

const LINKS = [
  { name: "Mapa", href: "/" },
  { name: "Datos", href: "/datos" },
];

// Matches observatoriodelaire.com's own top bar so Aire Claro reads as
// part of the same site, not a separate product. Desktop only - mobile
// keeps its own bottom nav bar. Reference nav links never bold the
// current page, so ours doesn't either.
export default function SiteHeader() {
  return (
    <div className="hidden h-[86px] bg-stone-50 md:flex md:items-center">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link href="https://observatoriodelaire.com" target="_blank">
          <Image
            src="/occamm-logo.png"
            alt="OCCAMM Logo"
            width={150}
            height={28}
            className="h-[27.5px] w-[150px]"
          />
        </Link>
        <div className="flex items-center gap-10">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-base font-normal text-[rgb(2,8,23)] transition-colors hover:text-gray-500"
            >
              {link.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
