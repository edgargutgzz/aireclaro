import Questions from "@/components/acerca/questions";

export default function Acerca() {
  return (
    <div className="mx-4 flex flex-col pb-32 pt-8 md:mx-16 md:py-12 md:pb-10 lg:mx-52">
      {/* Header */}
      <h1 className="pb-4 text-3xl font-bold md:mb-10">Preguntas Frecuentes</h1>

      {/* Questions */}
      <Questions />
    </div>
  );
}
