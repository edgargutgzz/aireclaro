"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Info, Map } from "lucide-react";

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
            className="group transition-opacity active:opacity-70"
            aria-label={link.alt}
          >
            {/* Mobile view — horizontal pill */}
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

            {/* Desktop view */}
            <div
              className={clsx(
                "hidden md:flex md:items-center md:rounded-full md:px-4 md:py-2.5 md:border md:transition-colors",
                {
                  "md:border-gray-200 md:bg-gray-200/80 md:text-gray-900": isSelected,
                  "md:border-transparent md:text-gray-400 md:hover:bg-gray-100": !isSelected,
                },
              )}
            >
              <IconComponent className="md:h-5 md:w-5" />
              <span
                className={clsx("md:ml-2 md:text-sm", {
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
