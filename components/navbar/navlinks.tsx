"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Map, BarChart3 } from "lucide-react";

// Shared pill-style nav links, used in both the mobile bottom bar and
// the desktop SiteHeader.
export default function Navlinks() {
  const pathname = usePathname();

  const links = [
    { name: "Mapa", href: "/", icon: Map, alt: "Mapa" },
    { name: "Datos", href: "/datos", icon: BarChart3, alt: "Datos" },
  ];

  return (
    <>
      {links.map((link) => {
        const IconComponent = link.icon;
        const isSelected = pathname === link.href;
        return (
          <Link
            key={link.name}
            href={link.href}
            className="group transition-opacity active:opacity-70"
            aria-label={link.alt}
          >
            <div
              className={clsx("flex items-center gap-2 rounded-full px-5 py-2.5 transition-colors border", {
                "border-gray-200 bg-gray-200/80 text-gray-900": isSelected,
                "border-transparent text-gray-400": !isSelected,
              })}
            >
              <IconComponent className="h-5 w-5" />
              <span className={clsx("text-sm", {
                "font-semibold": isSelected,
                "font-medium": !isSelected,
              })}>
                {link.name}
              </span>
            </div>
          </Link>
        );
      })}
    </>
  );
}
