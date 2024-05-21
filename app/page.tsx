import Navbar from "@/components/navbar";

export default function Inicio() {
  return (
    <>
      <div className="flex h-screen">
        {/* Navbar */}
        <Navbar />
        {/* Inicio */}
        <div className="flex w-4/5 justify-center bg-slate-50">
          <div className="flex w-2/3 justify-center">
            <h1>Inicio</h1>
          </div>
        </div>
      </div>
    </>
  );
}
