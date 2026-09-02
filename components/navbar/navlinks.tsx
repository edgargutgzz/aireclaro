"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Map, BarChart3, Info } from "lucide-react";

// Shared pill-style nav links, used in both the mobile bottom bar and the
// desktop SiteHeader. Renders <li> elements: both callers wrap this in a <ul>
// inside a <nav>.
const links = [
  { name: "Mapa", href: "/", icon: Map, pending: false },
  { name: "Datos", href: "/datos", icon: BarChart3, pending: false },
  // Acerca is built but not ready to show, so both bars list it without
  // offering it. It renders as a plain <span>: nothing in the tab order,
  // nothing that looks pressable, and no control that swallows a tap. The
  // "not yet" state is always on screen rather than behind a tap or a timer,
  // said two ways depending on room: the "Próx." badge on the desktop bar, a
  // bare dot on the mobile bottom bar, where three labels plus a badge do not
  // fit three-across.
  { name: "Acerca", href: "/acerca", icon: Info, pending: true },
];

// One pill recipe, both breakpoints. Mobile: a full-width, centred tab that
// fills its flex-1 slot, so the three sit on an even rhythm and the row never
// overruns a narrow (320-360px) bar the way three content-sized px-5 pills
// did. Desktop (md:) restores the approved SiteHeader pill exactly:
// content-sized, left-aligned, px-5 py-2.5.
const pill =
  "flex w-full items-center justify-center gap-2 rounded-full border border-transparent px-2 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 md:w-auto md:justify-start md:px-5 md:py-2.5";

// A filled current-page pill marks a choice, and now that Mapa and Datos are
// both live the nav can take you to more than one place, so the fill is back:
// the current pill gets the white glass surface on desktop, a blue wash on the
// mobile bottom bar. Acerca stays grayed and badged. `soloOnDesktop` is the
// switch — it flips false the moment a second link goes live, and drops back to
// the fill-less "weight + ink + aria-current" treatment if we ever return to a
// single live link.
const soloOnDesktop = links.filter((link) => !link.pending).length === 1;

export default function Navlinks() {
  const pathname = usePathname();

  return (
    <>
      {links.map((link) => {
        const Icon = link.icon;

        if (link.pending) {
          return (
            <li key={link.name} className="flex-1 md:flex-initial">
              {/* Not a control: a <span>, so it is out of the tab order and
                  there is no disabled button to explain. The signal is simply
                  on screen. "Próx." is an abbreviation, hidden from assistive
                  tech with the whole word given after it. The badge does not
                  fit the mobile bar three-across, so there a bare gray dot
                  carries the same "not yet"; the sr-only word covers both. */}
              <span className={clsx(pill, "text-gray-500")}>
                <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium">{link.name}</span>
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400 md:hidden"
                />
                <span
                  aria-hidden="true"
                  className="hidden rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600 md:inline"
                >
                  Próx.
                </span>
                <span className="sr-only">Próximamente</span>
              </span>
            </li>
          );
        }

        const isCurrent = pathname === link.href;

        return (
          <li key={link.name} className="flex-1 md:flex-initial">
            {/* The pill is the link, rather than a block div inside an inline
                anchor: the focus ring and the hit area both used to be
                measured off the inline box instead of the pill you can see.
                aria-current is the only thing that tells assistive tech which
                page this is, the styling alone said nothing. */}
            <Link
              href={link.href}
              aria-current={isCurrent ? "page" : undefined}
              className={clsx(pill, {
                // Fallback for a single live link: "current" is just darker
                // ink, font-semibold (below) and aria-current, no fill. See
                // soloOnDesktop above.
                "text-gray-700 md:hover:bg-black/[0.04]": isCurrent && soloOnDesktop,
                // Two or more live links: the current pill takes a fill.
                // Desktop takes the white glass pill (no backdrop-blur: the
                // stone-50 header behind it is opaque, nothing to blur).
                // The mobile bottom bar is itself glass, so white would
                // vanish on it and it takes a blue wash instead.
                "border-blue-200 bg-blue-50 text-blue-600 md:border-white/60 md:bg-white md:text-gray-700 md:shadow-sm":
                  isCurrent && !soloOnDesktop,
                // gray-600, not gray-400: an unselected label sat at 2.5:1 on
                // this background, against the 4.5:1 text asks for.
                "text-gray-600 hover:bg-black/[0.04]": !isCurrent,
              })}
            >
              <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
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
