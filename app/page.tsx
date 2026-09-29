import AirQualitySlider from "@/components/home/air-quality-slider";

// Homepage. The hero is ported from observatoriodelaire.com's homepage. The map
// lives at /mapa; proxy.ts sends embeds and legacy map links that still point
// at / over there.
export default function Home() {
  return (
    <div className="flex min-h-screen items-center">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:px-8">
        <div className="flex flex-col gap-8">
          <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight text-gray-900 md:text-6xl lg:text-7xl">
            Trabajamos por una mejor{" "}
            <span className="text-[#2980B9]">calidad del aire.</span>
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-gray-600 md:text-xl">
            Somos una organización de la sociedad civil dedicada a generar
            esfuerzos colaborativos y fundamento técnico para mejorar la calidad
            del aire en la Zona Metropolitana de Monterrey.
          </p>
        </div>

        <div className="relative flex items-center justify-center">
          {/* Decorative blobs */}
          <div className="absolute -right-6 -top-6 h-72 w-72 rounded-full bg-blue-200/50 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 h-64 w-64 rounded-full bg-teal-200/50 blur-3xl" />
          <div className="relative z-10 w-full">
            <AirQualitySlider />
          </div>
        </div>
      </div>
    </div>
  );
}
