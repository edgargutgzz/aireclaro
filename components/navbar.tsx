import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <div className="flex w-1/5 flex-col justify-between px-5 py-5">
      {/* Header */}
      <div className="flex flex-col gap-20">
        <div>
          <Image
            className="h-8 w-8"
            src="/docento-logo.jpg"
            alt="Docento Logo"
            width={40}
            height={40}
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-500">Today</p>
          <Button variant="ghost" className="flex justify-start pl-0">
            Open Data for Government
          </Button>
          <p className="pt-10 text-xs text-gray-500">Previous 30 days</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <p>Edgar Gutiérrez</p>
      </div>
    </div>
  );
}
