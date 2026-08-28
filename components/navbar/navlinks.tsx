"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Map, BarChart3, Info } from "lucide-react";

// Shared pill-style nav links, used in both the mobile bottom bar and
// the desktop SiteHeader.
export default function Navlinks() {
  const pathname = usePathname();
  const [comingSoonFor, setComingSoonFor] = useState<string | null>(null);

  useEffect(() => {
    if (!comingSoonFor) return;
    const timeout = setTimeout(() => setComingSoonFor(null), 2000);
    return () => clearTimeout(timeout);
  }, [comingSoonFor]);

  const links = [
    { name: "Mapa", href: "/", icon: Map, alt: "Mapa" },
    // Datos and Acerca aren't ready yet — clicking shows a "Próximamente" tooltip instead of navigating.
    { name: "Datos", href: "/datos", icon: BarChart3, alt: "Datos", disabled: true },
    { name: "Acerca", href: "/acerca", icon: Info, alt: "Acerca", disabled: true },
  ];

  return (
    <>
      {links.map((link) => {
        const IconComponent = link.icon;
        const isSelected = pathname === link.href;
        const pill = (
          <div
            className={clsx("flex items-center gap-2 rounded-full px-5 py-2.5 transition-colors border", {
              "border-blue-200 bg-blue-50 text-blue-600": isSelected,
              "border-transparent text-gray-400": !isSelected,
            })}
          >
            <IconComponent className="h-5 w-5" />
            <span className={clsx("text-sm", {
              "font-semibold": isSelected,
              "font-medium": !isSelected,
            })}>
              {link.name}
            </span>
          </div>
        );

        if (link.disabled) {
          return (
            <div key={link.name} className="relative">
              {comingSoonFor === link.name && (
                <>
                  {/* Mobile: pill sits in the bottom bar, so the tooltip opens upward */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white shadow-sm md:hidden">
                    Próximamente
                  </div>
                  {/* Desktop: pill sits in the top bar, so the tooltip opens downward */}
                  <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white shadow-sm md:block">
                    Próximamente
                  </div>
                </>
              )}
              <button
                type="button"
                onClick={() => setComingSoonFor(link.name)}
                className="group transition-opacity active:opacity-70"
                aria-label={`${link.alt} (próximamente)`}
              >
                {pill}
              </button>
            </div>
          );
        }

        return (
          <Link
            key={link.name}
            href={link.href}
            className="group transition-opacity active:opacity-70"
            aria-label={link.alt}
          >
            {pill}
          </Link>
        );
      })}
    </>
  );
}
