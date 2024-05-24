import PurpleAir from "@/components/purpleair";

export default function Inicio() {
  return (
    <div className="mx-4 flex flex-col space-y-10 py-10 lg:mx-40 lg:space-y-20">
      {/* Main Recommendation */}
      <div className="rounded-lg bg-white p-4 text-sm shadow-lg lg:text-base">
        <div className="text-left text-xs text-gray-400 lg:text-sm">
          CALIDAD DEL AIRE
        </div>
        <div className="mt-1 text-left text-4xl font-semibold lg:text-5xl">
          Mala
        </div>
        <div className="mt-2 text-left text-base lg:text-lg">
          Es posible realizar actividades al aire libre. Si presentas síntomas
          como tos o falta de aire, toma más descansos y realiza actividades
          menos vigorosas.
        </div>
      </div>
      {/* PurpleAir */}
      <div className="rounded-lg bg-white p-4 text-sm shadow-lg lg:text-base">
        <PurpleAir />
      </div>
    </div>
  );
}
