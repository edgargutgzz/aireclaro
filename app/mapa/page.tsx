import Navbar from "@/components/navbar";

export default function Mapa() {
  return (
    <>
      <div className="flex h-screen flex-col bg-slate-50 lg:flex-row">
        {/* Navbar */}
        <Navbar />
        {/* Main Content */}
        <div className="pb-20 pt-4 lg:ml-40 lg:mr-40 lg:mt-10 lg:w-9/12 lg:flex-grow lg:pt-0">
          <h1>Mapa</h1>
        </div>
      </div>
    </>
  );
}
