"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

// The site's one navbar, on every page including the map. Copied from
// observatoriodelaire.com's navbar (components/navbar.tsx there), markup and
// styling unchanged. Its height is fixed to --header-h (globals.css), which
// the map also sizes itself against.
//
// Differences from the original: the two react-icons glyphs are inlined as
// their exact SVGs (no new dependency); the logo carries its real aspect ratio
// (150x28, not 150x150, so the bar can't flash 150px tall before the image
// loads); every link points at this app's own pages (the Observatory pages
// were ported here), in the same tab.

// react-icons FiMenu
function MenuIcon() {
  return (
    <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="28" width="28" aria-hidden="true">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

// react-icons IoCloseOutline
function CloseIcon() {
  return (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="28" width="28" aria-hidden="true">
      <path fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" d="M368 368 144 144m224 0L144 368" />
    </svg>
  );
}

// The current page's item is underlined (no width change, so the bar doesn't
// shift between pages) and announced as aria-current="page"; a dropdown's
// button is underlined when one of its pages is current.
const CURRENT = "underline decoration-2 underline-offset-8";

// Desktop dropdowns read like the mobile menu (the validated design): the
// bar's own background and plain links, no group label (the button already
// names the group). It opens right under its button, anchored to its right
// edge (-mr-6/px-6) since Nosotros is the bar's last item and a left-anchored
// panel would run past the page margin; outlined so it stands apart from the bar.
const DROPDOWN =
  "absolute right-0 top-full mt-3 -mr-6 min-w-56 rounded-2xl border border-stone-200 bg-stone-50 px-6 py-2 shadow-sm";

// The small gray label over each group of links in the mobile menu.
const GROUP_LABEL = "pb-1 text-xs font-semibold uppercase tracking-wider text-gray-500";

// The house focus ring, on every focusable item in the bar.
const FOCUS = "rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15";

// The two main pages: first on mobile, after the reading pages on desktop.
const PRINCIPALES = [
  { href: "/datos", label: "Datos" },
  { href: "/mapa", label: "Mapa" },
];

// The reading page (columns, documents, infographics): a plain link, first
// on desktop, after the main pages on mobile.
const LECTURA = [
  { href: "/publicaciones", label: "Publicaciones" },
];

const NOSOTROS = [
  { href: "/quienes-somos", label: "Quiénes somos" },
  { href: "/equipo", label: "Equipo" },
  // Tucked in here (last, least prominent) until the page is ready to go
  // back to the top level.
  { href: "/proyectos", label: "Proyectos" },
];

export default function Navbar() {
  const pathname = usePathname();
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const current = (href: string) => (isCurrent(href) ? "page" : undefined);
  // Menu state
  const [menuState, setMenuState] = useState({
    isOpen: false,
    isSubmenuOpen: false,
  });

  // Ref for detecting clicks outside of menu
  const menuRef = useRef<HTMLDivElement>(null);
  // The dropdown's button, so Escape can hand focus back to it.
  const nosotrosButtonRef = useRef<HTMLButtonElement>(null);

  // The bar's bottom edge, where the mobile panel starts, measured on open so
  // the panel lines up wherever the bar sits.
  const headerRef = useRef<HTMLElement>(null);
  const [panelTop, setPanelTop] = useState(0);

  // Toggles the mobile menu open/closed state
  const toggleMobileMenu = () => {
    setPanelTop(headerRef.current?.getBoundingClientRect().bottom ?? 0);
    setMenuState((prev) => ({
      ...prev,
      isOpen: !prev.isOpen,
    }));
  };

  // Toggles the submenu open/closed state (Nosotros)
  const toggleSubmenu = () => {
    setMenuState((prev) => ({
      ...prev,
      isSubmenuOpen: !prev.isSubmenuOpen,
    }));
  };

  // Effect to close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuState({
          isOpen: false,
          isSubmenuOpen: false,
        });
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Focus inside the open dropdown returns to its button.
        const active = document.activeElement;
        const button = nosotrosButtonRef.current;
        if (button && active && button.parentElement?.contains(active)) button.focus();
        setMenuState({
          isOpen: false,
          isSubmenuOpen: false,
        });
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // While the mobile panel is open nothing behind it scrolls: the page's
  // scroller is <main> (components/main-content.tsx), plus the document
  // itself for iOS Safari's rubber-banding.
  useEffect(() => {
    if (!menuState.isOpen) return;
    const scrollers = [document.getElementById("contenido"), document.documentElement];
    const previous = scrollers.map((el) => el?.style.overflow ?? "");
    scrollers.forEach((el) => el && (el.style.overflow = "hidden"));
    return () => scrollers.forEach((el, i) => el && (el.style.overflow = previous[i]));
  }, [menuState.isOpen]);

  // Tabbing out of an open dropdown closes it.
  const closeOnFocusOut =
    (key: "isSubmenuOpen") => (event: React.FocusEvent<HTMLDivElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setMenuState((prev) => (prev[key] ? { ...prev, [key]: false } : prev));
      }
    };

  // Handles link clicks
  const handleLinkClick = () => {
    setMenuState({
      isOpen: false,
      isSubmenuOpen: false,
    });
  };

  return (
    <header ref={headerRef} className="relative z-50 bg-stone-50 border-stone-200">
      <div
        className="h-header mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-8"
        ref={menuRef}
      >
        {/* Logo */}
        <Link href="/" onClick={handleLinkClick} className={FOCUS}>
          <Image
            src="/navbar/occamm-logo.png"
            alt="Observatorio del Aire, inicio"
            width={150}
            height={28}
            // Above the fold on every page, and /mapa's largest paint:
            // load it with the page instead of lazily.
            preload
          />
        </Link>
        {/* Desktop menu (lg+): Publicaciones, Infografías, Mapa, Datos, then the Nosotros dropdown last. */}
        <nav aria-label="Principal" className="hidden lg:flex lg:items-center lg:gap-10">
          {/* Publicaciones, Infografías */}
          {LECTURA.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={current(l.href)}
              className={`block hover:text-gray-500 ${FOCUS} ${isCurrent(l.href) ? CURRENT : ""}`}
              onClick={handleLinkClick}
            >
              {l.label}
            </Link>
          ))}
          {/* Mapa, then Datos. */}
          {PRINCIPALES.slice()
            .reverse()
            .map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={current(l.href)}
                className={`block hover:text-gray-500 ${FOCUS} ${isCurrent(l.href) ? CURRENT : ""}`}
                onClick={handleLinkClick}
              >
                {l.label}
              </Link>
            ))}

          {/* Nosotros */}
          <div className="relative" onBlur={closeOnFocusOut("isSubmenuOpen")}>
            <button
              ref={nosotrosButtonRef}
              onClick={toggleSubmenu}
              aria-expanded={menuState.isSubmenuOpen}
              className={`flex items-center hover:text-gray-500 ${FOCUS} ${NOSOTROS.some((l) => isCurrent(l.href)) ? CURRENT : ""}`}
            >
              Nosotros
              <ChevronDown
                className={`ml-1 h-4 transition-transform ${menuState.isSubmenuOpen ? "rotate-180" : "rotate-0"}`}
              />
            </button>
            {menuState.isSubmenuOpen && (
              <div className={DROPDOWN}>
                <ul>
                  {NOSOTROS.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        aria-current={current(l.href)}
                        className={`block w-fit py-2 hover:text-gray-500 ${FOCUS} ${isCurrent(l.href) ? CURRENT : ""}`}
                        onClick={handleLinkClick}
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </nav>

        {/* Menu Icon for mobile and tablet */}
        <div className="lg:hidden">
          {/* p-2/-m-2: a 44px tap target around the 28px icon, same position. */}
          <button
            onClick={toggleMobileMenu}
            aria-label={menuState.isOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuState.isOpen}
            aria-controls="menu-movil"
            className={`-m-2 p-2 ${FOCUS}`}
          >
            {menuState.isOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>

        {/* Mobile / tablet menu: a full-screen panel under the bar (inside
            menuRef, so a tap on a link isn't read as a tap outside). No
            accordions: every link visible at once, each group under a small gray
            label (Explora, Nosotros) so both look alike. */}
        {menuState.isOpen && (
          <nav
            id="menu-movil"
            aria-label="Principal"
            style={{ top: panelTop }}
            className="fixed inset-x-0 bottom-0 z-40 overflow-y-auto overscroll-contain bg-stone-50 px-6 pb-10 pt-2 lg:hidden"
          >
            {[
              { titulo: "Explora", links: [...PRINCIPALES, ...LECTURA] },
              { titulo: "Nosotros", links: NOSOTROS },
            ].map((grupo) => (
              <div key={grupo.titulo} className="mt-8 first:mt-2">
                <h2 className={GROUP_LABEL}>
                  {grupo.titulo}
                </h2>
                <ul>
                  {grupo.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        aria-current={current(l.href)}
                        className={`block w-fit py-2.5 text-lg ${FOCUS} ${isCurrent(l.href) ? CURRENT : ""}`}
                        onClick={handleLinkClick}
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
