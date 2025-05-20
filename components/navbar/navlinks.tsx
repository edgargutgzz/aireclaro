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
            className="group"
            aria-label={link.alt}
          >
            {/* Mobile view - vertical layout with icons only */}
            <div className="flex flex-col items-center md:hidden">
              <div
                className={clsx("rounded-full p-1.5", {
                  "bg-blue-50": isSelected,
                })}
              >
                <IconComponent
                  className={clsx("h-6 w-6", {
                    "text-blue-500": isSelected,
                    "text-gray-500": !isSelected,
                  })}
                />
              </div>
            </div>

            {/* Desktop view - horizontal layout with text */}
            <div
              className={clsx(
                "hidden md:flex md:items-center md:rounded-lg md:px-5 md:py-3",
                {
                  "bg-blue-50": isSelected,
                  "hover:bg-gray-100": !isSelected,
                },
              )}
            >
              <IconComponent
                className={clsx("md:h-6 md:w-6", {
                  "text-blue-500": isSelected,
                  "text-gray-500 group-hover:text-gray-600": !isSelected,
                })}
              />
              <span
                className={clsx("md:ml-4 md:text-base", {
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
