"use client";

import Image from "next/image";
import Link from "next/link";
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
// loads); Proyectos, Infografías, Explorar datos and Explorar mapa are this
// app's own pages, in the same tab; the other Observatory pages link out to
// observatoriodelaire.com for now.
const OBSERVATORIO = "https://www.observatoriodelaire.com";

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

export default function Navbar() {
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

  // Toggles the submenu open/closed state (Observatorio)
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

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
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
            alt="OCCAMM Logo"
            width={150}
            height={28}
          />
        </Link>
        {/* Menu */}
        <div
          className={`absolute left-0 top-16 z-10 flex w-full flex-col gap-6 border-b-4 bg-stone-50 py-5 pl-6 lg:static lg:left-auto lg:top-auto lg:flex lg:w-auto lg:flex-row lg:items-center lg:gap-10 lg:border-b-0 lg:py-0 lg:pl-0 ${menuState.isOpen ? "block" : "hidden"}`}
        >
          {/* Proyectos */}
          <Link
            href="/proyectos"
            className="block hover:text-gray-500"
            onClick={handleLinkClick}
          >
            Proyectos
          </Link>

          {/* Publicaciones */}
          <div className="relative">
            <button
              onClick={togglePublicacionesSubmenu}
              aria-label="Publicaciones menu"
              aria-expanded={menuState.isPublicacionesSubmenuOpen}
              className="flex items-center hover:text-gray-500"
            >
              Publicaciones
              <ChevronDown
                className={`ml-1 h-4 transition-transform ${menuState.isPublicacionesSubmenuOpen ? "rotate-180" : "rotate-0"}`}
              />
            </button>
            {menuState.isPublicacionesSubmenuOpen && (
              <div className="mt-2 flex flex-col gap-4 pl-4 lg:absolute lg:w-40 lg:rounded-md lg:border lg:bg-white lg:p-4 lg:pl-4 lg:shadow-md">
                <Link
                  href="/infografias"
                  className="block hover:text-gray-500"
                  onClick={handleLinkClick}
                >
                  Infografías
                </Link>
                <Link
                  href={`${OBSERVATORIO}/editoriales`}
                  className="block hover:text-gray-500"
                  onClick={handleLinkClick}
                >
                  Editoriales
                </Link>
                <Link
                  href={`${OBSERVATORIO}/recursos`}
                  className="block hover:text-gray-500"
                  onClick={handleLinkClick}
                >
                  Recursos
                </Link>
              </div>
            )}
          </div>
          {/* Observatorio */}
          <div className="relative">
            <button
              onClick={toggleSubmenu}
              aria-label="Observatorio menu"
              aria-expanded={menuState.isSubmenuOpen}
              className="flex items-center hover:text-gray-500"
            >
              Observatorio
              <ChevronDown
                className={`ml-1 h-4 transition-transform ${menuState.isSubmenuOpen ? "rotate-180" : "rotate-0"}`}
              />
            </button>
            {menuState.isSubmenuOpen && (
              <div className="mt-2 flex flex-col gap-4 pl-4 lg:absolute lg:w-40 lg:rounded-md lg:border lg:bg-white lg:p-4 lg:pl-4 lg:shadow-md">
                <Link
                  href={`${OBSERVATORIO}/quienes-somos`}
                  className="block hover:text-gray-500"
                  onClick={handleLinkClick}
                >
                  Quiénes Somos
                </Link>
                <Link
                  href={`${OBSERVATORIO}/equipo`}
                  className="block hover:text-gray-500"
                  onClick={handleLinkClick}
                >
                  Equipo
                </Link>
              </div>
            )}
          </div>

          {/* Explorar datos pill */}
          <Link
            href="/datos"
            onClick={handleLinkClick}
            className="flex w-fit items-center rounded-2xl border px-4 py-2 text-sm font-semibold backdrop-blur-md transition-colors hover:opacity-80"
            style={{
              borderColor: "rgba(123, 54, 153, 0.6)",
              backgroundColor: "rgba(123, 54, 153, 0.1)",
              color: "rgba(123, 54, 153, 1)",
            }}
          >
            <BarChart3 size={14} className="mr-1.5" />
            Explorar datos
          </Link>

          {/* Explorar mapa pill */}
          <Link
            href="/mapa"
            onClick={handleLinkClick}
            className="flex w-fit items-center rounded-2xl border px-4 py-2 text-sm font-semibold backdrop-blur-md transition-colors hover:opacity-80"
            style={{
              borderColor: "rgba(14, 165, 233, 0.6)",
              backgroundColor: "rgba(14, 165, 233, 0.1)",
              color: "rgba(14, 165, 233, 1)",
            }}
          >
            <Map size={14} className="mr-1.5" />
            Explorar mapa
          </Link>
        </div>

        {/* Menu Icon for mobile and tablet */}
        <div className="lg:hidden">
          <button
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
            aria-expanded={menuState.isOpen}
          >
            {menuState.isOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>
    </div>
  );
}
