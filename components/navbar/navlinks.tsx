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
      name: "Datos",
      href: "/datos",
      icon: LineChart,
      alt: "Datos",
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
            aria-label={link.alt}
            className="group relative"
          >
            <div className="flex items-center px-4 py-2 md:rounded-lg md:px-3 md:hover:bg-gray-100">
              {/* Icon */}
              <IconComponent
                className={clsx("h-6 w-6 md:h-5 md:w-5", {
                  "text-blue-500": isSelected,
                  "text-gray-400 group-hover:text-gray-600": !isSelected,
                })}
              />

              {/* Text only on desktop */}
              <span
                className={clsx("hidden md:ml-2 md:block md:text-sm", {
                  "font-medium text-blue-500": isSelected,
                  "text-gray-500": !isSelected,
                })}
              >
                {link.name}
              </span>
            </div>

            {/* Bottom indicator line positioned at the very bottom of navbar */}
            {isSelected && (
              <div className="absolute -bottom-2 left-0 h-[3px] w-full bg-blue-500"></div>
            )}
          </Link>
        );
      })}
    </>
  );
}
