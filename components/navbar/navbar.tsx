"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { BarChart3, BookOpen, FolderOpen, Map as MapIcon, Users } from "lucide-react";

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
// shift between pages) and announced as aria-current="page".
const CURRENT = "underline decoration-2 underline-offset-8";

// The house focus ring, on every focusable item in the bar.
const FOCUS = "rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15";

// Every section, in the same order on desktop and mobile; Quiénes somos last.
// The icons are for the mobile menu's tiles only.
const SECCIONES = [
  { href: "/mapa", label: "Mapa", Icon: MapIcon },
  { href: "/datos", label: "Datos", Icon: BarChart3 },
  { href: "/publicaciones", label: "Publicaciones", Icon: BookOpen },
  { href: "/proyectos", label: "Proyectos", Icon: FolderOpen },
  { href: "/quienes-somos", label: "Quiénes somos", Icon: Users },
];

export default function Navbar() {
  const pathname = usePathname();
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const current = (href: string) => (isCurrent(href) ? "page" : undefined);
  // Menu state
  const [isOpen, setIsOpen] = useState(false);

  // Ref for detecting clicks outside of menu
  const menuRef = useRef<HTMLDivElement>(null);

  // The bar's bottom edge, where the mobile panel starts, measured on open so
  // the panel lines up wherever the bar sits.
  const headerRef = useRef<HTMLElement>(null);
  const [panelTop, setPanelTop] = useState(0);

  // Toggles the mobile menu open/closed state
  const toggleMobileMenu = () => {
    setPanelTop(headerRef.current?.getBoundingClientRect().bottom ?? 0);
    setIsOpen((open) => !open);
  };

  // Effect to close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
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
    if (!isOpen) return;
    const scrollers = [document.getElementById("contenido"), document.documentElement];
    const previous = scrollers.map((el) => el?.style.overflow ?? "");
    scrollers.forEach((el) => el && (el.style.overflow = "hidden"));
    return () => scrollers.forEach((el, i) => el && (el.style.overflow = previous[i]));
  }, [isOpen]);

  // Handles link clicks
  const handleLinkClick = () => setIsOpen(false);

  return (
    <header ref={headerRef} className="relative z-50 bg-stone-50">
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
        {/* Desktop menu (lg+). */}
        <nav aria-label="Principal" className="hidden lg:flex lg:items-center lg:gap-10">
          {SECCIONES.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={current(l.href)}
              className={`block hover:text-neutral-500 ${FOCUS} ${isCurrent(l.href) ? CURRENT : ""}`}
              onClick={handleLinkClick}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Menu Icon for mobile and tablet */}
        <div className="lg:hidden">
          {/* p-2/-m-2: a 44px tap target around the 28px icon, same position. */}
          <button
            onClick={toggleMobileMenu}
            aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isOpen}
            aria-controls="menu-movil"
            className={`-m-2 p-2 ${FOCUS}`}
          >
            {isOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>

        {/* Mobile / tablet menu: a full-screen panel under the bar (inside
            menuRef, so a tap on a link isn't read as a tap outside): every
            section as a square tile (icon above, name below), two across in
            the desktop order; an odd last tile runs the full width. The
            current page's tile has a dark border. */}
        {isOpen && (
          <nav
            id="menu-movil"
            aria-label="Principal"
            style={{ top: panelTop }}
            className="fixed inset-x-0 bottom-0 z-40 overflow-y-auto overscroll-contain bg-stone-50 px-6 pb-10 pt-2 lg:hidden"
          >
            <ul className="mt-4 grid grid-cols-2 gap-3">
              {SECCIONES.map(({ href, label, Icon }) => (
                <li key={href} className="last:odd:col-span-2">
                  <Link
                    href={href}
                    aria-current={current(href)}
                    className={`flex aspect-square h-full w-full flex-col justify-between rounded-2xl border p-4 text-base font-medium transition-colors ${FOCUS} ${
                      isCurrent(href)
                        ? "border-stone-900 bg-white text-neutral-800"
                        : "border-stone-200 bg-white text-neutral-800 active:bg-stone-100"
                    } [li:last-child:nth-child(odd)_&]:aspect-auto [li:last-child:nth-child(odd)_&]:min-h-24`}
                    onClick={handleLinkClick}
                  >
                    <Icon aria-hidden="true" className="h-6 w-6 text-neutral-500" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}
