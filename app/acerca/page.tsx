import Navbar from "@/components/navbar";

export default function Acerca() {
  return (
    <>
      <div className="flex h-screen">
        {/* Navbar */}
        <Navbar />
        {/* Acerca */}
        <div className="flex w-4/5 justify-center bg-slate-50">
          <div className="flex w-2/3 justify-center">
            <h1>Acerca</h1>
          </div>
        </div>
      </div>
    </>
  );
}
