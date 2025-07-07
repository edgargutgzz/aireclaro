import Questions from "@/components/acerca/questions";

export default function Acerca() {
  return (
    <div className="container mx-auto max-w-6xl px-4 pb-32 pt-16 md:pb-16 md:pt-28">
      <h1 className="mb-16 text-5xl font-extrabold tracking-tight text-gray-900 md:text-5xl">
        Preguntas Frecuentes
      </h1>
      <Questions />
    </div>
  );
}
