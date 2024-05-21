import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav
      style={{ boxShadow: "0 -4px 5px -2px rgba(0, 0, 0, 0.1)" }}
      className="fixed bottom-0 z-10 w-full flex-col bg-white shadow-lg lg:static lg:z-auto lg:flex lg:min-h-screen lg:w-3/12 lg:flex-col lg:py-10"
    >
      <div className="container mx-auto flex h-full items-center justify-around px-2 pb-2 pt-3 lg:flex-col lg:items-start lg:justify-start lg:pl-4 lg:pr-5">
        {/* Logo */}
        <div className="hidden lg:mb-10 lg:block lg:pl-4">
          <Image
            src="/aireclaro-logo.png"
            alt="Aire Claro Logo"
            width={200}
            height={24}
          />
        </div>
        {/* Inicio */}
        <div className="rounded-lg text-black lg:mb-4 lg:w-full lg:pr-6 lg:hover:bg-gray-100">
          <Link href="/">
            <div className="flex flex-col items-center text-xs lg:flex-row lg:p-4 lg:py-3 lg:text-base">
              <Image
                src="/inicio-on.png"
                alt="Inicio"
                width={22}
                height={22}
                className="lg:h-6 lg:w-6"
              />
              <span className="mt-0 pt-1 font-bold lg:ml-4 lg:mt-0">
                Inicio
              </span>
            </div>
          </Link>
        </div>
        {/* Mapa */}
        <div className="rounded-lg text-black lg:mb-4 lg:w-full lg:pr-6 lg:hover:bg-gray-100">
          <Link href="/mapa">
            <div className="flex flex-col items-center text-xs lg:flex-row lg:p-4 lg:py-3 lg:text-base">
              <Image
                src="/mapa-off.png"
                alt="Mapa"
                width={22}
                height={22}
                className="lg:h-6 lg:w-6"
              />
              <span className="mt-0 pt-1 lg:ml-4 lg:mt-0">Mapa</span>
            </div>
          </Link>
        </div>
        {/* Datos */}
        <div className="rounded-lg text-black lg:mb-4 lg:w-full lg:pr-6 lg:hover:bg-gray-100">
          <Link href="/datos">
            <div className="flex flex-col items-center text-xs lg:flex-row lg:p-4 lg:py-3 lg:text-base">
              <Image
                src="/datos-off.png"
                alt="Datos"
                width={22}
                height={22}
                className="lg:h-6 lg:w-6"
              />
              <span className="mt-0 pt-1 lg:ml-4 lg:mt-0">Datos</span>
            </div>
          </Link>
        </div>
        {/* Acerca */}
        <div className="rounded-lg text-black lg:mb-4 lg:w-full lg:pr-6 lg:hover:bg-gray-100">
          <Link href="/acerca">
            <div className="flex flex-col items-center text-xs lg:flex-row lg:p-4 lg:py-3 lg:text-base">
              <Image
                src="/acerca-off.png"
                alt="Acerca"
                width={22}
                height={22}
                className="lg:h-6 lg:w-6"
              />
              <span className="mt-0 pt-1 lg:ml-4 lg:mt-0">Acerca</span>
            </div>
          </Link>
        </div>
      </div>
    </nav>
  );
}
