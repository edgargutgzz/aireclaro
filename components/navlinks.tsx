"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export default function Navlinks() {
  const pathname = usePathname();

  const links = [
    {
      name: "Inicio",
      href: "/",
      selectedImage: "/inicio-on.png",
      unselectedImage: "/inicio-off.png",
      alt: "Inicio",
    },
    {
      name: "Mapa",
      href: "/mapa",
      selectedImage: "/mapa-on.png",
      unselectedImage: "/mapa-off.png",
      alt: "Mapa",
    },
    {
      name: "Datos",
      href: "/datos",
      selectedImage: "/datos-on.png",
      unselectedImage: "/datos-off.png",
      alt: "Datos",
    },
    {
      name: "Acerca",
      href: "/acerca",
      selectedImage: "/acerca-on.png",
      unselectedImage: "/acerca-off.png",
      alt: "Acerca",
    },
  ];

  return (
    <>
      {links.map((link) => (
        <Link key={link.name} href={link.href}>
          <div className="mb-3 flex w-full items-center rounded-lg p-4 hover:bg-gray-100">
            {/* Ícono */}
            <Image
              src={
                pathname === link.href
                  ? link.selectedImage
                  : link.unselectedImage
              }
              alt={link.alt}
              width={22}
              height={22}
              className="h-6 w-6"
            />
            {/* Nombre */}
            <span
              className={clsx("pl-4", {
                "font-bold": pathname === link.href,
              })}
            >
              {link.name}
            </span>
          </div>
        </Link>
      ))}
    </>
  );
}
