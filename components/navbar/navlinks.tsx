"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";

// Shared pill-style nav links, used in both the mobile bottom bar and the
// desktop SiteHeader. Renders <li> elements: both callers wrap this in a <ul>
// inside a <nav>. The pill is the shadcn Button's `nav` variant/size (shape,
// gray-600 resting ink, house focus ring, 20px icons); the state classes
// below layer on top.
//
// A link can still be marked `pending: true` to list it without offering it —
// it then renders as a plain <span> (out of the tab order, nothing pressable)
// with a standing "not yet" cue: a "Próx." badge on desktop, a bare dot on the
// mobile bar. See the pending branch below.
const links = [
  { name: "Mapa", href: "/", icon: Map, pending: false },
  { name: "Datos", href: "/datos", icon: BarChart3, pending: false },
];

// The base pill, straight from the Button variant — used as-is for the pending
// span, and as the starting point for each live link.
const navPill = buttonVariants({ variant: "nav", size: "nav" });

// A filled current-page pill marks a choice. With more than one live link the
// nav can take you somewhere, so the current pill gets a fill: the white glass
// surface on desktop, a blue wash on the mobile bottom bar. `soloOnDesktop` is
// the switch — it drops back to the fill-less "weight + ink + aria-current"
// treatment only if we ever return to a single live link.
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
            {/* The pill is the link itself (Button asChild → the <a>), so the
                focus ring and hit area match what you see. aria-current is the
                only thing that tells assistive tech which page this is. */}
            <Button
              asChild
              variant="nav"
              size="nav"
              className={cn({
                // Fallback for a single live link: "current" is just darker
                // ink, font-semibold (below) and aria-current, no fill.
                "text-gray-700 md:hover:bg-black/[0.04]": isCurrent && soloOnDesktop,
                // Two or more live links: the current pill takes a fill.
                // Desktop takes the white glass pill (no backdrop-blur: the
                // stone-50 header behind it is opaque). The mobile bottom bar
                // is itself glass, so white would vanish on it and it takes a
                // blue wash instead.
                "border-blue-200 bg-blue-50 text-blue-600 md:border-white/60 md:bg-white md:text-gray-700 md:shadow-sm":
                  isCurrent && !soloOnDesktop,
                // Resting hover. gray-600 ink already comes from the variant.
                "hover:bg-black/[0.04]": !isCurrent,
              })}
            >
              <Link href={link.href} aria-current={isCurrent ? "page" : undefined}>
                <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                <span className={cn("text-sm", isCurrent ? "font-semibold" : "font-medium")}>
                  {link.name}
                </span>
              </Link>
            </Button>
          </li>
        );
      })}
    </>
  );
}
