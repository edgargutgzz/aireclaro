"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Footer from "@/components/footer/footer";

export default function MainContent({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const pathname = usePathname();
  // No footer on the map.
  const hideFooter = pathname === "/mapa";
  // Home tries the warm stone neutrals (2026-10-19 trial, with the navbar
  // and footer); every other page stays gray.
  const warm = pathname === "/";

  useLayoutEffect(() => {
    ref.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    // id + tabIndex: the skip link's target (focusable, no ring of its own).
    <main ref={ref} id="contenido" tabIndex={-1} className={`w-full flex-grow overflow-y-auto focus:outline-none ${warm ? "bg-stone-50" : "bg-gray-50"}`}>
      {children}
      {/* Same footer as observatoriodelaire.com, everywhere except the map.
          No bottom-bar clearance needed: only the map has the mobile bottom
          bar, and it has no footer. */}
      {!hideFooter && <Footer warm={warm} />}
    </main>
  );
}
