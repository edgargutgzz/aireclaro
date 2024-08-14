"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Home, Map, Database, Info } from "lucide-react";

export default function Navlinks() {
  const pathname = usePathname();

  const links = [
    {
      name: "Inicio",
      href: "/",
      icon: Home,
      alt: "Inicio",
    },
    {
      name: "Mapa",
      href: "/mapa",
      icon: Map,
      alt: "Mapa",
    },
    {
      name: "Datos",
      href: "/datos",
      icon: Database,
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
            <div className="flex flex-col lg:flex-row lg:rounded-lg lg:p-4 lg:hover:bg-gray-100">
              {/* Icon */}
              <IconComponent
                className={clsx("md:h-7 md:w-7 lg:h-6 lg:w-6", {
                  "text-black": isSelected,
                  "text-gray-400": !isSelected,
                })}
              />
              {/* Name */}
              <span
                className={clsx("hidden lg:ml-4 lg:block", {
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
