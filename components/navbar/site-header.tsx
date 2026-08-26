"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const LINKS = [
  { name: "Mapa", href: "/" },
  { name: "Datos", href: "/datos" },
];

// Same org as observatoriodelaire.com (shared logo, links there), but the
// nav itself follows Aire Claro's own visual language — the rounded
// segmented-pill pattern already used for the Capas year toggle and the
// PM2.5/PM10 toggle — rather than copying the reference site's plain
// text links. Desktop only - mobile keeps its own bottom nav bar.
export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <div className="hidden h-[72px] bg-stone-50 md:flex md:items-center">
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
        <div className="inline-flex items-center gap-1 rounded-2xl bg-gray-100 p-1">
          {LINKS.map((link) => {
            const isSelected = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "rounded-xl px-5 py-2 text-sm font-semibold transition-colors",
                  isSelected ? "bg-white text-stone-800 shadow-sm" : "text-gray-400 hover:text-gray-600",
                )}
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
