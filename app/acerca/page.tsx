import Questions from "@/components/acerca/questions";

export default function Acerca() {
  return (
    <div className="mx-40 h-screen">
      {/* Preguntas Frecuentes */}
      <div className="pt-10 ">
        <h1 className="text-3xl font-bold">Preguntas Frecuentes</h1>
      </div>
      {/* Questions */}
      <div className="py-10">
        <Questions />
      </div>
      {/* Equipo */}
      <div className="pt-10 ">
        <h1 className="text-3xl font-bold">Equipo</h1>
      </div>
    </div>
  );
}
