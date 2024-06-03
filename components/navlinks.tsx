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
          <div className="flex flex-col lg:flex-row lg:rounded-lg lg:p-4 lg:hover:bg-gray-100">
            {/* Icon */}
            <Image
              src={
                pathname === link.href
                  ? link.selectedImage
                  : link.unselectedImage
              }
              alt={link.alt}
              width={24}
              height={24}
              className="md:h-8 md:w-8"
            />
            {/* Name */}
            <span
              className={clsx("hidden lg:ml-4 lg:block", {
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
