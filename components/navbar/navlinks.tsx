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
            className="flex flex-col items-center"
          >
            <div
              className={clsx("mb-1 rounded-full p-1.5", {
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
            <span
              className={clsx("text-xs", {
                "font-medium text-blue-500": isSelected,
                "text-gray-600": !isSelected,
              })}
            >
              {link.name}
            </span>
          </Link>
        );
      })}
    </>
  );
}
