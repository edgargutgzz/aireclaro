"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Footer from "@/components/footer/footer";

export default function MainContent({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const isMapPage = pathname === "/";

  useLayoutEffect(() => {
    ref.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <main ref={ref} className="w-full flex-grow overflow-y-auto bg-gray-50">
      {children}
      {/* Same footer as observatoriodelaire.com, everywhere except the map */}
      {!isMapPage && (
        <div className="pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
          <Footer />
        </div>
      )}
    </main>
  );
}
