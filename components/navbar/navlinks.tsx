"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Info, Map, BarChart3 } from "lucide-react";

export default function Navlinks() {
  const pathname = usePathname();

  const links = [
    {
      name: "Mapa",
      href: "/",
      icon: Map,
      alt: "Mapa",
    },
    {
      name: "Datos",
      href: "/datos",
      icon: BarChart3,
      alt: "Datos",
      desktopOnly: true,
    },
    {
      name: "Acerca",
      href: "/acerca",
      icon: Info,
      alt: "Acerca",
    },
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
            className={clsx("group transition-opacity active:opacity-70 md:block md:w-full", {
              "hidden md:block": link.desktopOnly,
            })}
            aria-label={link.alt}
          >
            {/* Mobile view — horizontal pill */}
            {!link.desktopOnly && (
              <div
                className={clsx("flex items-center gap-2 rounded-full px-5 py-2.5 md:hidden transition-colors border", {
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
            )}

            {/* Desktop view — vertical rail row: full-width, left-aligned icon + label */}
            <div
              className={clsx(
                "hidden md:flex md:w-full md:items-center md:gap-3 md:rounded-xl md:px-3.5 md:py-2.5 md:transition-colors",
                {
                  "md:bg-gray-100 md:text-gray-900": isSelected,
                  "md:text-gray-500 md:hover:bg-gray-50 md:hover:text-gray-700": !isSelected,
                },
              )}
            >
              <IconComponent className="md:h-5 md:w-5 md:flex-shrink-0" />
              <span
                className={clsx("md:text-sm", {
                  "font-semibold": isSelected,
                  "font-medium": !isSelected,
                })}
              >
                {link.name}
              </span>
            </div>
          </Link>
        );
      })}
    </>
  );
}
