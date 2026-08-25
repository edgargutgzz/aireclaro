"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const LINKS = [
  { name: "Mapa", href: "/" },
  { name: "Datos", href: "/datos" },
  { name: "Acerca", href: "/acerca" },
];

// Matches observatoriodelaire.com's own top bar so Aire Claro reads as
// part of the same site, not a separate product. Desktop only - mobile
// keeps its own bottom nav bar.
export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <div className="hidden h-[72px] border-b border-stone-200 bg-stone-50 md:flex md:items-center">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link href="/">
          <Image
            src="/occamm-logo.png"
            alt="OCCAMM Logo"
            width={150}
            height={28}
            className="h-7 w-auto"
          />
        </Link>
        <div className="flex items-center gap-10">
          {LINKS.map((link) => {
            const isSelected = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx("text-sm transition-colors hover:text-gray-500", {
                  "font-semibold text-gray-900": isSelected,
                  "font-medium text-gray-600": !isSelected,
                })}
              >
                {link.name}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
