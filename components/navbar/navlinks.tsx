"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared pill-style nav links, used in both the mobile bottom bar and the
// desktop SiteHeader. Renders <li> elements: both callers wrap this in a <ul>
// inside a <nav>. The state classes below layer on top of the base pill.
//
// A link can still be marked `pending: true` to list it without offering it —
// it then renders as a plain <span> (out of the tab order, nothing pressable)
// with a standing "not yet" cue: a "Próx." badge on desktop, a bare dot on the
// mobile bar. See the pending branch below.
const links = [
  { name: "Mapa", href: "/", icon: Map, pending: false },
  { name: "Datos", href: "/datos", icon: BarChart3, pending: true },
];

// The base pill: was shadcn's Button `nav` variant/size (a plain flex row,
// gray-600 resting ink, house focus ring, 20px icons), replaced when shadcn
// was dropped project-wide -- this is the exact resolved class string that
// variant/size combo produced (captured once via the actual cva/tailwind-
// merge pipeline before removing the dependency, not retyped by hand).
const navPill =
  "items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 flex rounded-full border border-transparent text-gray-600 [&_svg]:size-5 mx-auto w-full max-w-[7.5rem] gap-2 px-2 py-3 md:mx-0 md:w-auto md:max-w-none md:justify-start md:px-5 md:py-2.5";

// Current-page treatment, identical on both bars: a faint neutral wash a step
// past the hover + darkest ink (`text-gray-900`, icon follows via currentColor)
// + `font-semibold` on the label + `aria-current`. The mobile pill is capped
// at `max-w` and centred (see the Button `nav` size), so the wash reads as a
// content-hugging pill on both bars, not a full-tab lozenge.
const navCurrent = "bg-gray-900/[0.08] text-gray-900";

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
              <span className={cn(navPill, "text-gray-500")}>
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
            {/* The pill classes go straight on the <Link>, so the focus ring
                and hit area match what you see. aria-current is the only
                thing that tells assistive tech which page this is. */}
            <Link
              href={link.href}
              aria-current={isCurrent ? "page" : undefined}
              className={cn(
                navPill,
                isCurrent ? navCurrent : "hover:bg-black/[0.04]",
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <span
                className={cn(
                  "text-sm",
                  isCurrent ? "font-semibold" : "font-medium",
                )}
              >
                {link.name}
              </span>
            </Link>
          </li>
        );
      })}
    </>
  );
}
