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
  // Datos and Acerca are built but not ready to show, so both bars list them
  // without offering them. They used to render as live-looking pills that
  // swallowed the click and flashed a tooltip for two seconds, which told
  // screen readers nothing at all, and a message on a timer fails SC 1.4.13 on
  // persistence. Now the state is written on the pill itself on desktop, where
  // there is room for a standing badge, and stays behind a tap on mobile,
  // where there is not.
  { name: "Datos", href: "/datos", icon: BarChart3, pending: true },
  { name: "Acerca", href: "/acerca", icon: Info, pending: true },
];

const pill =
  "flex items-center gap-2 rounded-full border border-transparent px-5 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15";

// A filled current-page pill marks a choice. Datos and Acerca are on screen
// again but still cannot be entered, so Mapa is the only place the nav can
// take you and the white fill would mark a choice that is not on offer. Weight
// and ink still say "current", the two pending pills say it from the other
// side by being grayed and badged, and aria-current says it to assistive tech.
// The fill comes back on its own the day a second link goes live.
//
// This used to carry a second argument, that a filled pill is a *surface* and
// its edge would land on the 24px rail while the bare logo sits on the 44px
// text rail. That one is moot now: Mapa is no longer the last thing in the bar,
// so it is Acerca's padding that sets the header's right inset.
const soloOnDesktop = links.filter((link) => !link.pending).length === 1;

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
              {/* Desktop: nothing to click, and nothing that looks clickable.
                  A <span>, so it is not in the tab order and there is no
                  disabled control to explain: the badge is the explanation and
                  it is simply on screen. "Próx." is an abbreviation, so it is
                  hidden from assistive tech and the whole word given instead,
                  the same trade the dialog links make. */}
              <span className={clsx(pill, "hidden text-gray-500 md:flex")}>
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-sm font-medium">{link.name}</span>
                <span
                  aria-hidden="true"
                  className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600"
                >
                  Próx.
                </span>
                <span className="sr-only">Próximamente</span>
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
                "border-blue-200 bg-blue-50 text-blue-600 md:text-gray-700": isCurrent,
                // Desktop's surface, dropped while this is the only link, see
                // soloOnDesktop above. It drops the backdrop-blur the map's
                // cards use, since the header behind the pill is opaque
                // stone-50 and there is nothing there to blur.
                "md:border-white/60 md:bg-white md:shadow-sm": isCurrent && !soloOnDesktop,
                "md:border-transparent md:bg-transparent md:hover:bg-black/[0.04]": isCurrent && soloOnDesktop,
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
