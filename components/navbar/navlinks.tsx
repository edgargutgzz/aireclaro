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
            <div className="flex flex-col items-center px-3 py-2 transition-colors duration-200 lg:flex-row lg:rounded-lg lg:p-4 lg:hover:bg-gray-100">
              {/* Icon */}
              <div
                className={clsx(
                  "flex h-10 w-10 items-center justify-center rounded-full md:h-9 md:w-9 lg:h-6 lg:w-6",
                  {
                    "bg-gray-100": isSelected && window.innerWidth < 1024,
                    "text-black": isSelected,
                    "text-gray-400": !isSelected,
                  },
                )}
              >
                <IconComponent className="h-5 w-5 md:h-5 md:w-5 lg:h-5 lg:w-5" />
              </div>

              {/* Name - Only on large screens */}
              <span
                className={clsx("hidden lg:ml-4 lg:block lg:text-base", {
                  "font-semibold text-black": isSelected,
                  "text-gray-400": !isSelected,
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
