"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Navlinks from "@/components/navlinks";

export default function Navbar() {
  const [showScrollDiv, setShowScrollDiv] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setShowScrollDiv(true);
      } else {
        setShowScrollDiv(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <>
      <div className="fixed bottom-0 w-full border-t border-gray-200 bg-white lg:relative lg:h-screen lg:flex-col lg:space-y-4 lg:border-r lg:border-t-0 lg:border-gray-200 lg:py-6">
        {/* Logo */}
        <div className="hidden lg:block lg:px-8 lg:py-10">
          <Image
            src="/aireclaro-logo.png"
            alt="Aire Claro Logo"
            width={160}
            height={19}
          />
        </div>
        {/* Links */}
        <div className="flex w-full justify-between px-12 py-3 md:px-32 md:py-5 lg:flex-col lg:space-y-3 lg:px-4">
          <Navlinks />
        </div>
      </div>
      <div
        className={`fixed left-0 w-full bg-white transition-transform duration-300 lg:hidden ${
          showScrollDiv
            ? "translate-y-full transform"
            : "-translate-y-full transform"
        }`}
      >
        <div className="h-12">{/* Content of the white div */}</div>
      </div>
    </>
  );
}
