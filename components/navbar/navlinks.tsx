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
          <Link key={link.name} href={link.href}>
            <div className="relative flex items-center px-2 py-1 md:rounded-lg md:px-3 md:py-2 md:hover:bg-gray-100">
              {/* Active indicator for mobile and desktop */}
              {isSelected && (
                <div className="absolute -bottom-3 left-0 right-0 h-0.5 bg-blue-500" />
              )}

              {/* Icon */}
              <IconComponent
                className={clsx("h-5 w-5 md:h-6 md:w-6", {
                  "text-blue-500": isSelected,
                  "text-gray-400 hover:text-gray-600": !isSelected,
                })}
              />

              {/* Name - hidden on smallest screens, visible on md+ */}
              <span
                className={clsx("ml-1 hidden text-sm md:block", {
                  "font-medium text-blue-500": isSelected,
                  "text-gray-500": !isSelected,
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
