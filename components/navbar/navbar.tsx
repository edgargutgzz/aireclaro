"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { ChevronDown, Map, BarChart3 } from "lucide-react";

// The site's one navbar, on every page including the map. Copied from
// observatoriodelaire.com's navbar (components/navbar.tsx there), markup and
// styling unchanged. Its rendered height is restated as --header-h in
// globals.css (the map sizes itself against it), so a change here that moves
// the bar's height must update that var too.
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

const PUBLICACIONES = [
  { href: "/infografias", label: "Infografías" },
  { href: "/editoriales", label: "Editoriales" },
  { href: "/recursos", label: "Recursos" },
];

const NOSOTROS = [
  { href: "/quienes-somos", label: "Quiénes somos" },
  { href: "/equipo", label: "Equipo" },
];

export default function Navbar() {
  const pathname = usePathname();
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const current = (href: string) => (isCurrent(href) ? "page" : undefined);
  // Menu state
  const [menuState, setMenuState] = useState({
    isOpen: false,
    isSubmenuOpen: false,
    isPublicacionesSubmenuOpen: false,
  });

  // Ref for detecting clicks outside of menu
  const menuRef = useRef<HTMLDivElement>(null);

  // Toggles the mobile menu open/closed state
  const toggleMobileMenu = () => {
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
      isPublicacionesSubmenuOpen: false,
    }));
  };

  // Toggles the publicaciones submenu open/closed state
  const togglePublicacionesSubmenu = () => {
    setMenuState((prev) => ({
      ...prev,
      isPublicacionesSubmenuOpen: !prev.isPublicacionesSubmenuOpen,
      isSubmenuOpen: false,
    }));
  };

  // Effect to close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuState({
          isOpen: false,
          isSubmenuOpen: false,
          isPublicacionesSubmenuOpen: false,
        });
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuState({
          isOpen: false,
          isSubmenuOpen: false,
          isPublicacionesSubmenuOpen: false,
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

  // Handles link clicks
  const handleLinkClick = () => {
    setMenuState({
      isOpen: false,
      isSubmenuOpen: false,
      isPublicacionesSubmenuOpen: false,
    });
  };

  return (
    <div className="relative z-50 bg-stone-50 border-stone-200">
      <div
        className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8"
        ref={menuRef}
      >
        {/* Logo */}
        <Link href="/" onClick={handleLinkClick}>
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
        {/* Menu */}
        <div
          className={`absolute left-0 top-16 z-10 flex w-full flex-col gap-6 border-b-4 bg-stone-50 py-5 pl-6 lg:static lg:left-auto lg:top-auto lg:flex lg:w-auto lg:flex-row lg:items-center lg:gap-10 lg:border-b-0 lg:py-0 lg:pl-0 ${menuState.isOpen ? "block" : "hidden"}`}
        >
          {/* Proyectos */}
          <Link
            href="/proyectos"
            aria-current={current("/proyectos")}
            className={`block hover:text-gray-500 ${isCurrent("/proyectos") ? CURRENT : ""}`}
            onClick={handleLinkClick}
          >
            Proyectos
          </Link>

          {/* Publicaciones */}
          <div className="relative">
            <button
              onClick={togglePublicacionesSubmenu}
              aria-expanded={menuState.isPublicacionesSubmenuOpen}
              className={`flex items-center hover:text-gray-500 ${PUBLICACIONES.some((l) => isCurrent(l.href)) ? CURRENT : ""}`}
            >
              Publicaciones
              <ChevronDown
                className={`ml-1 h-4 transition-transform ${menuState.isPublicacionesSubmenuOpen ? "rotate-180" : "rotate-0"}`}
              />
            </button>
            {menuState.isPublicacionesSubmenuOpen && (
              <div className="mt-2 flex flex-col gap-4 pl-4 lg:absolute lg:w-40 lg:rounded-2xl lg:border lg:bg-white lg:p-4 lg:pl-4 lg:shadow-md">
                {PUBLICACIONES.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={current(l.href)}
                    className={`block hover:text-gray-500 ${isCurrent(l.href) ? CURRENT : ""}`}
                    onClick={handleLinkClick}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          {/* Nosotros */}
          <div className="relative">
            <button
              onClick={toggleSubmenu}
              aria-expanded={menuState.isSubmenuOpen}
              className={`flex items-center hover:text-gray-500 ${NOSOTROS.some((l) => isCurrent(l.href)) ? CURRENT : ""}`}
            >
              Nosotros
              <ChevronDown
                className={`ml-1 h-4 transition-transform ${menuState.isSubmenuOpen ? "rotate-180" : "rotate-0"}`}
              />
            </button>
            {menuState.isSubmenuOpen && (
              <div className="mt-2 flex flex-col gap-4 pl-4 lg:absolute lg:w-40 lg:rounded-2xl lg:border lg:bg-white lg:p-4 lg:pl-4 lg:shadow-md">
                {NOSOTROS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={current(l.href)}
                    className={`block hover:text-gray-500 ${isCurrent(l.href) ? CURRENT : ""}`}
                    onClick={handleLinkClick}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Datos and Mapa: equal weight, outlined in the logo's purple / blue
              (lib/datos-colors.ts BRAND_PURPLE / BRAND_BLUE). On its own page
              a button deepens (full border, twice the tint), standing in for the text links' underline. */}
          <Link
            href="/datos"
            aria-current={current("/datos")}
            onClick={handleLinkClick}
            className={`flex w-fit items-center rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${isCurrent("/datos") ? "border-[#743479] bg-[#743479]/20 text-[#743479]" : "border-[#743479]/60 bg-[#743479]/10 text-[#743479] hover:bg-[#743479]/15"}`}
          >
            <BarChart3 size={14} className="mr-1.5" />
            Datos
          </Link>

          <Link
            href="/mapa"
            aria-current={current("/mapa")}
            onClick={handleLinkClick}
            className={`flex w-fit items-center rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${isCurrent("/mapa") ? "border-[#226caf] bg-[#226caf]/20 text-[#226caf]" : "border-[#226caf]/60 bg-[#226caf]/10 text-[#226caf] hover:bg-[#226caf]/15"}`}
          >
            <Map size={14} className="mr-1.5" />
            Mapa
          </Link>
        </div>

        {/* Menu Icon for mobile and tablet */}
        <div className="lg:hidden">
          <button
            onClick={toggleMobileMenu}
            aria-label={menuState.isOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuState.isOpen}
          >
            {menuState.isOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>
    </div>
  );
}
