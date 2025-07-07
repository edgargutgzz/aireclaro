import PM25Chart from "@/components/datos/pm25-chart";

export default function Datos() {
  return (
    <div className="container mx-auto max-w-6xl px-4 pb-32 pt-16 md:pb-16 md:pt-28">
      {/* Header */}
      <h1 className="mb-16 text-5xl font-extrabold tracking-tight text-gray-900">
        Datos
      </h1>
      <PM25Chart />
    </div>
  );
}
