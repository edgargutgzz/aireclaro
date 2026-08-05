"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Heart, LineChart, Info, MapPin } from "lucide-react";

export default function Navlinks() {
  const pathname = usePathname();

  const links = [
    {
      name: "Mapa",
      href: "/",
      icon: MapPin,
      alt: "Mapa",
    },
    {
      name: "Recomendaciones",
      href: "/recomendaciones",
      icon: Heart,
      alt: "Recomendaciones",
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
            className="group"
            aria-label={link.alt}
          >
            {/* Mobile view */}
            <div className="flex items-center justify-center md:hidden">
              {isSelected ? (
                <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2">
                  <IconComponent className="h-5 w-5 text-gray-900" />
                  <span className="text-xs font-medium text-gray-900">{link.name}</span>
                </div>
              ) : (
                <div className="p-2">
                  <IconComponent className="h-5 w-5 text-gray-400" />
                </div>
              )}
            </div>

            {/* Desktop view */}
            <div
              className={clsx(
                "hidden md:flex md:items-center md:rounded-lg md:px-4 md:py-2.5",
                {
                  "bg-blue-50": isSelected,
                  "hover:bg-gray-100": !isSelected,
                },
              )}
            >
              <IconComponent
                className={clsx("md:h-5 md:w-5", {
                  "text-blue-500": isSelected,
                  "text-gray-500 group-hover:text-gray-600": !isSelected,
                })}
              />
              <span
                className={clsx("md:ml-3 md:text-sm", {
                  "font-medium text-blue-500": isSelected,
                  "text-gray-600": !isSelected,
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
