"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Map, BarChart3, Info } from "lucide-react";

// Shared pill-style nav links, used in both the mobile bottom bar and the
// desktop SiteHeader. Renders <li> elements: both callers wrap this in a <ul>
// inside a <nav>.
const links = [
  { name: "Mapa", href: "/", icon: Map, pending: false },
  // Datos and Acerca are built but not ready to show, so they are listed
  // without being offered. They used to render as live-looking pills that
  // swallowed the click and flashed a tooltip for two seconds: that told
  // screen readers nothing at all, and a message on a timer fails SC 1.4.13
  // on persistence.
  { name: "Datos", href: "/datos", icon: BarChart3, pending: true },
  { name: "Acerca", href: "/acerca", icon: Info, pending: true },
];

const pill =
  "flex items-center gap-2 rounded-full border border-transparent px-5 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15";

export default function Navlinks() {
  const pathname = usePathname();
  // Mobile only, see below. Sticks until it is dismissed rather than running
  // out on a timer.
  const [explaining, setExplaining] = useState<string | null>(null);

  return (
    <>
      {links.map((link) => {
        const Icon = link.icon;

        if (link.pending) {
          return (
            <li key={link.name} className="relative">
              {/* Desktop: nothing to click. The state is written on the label
                  instead of hidden behind a tap that then takes it away. */}
              <span className={clsx(pill, "hidden text-gray-500 md:flex")}>
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-sm font-medium">{link.name}</span>
                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                  Pronto
                </span>
              </span>

              {/* Mobile: three labels and a standing badge do not fit across a
                  360px bottom bar, so the explanation stays behind a tap. It
                  now waits to be dismissed, and role="status" means it is
                  actually announced. */}
              <button
                type="button"
                aria-disabled="true"
                onClick={() => setExplaining((v) => (v === link.name ? null : link.name))}
                className={clsx(pill, "text-gray-500 md:hidden")}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-sm font-medium">{link.name}</span>
              </button>
              {explaining === link.name && (
                <span
                  role="status"
                  className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white shadow-sm md:hidden"
                >
                  Próximamente
                </span>
              )}
            </li>
          );
        }

        const isCurrent = pathname === link.href;

        return (
          <li key={link.name}>
            {/* The pill is the link, rather than a block div inside an inline
                anchor: the focus ring and the hit area both used to be
                measured off the inline box instead of the pill you can see.
                aria-current is the only thing that tells assistive tech which
                page this is, the styling alone said nothing. */}
            <Link
              href={link.href}
              aria-current={isCurrent ? "page" : undefined}
              className={clsx(pill, {
                // Mobile keeps the blue fill: its bottom bar is already
                // translucent, so glass on glass would not read as selected.
                // Desktop drops the backdrop-blur the map's cards use, since
                // the header behind this pill is opaque stone-50 and there is
                // nothing there to blur.
                "border-blue-200 bg-blue-50 text-blue-600 md:border-white/60 md:bg-white md:text-gray-700 md:shadow-sm": isCurrent,
                // gray-600, not gray-400: an unselected label sat at 2.5:1 on
                // this background, against the 4.5:1 text asks for.
                "text-gray-600 hover:bg-black/[0.04]": !isCurrent,
              })}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className={clsx("text-sm", isCurrent ? "font-semibold" : "font-medium")}>
                {link.name}
              </span>
            </Link>
          </li>
        );
      })}
    </>
  );
}
