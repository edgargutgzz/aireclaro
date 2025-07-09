import Questions from "@/components/acerca/questions";
import Image from "next/image";

export default function Acerca() {
  return (
    <div className="container mx-auto max-w-6xl px-4 pb-32 pt-16 md:pb-16 md:pt-28">
      <h1 className="mb-16 text-5xl font-extrabold tracking-tight text-gray-900 md:text-5xl">
        Preguntas Frecuentes
      </h1>
      <Questions />

      {/* OCCAMM Logo Section */}
      <div className="mt-20 flex flex-col items-center justify-center gap-4 md:flex-row md:gap-6">
        <span className="text-lg text-gray-600">Un proyecto del</span>
        <Image
          src="/occamm-logo.png"
          alt="OCCAMM Logo"
          width={150}
          height={60}
          className="h-auto w-32 md:w-auto"
        />
      </div>
    </div>
  );
}
