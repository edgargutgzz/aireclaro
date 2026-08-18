"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function MainContent({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useLayoutEffect(() => {
    ref.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <main ref={ref} className="w-full flex-grow overflow-y-auto bg-gray-50">
      {children}
    </main>
  );
}
