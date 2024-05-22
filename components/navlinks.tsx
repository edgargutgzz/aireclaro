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
        <div
          key={link.name}
          className="rounded-lg lg:mb-4 lg:w-full lg:pr-6 lg:hover:bg-gray-100"
        >
          <Link href={link.href}>
            <div className="flex flex-col items-center text-xs lg:flex-row lg:p-4 lg:py-3 lg:text-base">
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
                className="lg:h-6 lg:w-6"
              />
              {/* Nombre */}
              <span
                className={clsx("mt-0 pt-1 lg:ml-4 lg:mt-0", {
                  "font-bold": pathname === link.href,
                })}
              >
                {link.name}
              </span>
            </div>
          </Link>
        </div>
      ))}
    </>
  );
}
